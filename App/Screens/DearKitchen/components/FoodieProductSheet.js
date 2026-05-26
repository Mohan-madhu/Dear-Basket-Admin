import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FoodieProductRow from "./FoodieProductRow";

export default function FoodieProductSheet({
  category,
  products,
  cart,
  onClose,
  onQuantityChange,
}) {
  return (
    <Modal
      visible={!!category}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-slate-950/45" onPress={onClose} />
      <View className="absolute bottom-0 left-0 right-0 max-h-[78%] rounded-t-[18px] bg-white px-4 pb-[18px] pt-2.5">
        <View className="mb-3.5 h-1 w-11 self-center rounded-full bg-slate-300" />
        <View className="mb-3 flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs font-extrabold uppercase text-orange-600">
              {category?.section}
            </Text>
            <Text className="mt-0.5 text-[22px] font-black text-gray-900">
              {category?.name}
            </Text>
          </View>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {products.map((product) => (
            <FoodieProductRow
              key={product.id}
              product={product}
              quantity={cart[product.id] || 0}
              onDecrement={() => onQuantityChange(product.id, -1)}
              onIncrement={() => onQuantityChange(product.id, 1)}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
