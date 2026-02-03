import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ProductVariantCard = ({ variant }) => {
  const hasDiscount = variant.discountpercentage > 0;
  
  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      className="w-64 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-bold text-gray-800">{variant.variantname}</Text>
        {hasDiscount && (
          <View className="bg-green-100 px-2 py-1 rounded-full">
            <Text className="text-green-800 text-xs font-medium">
              {variant.discountpercentage}% OFF
            </Text>
          </View>
        )}
      </View>
      
      <Text className="text-gray-500 text-sm mb-1">SKU: {variant.sku}</Text>
      
      <View className="flex-row items-center mt-3 mb-2">
        <Text className="text-lg font-bold text-gray-900 mr-2">
          ${variant.sellingprice.toFixed(2)}
        </Text>
        {hasDiscount && (
          <Text className="text-sm text-gray-500 line-through">
            ${variant.baseprice.toFixed(2)}
          </Text>
        )}
      </View>
      
      <View className="border-t border-gray-100 pt-3 mt-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-sm">Weight:</Text>
          <Text className="text-gray-700 text-sm">{variant.weight} kg</Text>
        </View>
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-sm">Dimensions:</Text>
          <Text className="text-gray-700 text-sm">{variant.dimensions}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-500 text-sm">In Stock:</Text>
          <Text className={`text-sm font-medium ${
            variant.stockquantity > 10 ? 'text-green-600' : 'text-amber-600'
          }`}>
            {variant.stockquantity} units
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        className="mt-4 bg-blue-600 py-2 rounded-lg"
        activeOpacity={0.8}
      >
        <Text className="text-white text-center font-medium">Add to Cart</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default ProductVariantCard;