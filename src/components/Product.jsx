

const ProductCard = ({ 
  productName = "Product name",
  company = "company",
  category = "category",
  timeAgo = "1 year ago",
  rating = "10.0",
  dietaryTags = ["Vegan", "Veg", "not-free"],
  imageUrl = "https://images.openfoodfacts.org/images/products/073/762/806/4502/front_en.6.100.jpg"
}) => {
  return (
    <div className="relative border-2 border-black w-full max-w-md bg-[#F6F9CD] rounded-[30px] p-4">
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="w-20 h-20 bg-gray-100 rounded-lg">
          <img 
            src={imageUrl} 
            alt={productName}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold">{productName}</h2>
            <span className="bg-green-500 border-black border-separate text-white px-2 py-1 rounded-md text-md cursor-pointer hover:bg-green-400">
              {rating}
            </span>
          </div>
          
          <div className="text-gray-600 text-sm space-y-0.5">
            <p>{company}</p>
            <p>{category}</p>
            <p>{timeAgo}</p>
          </div>
        </div>
      </div>

      {/* Dietary Tags */}
      <div className="flex gap-2 mt-4">
        {dietaryTags.map((tag, index) => (
          <span 
            key={index}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 cursor-pointer"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};



export default ProductCard;