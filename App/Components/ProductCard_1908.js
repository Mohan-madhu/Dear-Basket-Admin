import { useNavigation } from "@react-navigation/native";
import React from "react";
import { getImageUrl } from "../../config";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useDispatch, useSelector } from "react-redux";
import {
  incrementQuantity,
  decrementQuantity,
  addToCart,
} from "../Redux/CartReducer";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { createLogger } from "../../App_Utils/Utils/logger";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ProductCard = ({ product }) => {


  const log = createLogger("ProductCard");

  const nav = useNavigation();
  const dispatch = useDispatch();
  
  // Get cart state
  const { cart } = useSelector((state) => state.cart);
  let cartItem = null;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].transid === product?.productid) {
      cartItem = cart[i];
      break;
    }
  }

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const calcMrp = (price, discount) => {
    if (!discount || discount <= 0) return price;
    return Math.round((price * 100) / (100 - discount));
  };

  const mrp = calcMrp(product?.price, product?.discount);

  const getImageURI = () => {
    if (!product?.image) return null;
    if (product?.image.startsWith("file://")) return product?.image;
    if (product?.image.startsWith("http")) return product?.image;
    return getImageUrl(product?.image);
  };


  const renderStars = (rating = 4) => {
    return [...Array(5)].map((_, i) => (
      <FontAwesome
        key={i}
        name={i < rating ? "star" : "star-o"}
        size={14}
        color="#f5a623"
        style={{ marginRight: 2 }}
      />
    ));
  };

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 10 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10 });
      }}
      onPress={() => {
        nav.navigate("ProductAndVariantScreen", { prod: product });
      }}
      style={animStyle}
      className="flex-1 m-1 my-2 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100"
    >
      {/* IMAGE + BADGES */}
      <View className="relative">
        <Image
          cachePolicy="memory-disk"
          source={
            getImageURI()
              ? { uri: getImageURI() }
              : require("../../assets/icon.png")
          }
          style={{ height: 180 }} // bigger image
          className="w-full"
          contentFit="cover"
          transition={300}
        />

        {/* Stock Quantity */}
        <View className="absolute top-2 left-2 bg-white/90 px-2 py-0.5 rounded-lg shadow-sm">
          <Text className="text-xs font-medium text-gray-800">
            {product?.quantity}
          </Text>
        </View>

        {/* Discount Badge */}
        {product?.discount > 0 && (
          <View className="absolute top-2 right-2 bg-green-600 px-2 py-0.5 rounded-lg shadow-sm">
            <Text className="text-xs font-semibold text-white">
              {product?.discount}% OFF
            </Text>
          </View>
        )}
      </View>

      {/* DETAILS */}
      <View className="p-3">
        {/* Name */}
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
          {product?.productname}
        </Text>

        {/* Description */}
        {product?.shortdescription ? (
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
            {product?.shortdescription}
          </Text>
        ) : null}



        <View className="flex-row items-center mt-1">
          {renderStars(product?.rating)}
          <Text className="text-[10px] text-gray-500 ml-0.5">
            ({product?.rating?.toFixed(1)})
          </Text>
        </View>

        {/* Price + Action */}
        <View className="flex-row items-center justify-between mt-3">
          {/* Price */}
          <View>
            <Text className="text-base font-bold text-gray-900">
              ₹{product?.price}
            </Text>
            {product?.discount > 0 && (
              <Text className="text-xs text-gray-500 line-through">
                ₹{mrp}
              </Text>
            )}
          </View>

          {/* Action: Add / Quantity Controls */}
          {!cartItem ? (
            <TouchableOpacity
              disabled={product?.instock === 0}
              onPress={() => dispatch(addToCart({ ...product, orderquantity: 1 }))}
              className={`px-5 py-1.5 rounded-full ${product?.instock === 0 ? "bg-gray-300" : "bg-green-500"
                } shadow-sm`}
            >
              <Text className="text-xs font-semibold text-white">ADD</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center border border-gray-300 rounded-full overflow-hidden shadow-sm">
              {/* Decrement */}
              <Pressable
                className="bg-red-50 px-3 py-1"
                onPress={() => {
                  if (cartItem.orderquantity <= 1) {
                    dispatch(decrementQuantity(product));
                  } else {
                    dispatch(decrementQuantity(product));
                  }
                }}
              >
                <Text className="text-base font-semibold text-red-600">-</Text>
              </Pressable>

              {/* Quantity */}
              <Text className="text-sm font-semibold px-3">
                {cartItem.orderquantity}
              </Text>

              {/* Increment */}
              <Pressable
                className="bg-green-50 px-3 py-1"
                onPress={() => dispatch(incrementQuantity(product))}
              >
                <Text className="text-base font-semibold text-green-600">+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default ProductCard;
