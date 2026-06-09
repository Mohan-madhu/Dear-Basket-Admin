import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

export default function FoodieCategoryCard({ category, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      className="mb-3.5 h-[154px] w-[48%] overflow-hidden rounded-lg bg-slate-50"
      onPress={onPress}
    >
      <Image
        source={{ uri: category.image }}
        className="h-full w-full"
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["transparent", "rgba(15, 23, 42, 0.72)"]}
        className="absolute inset-0"
      />
      <View
        className={`absolute left-2.5 top-2.5 h-2.5 w-2.5 rounded-full ${category.dotClass}`}
      />
      <Text
        className="absolute bottom-3 left-3 right-3 text-[15px] font-extrabold leading-5 text-white"
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}
