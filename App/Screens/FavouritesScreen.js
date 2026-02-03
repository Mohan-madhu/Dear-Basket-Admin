import React from "react";
import { getImageUrl } from "../../config";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { Image } from 'expo-image';
import { Ionicons } from "@expo/vector-icons";
import { createLogger } from "../../App_Utils/Utils/logger";
import { removeFromFavorites } from "../Redux/FavouriteReducer";

const FavoritesScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const log = createLogger("FavoritesScreen");
  const { favorites } = useSelector((state) => state.favorites);

  const handleRemoveFavorite = (item) => {
    Alert.alert(
      "Remove from Favorites",
      `Are you sure you want to remove ${item.productname} from your favorites?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          onPress: () => dispatch(removeFromFavorites({ variantid: item.variantid }))
        }
      ]
    );
  };

  const getImageURI = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("file://")) return imagePath;
    if (imagePath.startsWith("http")) return imagePath;
    return getImageUrl(imagePath);
  };

  const getDisplayImage = (item) => {
    return getImageURI(item.imageurl);
  };

  const calcMrp = (price, discount) => {
    if (!discount || discount <= 0) return price;
    return Math.round((price * 100) / (100 - discount));
  };

  if (favorites.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Ionicons name="heart-outline" size={80} color="#d1d5db" />
        <Text className="text-xl font-semibold text-gray-500 mt-4">
          No Favorites Yet
        </Text>
        <Text className="text-gray-400 text-center mt-2 px-8">
          Items you add to favorites will appear here
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">My Favorites</Text>
          </View>
          <Text className="text-gray-600">
            {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* Favorites List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {favorites.map((item, index) => {
            const mrp = calcMrp(item.price, item.discount);
            
            return (
              <TouchableOpacity
                key={`${item.variantid}-${index}`}
                className="bg-white rounded-xl shadow-sm mb-4 border border-gray-100 overflow-hidden"
                onPress={() => {
                  navigation.navigate("ProductAndVariantScreen", { 
                    prod: item.product, 
                    selectedvariantid: item.variantid 
                  });
                }}
                activeOpacity={0.9}
              >
                <View className="flex-row">
                  {/* Product Image */}
                  <View className="relative">
                    <Image
                      source={
                        getDisplayImage(item)
                          ? { uri: getDisplayImage(item) }
                          : require("../../assets/icon.png")
                      }
                      style={{ width: 120, height: 120 }}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                    />
                    
                    {/* Discount Badge */}
                    {item.discount > 0 && (
                      <View className="absolute top-2 left-2 bg-green-600 px-2 py-1 rounded-lg">
                        <Text className="text-xs font-semibold text-white">
                          {item.discount}% OFF
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Product Details */}
                  <View className="flex-1 p-3">
                    {/* Header with name and remove button */}
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-sm font-bold text-gray-900 flex-1 mr-2" numberOfLines={2}>
                        {item.productname}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveFavorite(item)}
                        className="p-1"
                      >
                        <Ionicons name="heart" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Variant Name */}
                    <Text className="text-xs text-blue-600 font-medium mb-2">
                      {item.variantname}
                    </Text>

                    {/* Description */}
                    {item.shortdescription && (
                      <Text className="text-xs text-gray-500 mb-2" numberOfLines={2}>
                        {item.shortdescription}
                      </Text>
                    )}

                    {/* Stock Information */}
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="pricetag" size={12} color="#4b5563" />
                      <Text className="text-xs text-gray-700 ml-1">
                        Stock: {item.quantity}
                      </Text>
                    </View>

                    {/* Price Section */}
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-lg font-bold text-gray-900">
                          ₹{item.price}
                        </Text>
                        {item.discount > 0 && (
                          <Text className="text-xs text-gray-500 line-through">
                            ₹{mrp}
                          </Text>
                        )}
                      </View>

                      {/* Quick Actions */}
                      <View className="flex-row items-center space-x-2">
                        <TouchableOpacity
                          className="bg-blue-500 px-4 py-2 rounded-full"
                          onPress={() => {
                            navigation.navigate("ProductAndVariantScreen", { 
                              prod: item.product, 
                              selectedvariantid: item.variantid 
                            });
                          }}
                        >
                          <Text className="text-xs font-semibold text-white">
                            View Details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Additional Info Bar */}
                <View className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-600">
                      {item.categoryname} • {item.typename}
                    </Text>
                    {item.isfeatured && (
                      <View className="bg-amber-100 px-2 py-1 rounded-full">
                        <Text className="text-xs text-amber-800 font-medium">
                          Featured
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Padding */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
};

export default FavoritesScreen;