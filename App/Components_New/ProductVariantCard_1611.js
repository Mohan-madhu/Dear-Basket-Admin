import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image } from "expo-image";
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from '../../App_Utils/Utils/logger';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';


import { useDispatch, useSelector } from "react-redux";
import Animated, { 
  useSharedValue, 
  withSpring, 
  useAnimatedStyle 
} from "react-native-reanimated";

const ProductVariantCard = ({ variant, isActive, handleEditVariant }) => {
  const hasDiscount = variant.discountpercentage > 0;
  const log = createLogger("ProductVariantCard");
  const { setLoading } = useLoading();



  const [ROLE, setROLE] = useState("USER");
  const [USER, setUSER] = useState("");
  const getRole = async () => {
    try {
      var ROLE = await Storage.getData("ROLE");
      var USER = await Storage.getData("USER");
      setROLE(ROLE);
      setUSER(USER);
    } catch (error) {
      log("Error getting role:", error);
    }
  };

  useEffect(() => {
    getRole();
  }, []);


  const handleDelete = (variant) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this variant?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDelete) {
              onDelete(variant);
            } else {
              // Default delete behavior if no prop provided
              //   dispatch(removeFromCart(product));
            }

          },
        },
      ]
    );
  };


  const onDelete = async (product) => {

    try {
      log("Deleting Variant : " + product.variantid)
      setLoading(true, "Deleting Variant...");
      const del = await API.PUT("ProductVariant/status", { variantid: product.variantid, isactive: 0, luu: USER });
      log(del);
      setLoading(false);
      Alert.alert("Message", del.message);
      //nav.goBack();
      // setrefresh(prev => prev + 1)
    } catch (error) {
      console.error("Error Deleting Product:", error);
      Alert.alert("Error", "Failed to Delete Product.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <View className={`w-64 p-4 rounded-xl border-2 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} shadow-sm`}>
      {/* Image with action buttons overlay */}
      <View className="relative mb-3">
        <Image
          cachePolicy="memory-disk"
          source={{ uri: "https://dev.dine360.ca/backend/" + variant.images[0]?.slice(2) }}
          style={{
            width: "100%",
            height: 128,
            borderRadius: 8,
          }}
          contentFit='cover'
        />

        {/* Edit and Delete buttons in top right corner */}
        <View className="absolute top-1 right-1 flex-row bg-white/80 rounded-md p-1">
          <TouchableOpacity
            onPress={() => handleEditVariant(variant)}
            className="p-1 rounded-md bg-blue-100 mr-1"
          >
            <Ionicons name="pencil" size={16} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(variant)}
            className="p-1 rounded-md bg-red-100"
          >
            <Ionicons name="trash" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product name */}
      <Text className={`text-sm font-bold ${isActive ? 'text-blue-700' : 'text-gray-800'} mb-1`}>
        {variant.variantname}
      </Text>

      {/* Price section */}
      <View className="flex-row items-center mb-1">
        <Text className="text-base font-bold text-gray-900 mr-2">
          ${variant.sellingprice.toFixed(2)}
        </Text>
        {hasDiscount && (
          <Text className="text-xs text-gray-500 line-through">
            ${variant.baseprice.toFixed(2)}
          </Text>
        )}
      </View>

      {/* Discount badge */}
      {hasDiscount && (
        <View className="bg-green-100 px-2 py-1 rounded-full self-start mb-2">
          <Text className="text-green-800 text-xs font-medium">
            {variant.discountpercentage}% OFF
          </Text>
        </View>
      )}

      {/* Stock information */}
      <View className="flex-row justify-between items-center mt-1">
        <Text className="text-xs text-gray-500">In Stock:</Text>
        <Text className={`text-xs font-medium ${variant.stockquantity > 10 ? 'text-green-600' : 'text-amber-600'}`}>
          {variant.stockquantity} units
        </Text>
      </View>
    </View>
  );
};

export default ProductVariantCard;