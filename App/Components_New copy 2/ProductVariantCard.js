import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

const ProductVariantCard = ({ variant, isActive }) => {
  const hasDiscount = variant.discountpercentage > 0;
  
  return (
    <View className={`w-64 p-3 rounded-lg border-2 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <Image
        source={{ uri: variant.images[0] }}
        className="w-full h-32 rounded-md mb-2"
        resizeMode="cover"
      />
      
      <Text className={`text-sm font-bold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
        {variant.variantname}
      </Text>
      
      <View className="flex-row items-center mt-1">
        <Text className="text-base font-bold text-gray-900 mr-2">
          ${variant.sellingprice.toFixed(2)}
        </Text>
        {hasDiscount && (
          <Text className="text-xs text-gray-500 line-through">
            ${variant.baseprice.toFixed(2)}
          </Text>
        )}
      </View>
      
      {hasDiscount && (
        <View className="bg-green-100 px-1.5 py-0.5 rounded-full self-start mt-1">
          <Text className="text-green-800 text-xs font-medium">
            {variant.discountpercentage}% OFF
          </Text>
        </View>
      )}
      
      <View className="flex-row justify-between mt-2">
        <Text className="text-xs text-gray-500">In Stock:</Text>
        <Text className={`text-xs font-medium ${
          variant.stockquantity > 10 ? 'text-green-600' : 'text-amber-600'
        }`}>
          {variant.stockquantity}
        </Text>
      </View>
    </View>
  );
};

export default ProductVariantCard;