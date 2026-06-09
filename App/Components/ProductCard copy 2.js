import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { getImageUrl } from "../../config";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useDispatch, useSelector } from "react-redux";
import {
  incrementQuantity,
  decrementQuantity,
  addToCart,
  removeFromCart,
} from "../Redux/CartReducer";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { createLogger } from "../../App_Utils/Utils/logger";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ProductCard = ({ product, setrefresh }) => {


  console.log("Products Data :", JSON.stringify(product, null, 2))
  const dispatch = useDispatch();
  const [showActions, setShowActions] = useState(false);

  const log = createLogger("ProductCard");
  const nav = useNavigation();
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

  // Get cart state
  const { cart } = useSelector((state) => state.cart);
  let cartItem = null;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].transid === product?.productid) {
      cartItem = cart[i];
      break;
    }
  }

  // Animation values
  const scale = useSharedValue(1);
  const actionsOpacity = useSharedValue(0);
  const actionsScale = useSharedValue(0.8);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ scale: actionsScale.value }],
  }));

  const toggleActions = () => {
    if (showActions) {
      actionsOpacity.value = withTiming(0, { duration: 150 });
      actionsScale.value = withTiming(0.8, { duration: 150 }, () => {
        runOnJS(setShowActions)(false);
      });
    } else {
      setShowActions(true);
      actionsOpacity.value = withTiming(1, { duration: 200 });
      actionsScale.value = withSpring(1, { damping: 10 });
    }
  };

  const calcMrp = (price, discount) => {
    if (!discount || discount <= 0) return price;
    return Math.round((price * 100) / (100 - discount));
  };

  const mrp = calcMrp(product?.price, product?.discount);

  const getImageURI = () => {
    if (!product?.imageurl) return null;
    if (product?.imageurl.startsWith("file://")) return product?.imageurl;
    if (product?.imageurl.startsWith("http")) return product?.imageurl;
    return getImageUrl(product?.imageurl);
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

  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this product?",
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
              onDelete(product);
            } else {
              // Default delete behavior if no prop provided
              dispatch(removeFromCart(product));
            }
            toggleActions();
          },
        },
      ]
    );
  };


  const onDelete = async (product) => {

    try {
      log("Deleting Product : " + product.productid)
      setLoading(true, "Deleting Product and its Variants...");
      const del = await API.PUT("Products_new/status", { productid: product.productid, isactive: 0, luu: USER });
      log(del);
      setLoading(false);
      Alert.alert("Message", del.message);
      //nav.goBack();
      setrefresh(prev => prev + 1)
    } catch (error) {
      console.error("Error Deleting Product:", error);
      Alert.alert("Error", "Failed to Delete Product.");
    } finally {
      setLoading(false);
    }
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
        if (!showActions) {
          nav.navigate("ProductAndVariantScreen", { prod: product });
        }
      }}
      onLongPress={toggleActions}
      style={animStyle}
      className="flex-1 m-1.5 my-2 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 relative"
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
          style={{ height: 180 }}
          className="w-full"
          contentFit="cover"
          transition={300}
        />

        {/* Action Buttons (Edit/Delete) */}
        {showActions && ROLE === "ADMIN" && (
          <Animated.View
            style={actionsStyle}
            className="absolute inset-0 bg-black/30 flex-row justify-end items-start pt-2 pr-2 space-x-2"
          >
            <TouchableOpacity
              onPress={() => {
                nav.navigate("Products_New", { typedata: null, productdata: product, isedit: true });
                toggleActions();
              }}
              className="bg-blue-500 p-2 rounded-full shadow-lg"
            >
              <Ionicons name="pencil" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                handleDelete(product)
              }}
              className="bg-red-500 p-2 rounded-full shadow-lg"
            >
              <Ionicons name="trash" size={18} color="white" />
            </TouchableOpacity>
          </Animated.View>
        )}



        {/* Stock Quantity */}
        <View className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-lg shadow-sm flex-row items-center">
          <Ionicons name="pricetag" size={12} color="#4b5563" />
          <Text className="text-xs font-medium text-gray-800 ml-1">
            {product?.quantity}
          </Text>
        </View>

        {/* Discount Badge */}
        {product?.discount > 0 && (
          <View className="absolute top-2 right-2 bg-green-600 px-2 py-1 rounded-lg shadow-sm flex-row items-center">
            <Ionicons name="flash" size={12} color="white" />
            <Text className="text-xs font-semibold text-white ml-1">
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
          <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
            {product?.shortdescription}
          </Text>
        ) : null}

        {/* Rating */}
        <View className="flex-row items-center mt-1.5">
          {renderStars(product?.rating)}
          <Text className="text-[10px] text-gray-500 ml-1">
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
              className={`px-5 py-2 rounded-full ${product?.instock === 0
                ? "bg-gray-300"
                : "bg-green-500"
                } shadow-sm`}
              activeOpacity={0.8}
            >
              <Text className="text-xs font-semibold text-white">ADD</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center border border-gray-200 rounded-full overflow-hidden shadow-sm bg-white">
              {/* Decrement */}
              <Pressable
                className="bg-gray-100 px-3 py-1.5 active:bg-gray-200"
                onPress={() => {
                  if (cartItem.orderquantity <= 1) {
                    dispatch(decrementQuantity(product));
                  } else {
                    dispatch(decrementQuantity(product));
                  }
                }}
                android_ripple={{ color: '#e5e7eb', borderless: false }}
              >
                <Text className="text-base font-semibold text-red-600">-</Text>
              </Pressable>

              {/* Quantity */}
              <Text className="text-sm font-semibold px-3 text-gray-800">
                {cartItem.orderquantity}
              </Text>

              {/* Increment */}
              <Pressable
                className="bg-gray-100 px-3 py-1.5 active:bg-gray-200"
                onPress={() => dispatch(incrementQuantity(product))}
                android_ripple={{ color: '#e5e7eb', borderless: false }}
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