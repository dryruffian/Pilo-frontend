// client/src/components/ProductPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  X, 
  Share2, 
  Heart, 
  Leaf, 
  Sprout, 
  WheatOff, 
  MilkOff, 
  Check, 
  X as Cross, 
  Info,
  AlertTriangle
} from 'lucide-react';
import { LoadingSkeleton } from './skeleton/Productpage.Skeleton';

const CircularProgress = ({ value , maxValue }) => {
  const radius = 60;
  const strokeWidth = 5;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / maxValue) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#E6E6E6"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#gradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4CAF50" /> 
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FF4D4D" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold">{value.toFixed(1)}</div>
        <div className="text-xs">Score</div>
      </div>
    </div>
  );
};

const getNutritionAdvice = (nutrient, value) => {
  // Skip if value is invalid
  if (!value || isNaN(value)) {
    return {
      advice: '',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    };
  }

  const recommendations = {
    energy: { low: 1500, high: 2500, unit: 'kcal' },
    fat: { low: 44, high: 77, unit: 'g' },
    sugar: { low: 25, high: 50, unit: 'g' },
    salt: { low: 0.3, high: 6, unit: 'g' },
    sodium: { low: 0.12, high: 2.4, unit: 'g' },
    fiber: { low: 25, high: 35, unit: 'g' },
    protein: { low: 50, high: 70, unit: 'g' }
  };

  const rec = recommendations[nutrient.toLowerCase()];
  if (!rec) return { advice: '', color: 'text-gray-600', bgColor: 'bg-gray-50' };

  if (value < rec.low) {
    return {
      advice: `Low - Consider increasing intake`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    };
  } else if (value > rec.high) {
    return {
      advice: `High - Consider reducing intake`,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    };
  }
  return {
    advice: `Optimal range`,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  };
};

const ProductPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productData, setProductData] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const navigate = useNavigate();
  const { barcode } = useParams();
  const { authenticatedRequest } = useAuth();

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        const minDelay = new Promise(resolve => setTimeout(resolve, 500));

        const [response] = await Promise.all([
          authenticatedRequest('get', `/api/v1/barcode/${barcode}`),
          minDelay
        ]);
        
        if (response && response.status !== 'error') {
          console.log('Product Data:', response);
          setProductData(response);
        } else {
          setError(response?.message || 'Failed to fetch product data');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.response?.data?.message || 'An error occurred while fetching product data');
      } finally {
        setLoading(false);
      }
    };

    if (barcode) {
      fetchProductData();
    }
  }, [barcode, authenticatedRequest]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: productData.product_name,
        text: `Check out this product: ${productData.product_name}`,
        url: window.location.href
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite toggling with backend
  };

  if (loading) {
    return (
      <LoadingSkeleton/>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="bg-red-50 p-4 rounded-lg">
            <Cross className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Product</h3>
            <p className="text-sm text-red-600">{error}</p>
            <button 
              onClick={handleGoBack}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-gray-600">No product found for this barcode</p>
          <button 
            onClick={handleGoBack}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }



  const { 
    product_name = 'Unknown Product',
    brands = 'Unknown Brand',
    image_url,
    food_score = 0,
    food_restriction = {},
    nutrition_values = {},
    nutrition_advisor = '',
    allergens = [],
    nutriscore_grade,
    nova_group,
    ingredients_text
  } = productData || {};

  // Process nutrition values
  const processedNutritionValues = Object.entries(nutrition_values).reduce((acc, [key, value]) => {
    // Handle when value is an object or number
    const numericValue = typeof value === 'object' ? value.value || 0 : value;
    if (!isNaN(numericValue)) {
      acc[key] = numericValue;
    }
    return acc;
  }, {});

  const nutritionPreferences = {
    isVegan: food_restriction?.isVegan || false,
    isVegetarian: food_restriction?.isVegetarian || false,
    isGlutenFree: !allergens?.includes('gluten'),
    isLactoseFree: !allergens?.includes('milk')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50">
      {/* Header */}
      <div className="p-4 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <button 
          onClick={handleGoBack}
          className="p-2 hover:bg-black/5 rounded-full"
        >
          <X className="w-6 h-6"/>
        </button>
        <div className="flex gap-4">
          <button 
            onClick={handleShare}
            className="p-2 hover:bg-black/5 rounded-full"
          >
            <Share2 className="w-6 h-6"/>
          </button>
          <button 
            onClick={toggleFavorite}
            className="p-2 hover:bg-black/5 rounded-full"
          >
            <Heart 
              className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="flex flex-col md:flex-row">
        <div className="p-4 w-full md:w-1/2">
          <img
            src={image_url}
            className="w-full aspect-square rounded-3xl shadow-sm object-cover"
            alt={product_name}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/api/placeholder/400/400';
            }}
          />
        </div>
        <div className="p-4 w-full md:w-1/2">
          <h1 className="text-2xl font-bold">{product_name}</h1>
          <p className="text-gray-600">{brands}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {nutriscore_grade && (
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Nutri-Score: {nutriscore_grade.toUpperCase()}
              </div>
            )}
            {nova_group && (
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                NOVA Group: {nova_group}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FoodCheck Score */}
      <div className="p-4 flex items-center justify-center gap-4">
        <CircularProgress value={food_score} maxValue={10} />
        <div className="text-left">
          <h2 className="font-bold">FoodCheck Score</h2>
          <p className="text-sm text-gray-600">
            This score helps you to estimate the product quality
          </p>
        </div>
      </div>

      {/* Allergens Warning */}
      {allergens.length > 0 && (
        <div className="mx-4 p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-red-800 font-medium">Allergen Warning</h3>
          </div>
          <p className="text-sm text-red-600 mt-2">
            Contains: {allergens.join(', ')}
          </p>
        </div>
      )}

      {/* Ingredients */}
      {ingredients_text && (
        <div className="p-4">
          <h2 className="font-bold mb-2">Ingredients</h2>
          <div className="bg-white/50 rounded-xl border border-black/10 p-4">
            <p className="text-sm text-gray-700">{ingredients_text}</p>
          </div>
        </div>
      )}

      {/* Nutrition Preferences */}
      <div className="p-4">
        <h2 className="font-bold mb-4">Dietary Information</h2>
        <div className="space-y-3">
          {Object.entries(nutritionPreferences).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-black/10"
            >
              <div className="flex items-center gap-2">
                {key === 'isVegan' && <Leaf className="w-5 h-5 text-green-600"/>}
                {key === 'isVegetarian' && <Sprout className="w-5 h-5 text-green-600"/>}
                {key === 'isGlutenFree' && <WheatOff className="w-5 h-5 text-green-600"/>}
                {key === 'isLactoseFree' && <MilkOff className="w-5 h-5 text-green-600"/>}
                <span>{key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
              {value ? (
                <Check className="w-5 h-5 text-green-600"/>
              ) : (
                <Cross className="w-5 h-5 text-red-500"/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition Values */}
      <div className="p-4">
        <h2 className="font-bold mb-4">Nutrition Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(processedNutritionValues).map(([key, value]) => {
            const unit = key.toLowerCase() === 'energy' ? 'kcal' : 'g';
            
            return (
              <div key={key} className="bg-white/50 rounded-xl border border-black/10 p-3">
                <div className="flex justify-between items-center ">
                  <span className="capitalize font-medium">{key.replace(/_/g, ' ')}</span>
                  <span className="font-bold">{value} {unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nutrition Advisor */}
      {nutrition_advisor && typeof nutrition_advisor === 'object' && Object.keys(nutrition_advisor).length > 0 && (
  <div className="p-4">
    <h2 className="font-bold mb-4">Nutrition Analysis</h2>
    <div className="space-y-3">
      {Object.entries(nutrition_advisor).map(([nutrient, level]) => {
        let bgColor = 'bg-yellow-50';
        let textColor = 'text-yellow-700';
        
        // Determine colors based on level
        switch(level.toLowerCase()) {
          case 'low':
            bgColor = 'bg-green-50';
            textColor = 'text-green-700';
            break;
          case 'medium':
          case 'moderate':
            bgColor = 'bg-yellow-50';
            textColor = 'text-yellow-700';
            break;
          case 'high':
            bgColor = 'bg-red-50';
            textColor = 'text-red-700';
            break;
          default:
            bgColor = 'bg-gray-50';
            textColor = 'text-gray-700';
        }

        return (
          <div 
            key={nutrient}
            className={`${bgColor} rounded-xl border border-black/10 p-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className={`w-5 h-5 ${textColor}`} />
                <span className="font-medium capitalize">
                  {nutrient.replace(/_/g, ' ')}
                </span>
              </div>
              <span className={`${textColor} font-medium capitalize`}>
                {level}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
    </div>
  );
};

export default ProductPage;