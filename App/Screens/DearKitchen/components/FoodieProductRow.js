import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

function FoodieProductRow({ product, quantity, onIncrement, onDecrement }) {
  const canChangeQuantity =
    typeof onIncrement === "function" && typeof onDecrement === "function";

  return (
    <View className="mb-3 flex-row items-center rounded-xl border border-slate-100 bg-white p-3">
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          className="h-[82px] w-[82px] rounded-lg bg-slate-100"
          style={{ width: 82, height: 82, borderRadius: 8, backgroundColor: "#f1f5f9" }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View className="h-[82px] w-[82px] items-center justify-center rounded-lg bg-orange-50">
          <Ionicons name="fast-food-outline" size={24} color="#f97316" />
        </View>
      )}
      <View className="ml-3 mr-2.5 flex-1">
        <View className="flex-row items-start">
          <Text className="flex-1 text-[15px] font-extrabold text-gray-900">
            {product.name}
          </Text>
          {product.isNew ? (
            <Text className="ml-2 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
              NEW
            </Text>
          ) : null}
        </View>
        <Text className="mt-0.5 text-[12px] leading-4 text-slate-500" numberOfLines={2}>
          {product.description || product.unit}
        </Text>
        <View className="mt-1.5 flex-row items-center">
          <Ionicons name="star" size={13} color="#f97316" />
          <Text className="ml-1 text-[12px] font-extrabold text-slate-700">
            {product.rating || "4.5"}
          </Text>
          <Text className="ml-2 text-[12px] text-slate-400">{product.unit}</Text>
        </View>
        <Text className="mt-1.5 font-black text-orange-600">Rs. {product.price}</Text>
      </View>
      {canChangeQuantity ? (
        <View className="flex-row items-center overflow-hidden rounded-lg border border-orange-200">
          <TouchableOpacity
            className={`h-8 w-8 items-center justify-center ${
              quantity === 0 ? "bg-slate-50" : "bg-orange-50"
            }`}
            onPress={onDecrement}
            disabled={quantity === 0}
          >
            <Ionicons
              name="remove"
              size={17}
              color={quantity === 0 ? "#cbd5e1" : "#ea580c"}
            />
          </TouchableOpacity>
          <Text className="min-w-7 text-center font-extrabold text-slate-900">
            {quantity}
          </Text>
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center bg-orange-50"
            onPress={onIncrement}
          >
            <Ionicons name="add" size={17} color="#ea580c" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default React.memo(FoodieProductRow);
