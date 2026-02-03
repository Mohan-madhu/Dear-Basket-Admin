import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import ProductVariantCard from './ProductVariantCard';
import AddVariantCard from './AddVariantCard';

const ProductView = ({ product, variants }) => {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]);

  return (
    <ScrollView className="bg-gray-50 flex-1 p-4">
      {/* Product Header */}
      <View className="bg-white rounded-lg shadow-md p-4 mb-4">
        <View className="flex-row items-start">
          <Image
            source={{ uri: selectedVariant.images[0] }}
            className="w-32 h-32 rounded-lg mr-4"
            resizeMode="cover"
          />
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-800">{product.productname}</Text>
            <Text className="text-gray-500 text-sm">{selectedVariant.variantname}</Text>
            {product.isfeatured && (
              <View className="bg-amber-100 px-2 py-1 rounded-full self-start mt-1">
                <Text className="text-amber-800 text-xs font-medium">Featured</Text>
              </View>
            )}
            <Text className="text-gray-600 mt-2">{product.shortdescription}</Text>
          </View>
        </View>
        
        {/* Full Description */}
        <View className="mt-4">
          <Text className="text-gray-700">{product.fulldescription}</Text>
        </View>
      </View>

      {/* Selected Variant Images */}
      <View className="bg-white rounded-lg shadow-md p-4 mb-4">
        <Text className="text-lg font-bold text-gray-800 mb-3">Images</Text>
        <View className="flex-row mb-2">
          <Image
            source={{ uri: selectedVariant.images[0] }}
            className="w-24 h-24 rounded-lg mr-2"
            resizeMode="cover"
          />
          <FlatList
            horizontal
            data={selectedVariant.images.slice(1)}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                className="w-24 h-24 rounded-lg mr-2"
                resizeMode="cover"
              />
            )}
            keyExtractor={(item, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Selected Variant Details */}
      <View className="bg-white rounded-lg shadow-md p-4 mb-4">
        <Text className="text-lg font-bold text-gray-800 mb-3">Variant Details</Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">Price:</Text>
          <Text className="font-bold">${selectedVariant.sellingprice.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">SKU:</Text>
          <Text>{selectedVariant.sku}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">Weight:</Text>
          <Text>{selectedVariant.weight} kg</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">Dimensions:</Text>
          <Text>{selectedVariant.dimensions}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-600">In Stock:</Text>
          <Text className={selectedVariant.stockquantity > 10 ? 'text-green-600' : 'text-amber-600'}>
            {selectedVariant.stockquantity} units
          </Text>
        </View>
      </View>

      {/* Variants Section */}
      <View className="mb-4">
        <Text className="text-lg font-bold text-gray-800 mb-3">Available Variants</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
          {variants.map((variant) => (
            <TouchableOpacity 
              key={variant.variantid} 
              className="mr-4"
              onPress={() => setSelectedVariant(variant)}
            >
              <ProductVariantCard 
                variant={variant} 
                isActive={variant.variantid === selectedVariant.variantid}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Variant Section */}
      <AddVariantCard />
    </ScrollView>
  );
};

export default ProductView;
