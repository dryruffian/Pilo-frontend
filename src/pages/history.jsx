// client/src/components/History.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/Product';
import { ArrowLeft } from 'lucide-react';

const History = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authenticatedRequest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await authenticatedRequest('get', '/data/history');
        if (response.status === 'success') {
          setProducts(response.data);
        }
      } catch (err) {
        setError('Failed to load scan history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [authenticatedRequest]);

  const handleProductClick = (productCode) => {
    navigate(`/product/${productCode}`);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
      }
    }
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-yellow-50 to-green-50">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center h-14 px-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold ml-2">Scan History</h1>
          </div>
        </div>

        {/* Loading Skeleton */}
        <div className="flex-1 px-4 py-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="relative border-2 border-black/10 w-full bg-white/50 rounded-[30px] p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-32 bg-gray-200 rounded-md" />
                      <div className="h-6 w-12 bg-gray-200 rounded-md" />
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                      <div className="h-4 w-16 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-yellow-50 to-green-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-black/5 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold ml-2">Scan History</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-2 pb-24">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600 p-4 bg-red-50 rounded-xl">
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <p className="mb-2">No scanned products yet</p>
              <button
                onClick={() => navigate('/scan')}
                className="px-4 py-2 bg-black text-white rounded-full hover:bg-black/90 active:bg-black/80 transition-colors"
              >
                Start Scanning
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.code}
                onClick={() => handleProductClick(product.code)}
                className="cursor-pointer transform transition-transform active:scale-98"
              >
                <ProductCard
                  productName={product.product_name}
                  company={product.brands}
                  rating={product.food_score?.toFixed(1) || "N/A"}
                  timeAgo={formatTimeAgo(product.createdAt)}
                  imageUrl={product.image_url}
                  dietaryTags={[
                    product.food_restriction?.isVegan && 'Vegan',
                    product.food_restriction?.isVegetarian && 'Vegetarian'
                  ].filter(Boolean)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;