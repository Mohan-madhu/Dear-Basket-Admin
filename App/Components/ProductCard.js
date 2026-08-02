import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "../../config";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import Animated, {


  withSpring,

  runOnJS,
  useAnimatedStyle,
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
import { Easing, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { addToFavorites, removeFromFavorites } from "../Redux/FavouriteReducer";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ProductCard = ({ product, setrefresh }) => {
  const dispatch = useDispatch();
  const [showActions, setShowActions] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [ROLE, setROLE] = useState("USER");
  const [USER, setUSER] = useState("");

  const heartScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const favorites = useSelector((state) => state.favorites?.favorites || []); // Adjust based on your Redux structure
  //console.log("FAVORITES:", JSON.stringify(favorites, null, 2));

  const log = createLogger("ProductCard");
  const nav = useNavigation();
  const { setLoading } = useLoading();


  const safeVariants = Array.isArray(product?.variants)
    ? product.variants.filter((variant) => variant?.variantid)
    : [];

  const isFavorite = (Array.isArray(favorites) ? favorites : []).some(fav =>
    fav.variantid === selectedVariant?.variantid
  );

  // Get cart state
  const allCart = useSelector((state) => state.cart.cart || []);
  const cart = useMemo(
    () => allCart.filter((item) => item?.source !== "dearkitchen"),
    [allCart]
  );

  // Set default selected variant
  useEffect(() => {
    if (safeVariants.length > 0) {
      setSelectedVariant(safeVariants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product]);

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

  // Find cart item for the selected variant
  const cartItem = cart.find(item =>
    // item.transid === product?.productid &&
    item.variantid === selectedVariant?.variantid
  );

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
    const numericPrice = Number(price || 0);
    const numericDiscount = Number(discount || 0);
    if (!numericDiscount || numericDiscount <= 0) return numericPrice;
    return Math.round((numericPrice * 100) / (100 - numericDiscount));
  };

  const getCurrentMrp = () => {
    if (!selectedVariant) return calcMrp(product?.price, product?.discount);
    return calcMrp(selectedVariant?.sellingprice, selectedVariant?.discountpercentage);
  };

  const getCurrentPrice = () => {
    if (!selectedVariant) return Number(product?.price || 0);
    return Number(selectedVariant?.sellingprice || 0);
  };

  const getCurrentDiscount = () => {
    if (!selectedVariant) return Number(product?.discount || 0);
    return Number(selectedVariant?.discountpercentage || 0);
  };

  const getCurrentStock = () => {
    if (!selectedVariant) return Number(product?.quantity ?? 0);
    return Number(selectedVariant.stockquantity ?? 0);
  };

  const isOutOfStock = () => getCurrentStock() <= 0;
  const isLowStock = () => getCurrentStock() > 0 && getCurrentStock() < 10;
  const canIncrementCart = () => !cartItem || Number(cartItem.orderquantity || 0) < getCurrentStock();

  const getImageURI = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== "string") return null;
    if (imagePath.startsWith("file://")) return imagePath;
    if (imagePath.startsWith("http")) return imagePath;
    return getImageUrl(imagePath);
  };

  const toggleFavorite = () => {
    if (!selectedVariant) return;

    // Animate the heart
    heartScale.value = withSpring(1.3, { damping: 2 }, () => {
      heartScale.value = withSpring(1, { damping: 10 });
    });

    const newFavoriteState = !isFavorite;

    if (newFavoriteState) {
      log("Added to favorites:", product?.productname);
      log("Added to favorites:", selectedVariant?.variantname);

      const { variants, ...productWithoutVariants } = product;
      const cartProduct = {
        ...productWithoutVariants,
        variantid: selectedVariant.variantid,
        variantname: selectedVariant.variantname,
        price: selectedVariant.sellingprice,
        baseprice: selectedVariant.baseprice,
        discount: selectedVariant.discountpercentage,
        quantity: selectedVariant.stockquantity,
        imageurl: selectedVariant.images?.[0] || product.imageurl,
        orderquantity: 1,
        product: product
      };
      dispatch(addToFavorites(cartProduct));
    } else {
      log("Removed from favorites:", product?.productname);
      log("Removed from favorites:", selectedVariant?.variantname);
      dispatch(removeFromFavorites({ variantid: selectedVariant.variantid }));
    }
  };

  const getDisplayImage = () => {
    // Use selected variant's first image if available
  //  console.log(product)
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      return getImageURI(selectedVariant.images[0]);
    }
    // Fall back to product image
    return getImageURI(product?.imageurl);
  };

  // const renderStars = (rating = 4) => {
  //   return [...Array(5)].map((_, i) => (
  //     <FontAwesome
  //       key={i}
  //       name={i < rating ? "star" : "star-o"}
  //       size={14}
  //       color="#f5a623"
  //       style={{ marginRight: 2 }}
  //     />
  //   ));
  // };

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
          onPress: () => onDelete(product),
        },
      ]
    );
  };

  const onDelete = async (product) => {
    try {
      log("Deleting Product : " + product.productid);
      setLoading(true, "Deleting Product and its Variants...");
      const del = await API.PUT("Products_new/status", {
        productid: product.productid,
        isactive: 0,
        luu: USER
      });
      log(del);
      setLoading(false);
      Alert.alert("Message", del.message);
      setrefresh(prev => prev + 1);
    } catch (error) {
      console.error("Error Deleting Product:", error);
      Alert.alert("Error", "Failed to Delete Product.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    // const cartProduct = {
    //   ...product,
    //   variantid: selectedVariant.variantid,
    //   variantname: selectedVariant.variantname,
    //   price: selectedVariant.sellingprice,
    //   baseprice: selectedVariant.baseprice,
    //   discount: selectedVariant.discountpercentage,
    //   quantity: selectedVariant.stockquantity,
    //   imageurl: selectedVariant.images?.[0] || product.imageurl,
    //   orderquantity: 1
    // };

    const { variants, ...productWithoutVariants } = product;
   // console.log(JSON.stringify(selectedVariant, null, 2));
    const cartProduct = {
      ...productWithoutVariants,
      variantid: selectedVariant.variantid,
      variantname: selectedVariant.variantname,
      price: selectedVariant.sellingprice,
      baseprice: selectedVariant.baseprice,
      discount: selectedVariant.discountpercentage,
      quantity: selectedVariant.stockquantity,
      imageurl: selectedVariant.images?.[0] || product.imageurl,
      orderquantity: 1,

      product: product
    };

    dispatch(addToCart(cartProduct));
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
  };




  const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

  const renderStars = (rating = 0) => {
    const fullStars = Math.floor(rating); // Full star count
    const hasHalfStar = rating % 1 >= 0.5; // Check if there's a half star
    const stars = [];

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push("star");
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push("star-half");
    }

    // Add empty stars if needed
    while (stars.length < 5) {
      stars.push("star-outline");
    }

    return stars;
  };

  const AnimatedStars = ({ rating }) => {
    // Shared value to animate opacity
    const opacity = useSharedValue(1);

    // Create an animated value to pulse stars
    React.useEffect(() => {
      opacity.value = withRepeat(
        withTiming(0.5, {
          duration: 1000,
          easing: Easing.ease,
        }),
        -1, // Infinite repeat
        true // Reverse animation direction
      );
    }, [opacity]);

    // Animated style for pulsing effect
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
      };
    });

    return (
      <View style={{ flexDirection: 'row' }}>
        {renderStars(rating).map((star, index) => (
          <AnimatedIonicons
            key={index}
            name={star}
            size={14}
            color="#f5a623"
            style={[animatedStyle, { marginRight: 2 }]} // Apply animated opacity
          />
        ))}
      </View>
    );
  };



  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 0 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 0 });
      }}
      onPress={() => {
        if (!showActions && selectedVariant) {
          nav.navigate("ProductAndVariantScreen", {
            prod: product,
            selectedVariant: selectedVariant
          });
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
            getDisplayImage()
              ? { uri: getDisplayImage() }
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
                nav.navigate("Products_New", {
                  typedata: null,
                  productdata: product,
                  isedit: true
                });
                toggleActions();
              }}
              className="bg-blue-500 p-2 rounded-full shadow-lg"
            >
              <Ionicons name="pencil" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="bg-red-500 p-2 rounded-full shadow-lg"
            >
              <Ionicons name="trash" size={18} color="white" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stock Quantity */}
        <View className={`absolute top-2 left-2 px-2 py-1 rounded-lg shadow-sm flex-row items-center ${isOutOfStock() ? "bg-red-50" : isLowStock() ? "bg-amber-50" : "bg-white/90"}`}>
          <Ionicons
            name={isOutOfStock() ? "close-circle" : isLowStock() ? "alert-circle" : "pricetag"}
            size={12}
            color={isOutOfStock() ? "#dc2626" : isLowStock() ? "#d97706" : "#4b5563"}
          />
          <Text className={`text-xs font-medium ml-1 ${isOutOfStock() ? "text-red-700" : isLowStock() ? "text-amber-700" : "text-gray-800"}`}>
            {isOutOfStock() ? "Out of Stock" : isLowStock() ? `Low Stock: ${getCurrentStock()}` : getCurrentStock()}
          </Text>
        </View>

        {/* Favorite Heart Icon */}
        <TouchableOpacity
          onPress={toggleFavorite}
          className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm"
        >
          <Animated.View style={heartStyle}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? "#ef4444" : "#4b5563"}
            />
          </Animated.View>
        </TouchableOpacity>


        {/* Discount Badge */}
        {getCurrentDiscount() > 0 && (
          // <View className="absolute top-2 right-2 bg-green-600 px-2 py-1 rounded-lg shadow-sm flex-row items-center">
          <View className="absolute top-2 right-2 bg-green-600 px-2 py-1 rounded-lg shadow-sm flex-row items-center">
            <Ionicons name="flash" size={12} color="white" />
            <Text className="text-xs font-semibold text-white ml-1">
              {getCurrentDiscount()}% OFF
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

        {/* Variant Pills */}
        {safeVariants.length > 1 && (
          <View className="flex-row flex-wrap mt-2 gap-1">
            {safeVariants.map((variant) => (
              <TouchableOpacity
                key={variant.variantid}
                onPress={() => handleVariantSelect(variant)}
                className={`px-3 py-1 rounded-full border ${selectedVariant?.variantid === variant.variantid
                  ? "bg-blue-100 border-blue-500"
                  : "bg-gray-100 border-gray-300"
                  }`}
              >
                <Text
                  className={`text-xs font-medium ${selectedVariant?.variantid === variant.variantid
                    ? "text-blue-700"
                    : "text-gray-700"
                    }`}
                >
                  {variant.variantname}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Rating */}
        <View className="flex-row items-center mt-2">
          {/* {renderStars(product?.rating)} */}
          <AnimatedStars rating={product?.rating ?? 0} />
          <Text className="text-[10px] text-gray-500 ml-1">
            ({Number(product?.rating || 0).toFixed(1)})
          </Text>
        </View>

        {/* Price + Action */}
        <View className="flex-row items-center justify-between mt-3">
          {/* Price */}
          <View>
            <Text className="text-base font-bold text-gray-900">
              ₹{getCurrentPrice()}
            </Text>
            {getCurrentDiscount() > 0 && (
              <Text className="text-xs text-gray-500 line-through">
                ₹{getCurrentMrp()}
              </Text>
            )}
          </View>

          {/* Action: Add / Quantity Controls */}
          {!cartItem ? (
            <TouchableOpacity
              disabled={isOutOfStock()}
              onPress={handleAddToCart}
              className={`px-5 py-2 rounded-full ${isOutOfStock() ? "bg-gray-300" : "bg-green-500"
                } shadow-sm`}
              activeOpacity={0.8}
            >
              <Text className="text-xs font-semibold text-white">{isOutOfStock() ? "OUT" : "ADD"}</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center border border-gray-200 rounded-full overflow-hidden shadow-sm bg-white">
              {/* Decrement */}
              <Pressable
                className="bg-gray-100 px-3 py-1.5 active:bg-gray-200"
                onPress={() => dispatch(decrementQuantity({
                  ...product,
                  variantid: selectedVariant?.variantid
                }))}
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
                disabled={!canIncrementCart()}
                className={`${canIncrementCart() ? "bg-gray-100" : "bg-gray-50"} px-3 py-1.5 active:bg-gray-200`}
                onPress={() => dispatch(incrementQuantity({
                  ...product,
                  variantid: selectedVariant?.variantid
                }))}
                android_ripple={{ color: '#e5e7eb', borderless: false }}
              >
                <Text className={`text-base font-semibold ${canIncrementCart() ? "text-green-600" : "text-gray-300"}`}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default ProductCard;
