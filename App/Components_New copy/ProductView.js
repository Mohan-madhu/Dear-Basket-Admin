import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import ProductVariantCard from './ProductVariantCard';
import AddVariantCard from './AddVariantCard';

const ProductView = ({ product, variants }) => {
    return (
        <ScrollView className="bg-gray-50 flex-1 p-4">
            {/* Product Header */}
            <View className="bg-white rounded-lg shadow-md p-4 mb-4">
                <View className="flex-row items-start">
                    <Image
                        source={{ uri: product.imageUrl }}
                        className="w-32 h-32 rounded-lg mr-4"
                        resizeMode="cover"
                    />
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-800">{product.productname}</Text>
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

            <View style={{ marginBottom: 24 }}>
                <Text className="text-2xl font-semibold">{product.productname}</Text>
                <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: 200, borderRadius: 10, marginVertical: 16 }} />
                <Text className="text-lg">{product.shortdescription}</Text>
                <View className="my-2">
                    {product.isfeatured && <Text className="text-yellow-500">⭐ Featured</Text>}
                </View>
                <Text>{product.fulldescription}</Text>
            </View>

            {/* Variants Section */}
            <View className="mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-3">Available Variants</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
                    {variants.map((variant) => (
                        <View key={variant.variantid} className="mr-4">
                            <ProductVariantCard variant={variant} />
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Add Variant Section */}
            <AddVariantCard />
        </ScrollView>
    );
};

export default ProductView;
