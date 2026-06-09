import { useNavigation } from "@react-navigation/native";
import React from "react";
import { getImageUrl } from "../../config";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { Image } from "expo-image";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ProductCard = ({ product, onAdd }) => {
  const nav = useNavigation();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const { setLoading } = useLoading();
  // Calculate MRP from price + discount %
  function calcMrp(price, discount) {
    if (!discount || discount <= 0) return price;
    return Math.round((price * 100) / (100 - discount));
  }

  const mrp = calcMrp(product.price, product.discount);

  const imageUri = product.image;
  const getImageURI = () => {
    //console.log(imageUri);
    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    //console.log(getImageUrl(imageUri));
    return getImageUrl(imageUri);
  };

  return (
    <AnimatedPressable
      onPressIn={() => {
        setLoading(true, "Loading Products");
        scale.value = withTiming(0.95, { duration: 10 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 10 });

        nav.navigate("ProductScreen", { prod: product });
      }}
      onPress={() => {}}
      style={animStyle}
      className="flex-1 m-2 bg-white rounded-xl shadow-md overflow-hidden"
    >
      {/* IMAGE + BADGES */}
      <View className="relative">
        <Image  cachePolicy="memory-disk"
          // <-- now using your 'image' URL field
          source={
            getImageURI()
              ? { uri: getImageURI() }
              : require("../../assets/icon.png")
          }
          style={{  height: 128 }}
          className="w-full h-32"
          contentFit="cover"
        />
        {/* quantity */}
        <View className="absolute top-2 left-2 bg-white bg-opacity-80 px-2 py-0.5 rounded">
          <Text className="text-xs font-medium text-gray-800">
            {product.quantity}
          </Text>
        </View>
        {/* discount */}
        {product.discount > 0 && (
          <View className="absolute top-2 right-2 bg-green-600 px-2 py-0.5 rounded">
            <Text className="text-xs font-semibold text-white">
              {product.discount}% OFF
            </Text>
          </View>
        )}
      </View>

      {/* DETAILS */}
      <View className="p-3">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
          {product.name}
        </Text>
        {product.description ? (
          <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
            {product.description}
          </Text>
        ) : null}

        {/* rating */}
        <View className="flex-row items-center mt-2">
          <Icon name="star" size={12} color="#FBBF24" />
          <Text className="text-xs text-gray-600 ml-1">
            {product.rating.toFixed(1)}
          </Text>
        </View>

        {/* price + ADD */}
        <View className="flex-row items-baseline justify-between mt-3">
          <View>
            <Text className="text-base font-bold text-gray-900">
              ₹{product.price}
            </Text>
            {product.discount > 0 && (
              <Text className="text-xs text-gray-500 line-through">₹{mrp}</Text>
            )}
          </View>
          <TouchableOpacity
            disabled={product.instock === 0}
            onPress={() => onAdd(product)}
            className={`px-4 py-1 rounded ${
              product.instock === 0 ? "bg-gray-300" : "bg-green-500"
            }`}
          >
            <Text className="text-xs font-semibold text-white">ADD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default ProductCard;
