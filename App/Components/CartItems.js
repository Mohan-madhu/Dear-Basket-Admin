import React from "react";
import { Config } from "../../config";
import { View, Text, Pressable, ScrollView, Alert, TouchableOpacity } from "react-native";
import { useDispatch } from "react-redux";
import { Image } from 'expo-image';
import {
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
} from "../Redux/CartReducer";

import { useNavigation } from "@react-navigation/native";
import { createLogger } from "../../App_Utils/Utils/logger";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring } from "react-native-reanimated";

export default function CartScreen({ cart, favorites, onToggleFavorite }) {

   
    const log = createLogger("CartItems");
    const nav = useNavigation();
    const dispatch = useDispatch();

    const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

    const getAvailableStock = (item = {}) => {
        const stock = Number(item.stockquantity ?? item.quantity ?? item.product?.stockquantity);
        return Number.isFinite(stock) ? stock : Infinity;
    };

    const canIncrementItem = (item) => Number(item?.orderquantity || 0) < getAvailableStock(item);

    const renderStars = (rating = 4) => {
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

    const handleRemoveItem = (item) => {
        Alert.alert(
            "Remove Item",
            `Are you sure you want to remove ${item.name} from your cart?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove",
                    onPress: () => dispatch(removeFromCart(item))
                }
            ]
        );
    };

    return (
        <ScrollView className="p-4 bg-gray-50" showsVerticalScrollIndicator={false}>
            {cart.map((item, index) => {

                const isFavorite = favorites.some(fav => fav.variantid === item.variantid);
                //  log("Cart Item:", JSON.stringify(item, null, 2));
                const pricePerItem = Math.round(Number(item.baseprice) * (1 - item.discount / 100));
                //  log("Price Per Item:", pricePerItem);
                const totalPrice = pricePerItem * Number(item.orderquantity);
                const originalTotal = item.baseprice * item.orderquantity;

                return (
                    <TouchableOpacity
                        key={index}
                        className="bg-white p-2 rounded-lg shadow-sm mb-2 flex-row border border-gray-100"
                        onPress={() => {
                            if (item.source !== "dearkitchen" && item.product && item.variantid) {
                                    nav.navigate("ProductAndVariantScreen", { prod: item.product, selectedvariantid: item.variantid });
                                }
                            }}


                    >
                        {/* Product Image Container */}
                        <View className="relative justify-center mr-6">
                            <Image
                                source={{ uri: item.imageurl.replace("~", Config.BASE_URL) }}
                                style={{ width: 100, height: 100, borderRadius: 8 }}
                                contentFit="fill"
                                transition={300}
                                cachePolicy="memory-disk"
                            />


                            {/* Action Buttons Container */}
                            <View className="absolute top-1 right-1 flex-row">
                                {/* Favorite Heart Icon */}
                                <Pressable
                                    className="bg-white rounded-full w-6 h-6 items-center justify-center mr-1"
                                    style={{
                                        transform: [{ translateX: 6 }, { translateY: -6 }],
                                        elevation: 2,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 1,
                                    }}
                                    onPress={() => onToggleFavorite(item)}
                                >
                                    <Ionicons
                                        name={isFavorite ? "heart" : "heart-outline"}
                                        size={14}
                                        color={isFavorite ? "#ef4444" : "#4b5563"}
                                    />
                                </Pressable>

                                {/* Delete Button */}
                                <Pressable
                                    className="bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                                    style={{
                                        transform: [{ translateX: 6 }, { translateY: -6 }],
                                        elevation: 2,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 1,
                                    }}
                                    onPress={() => handleRemoveItem(item)}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={12}
                                        color="white"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* Product Details */}
                        <View className="flex-1">
                            {/* Name & Price */}
                            <View className="flex-row justify-between">
                                <Text className="text-sm font-semibold flex-1" numberOfLines={2}>
                                    {item.variantname || item.name || item.productname || "Item"}
                                </Text>
                                <Text className="text-sm font-bold text-green-600 ml-1">
                                    ₹{pricePerItem.toFixed(2)}
                                </Text>
                            </View>

                            {/* Description */}
                            <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={2}>
                                {item.description}
                            </Text>

                            {/* Quantity & Discount */}
                            <View className="flex-row items-center mt-0.5">
                                <Text className="text-[10px] bg-gray-100 px-1 py-0.5 rounded mr-1">
                                    {item.quantity}
                                </Text>
                                {item.discount > 0 && (
                                    <Text className="text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                        {item.discount}% OFF
                                    </Text>
                                )}
                            </View>

                            {/* Rating */}
                            <View className="flex-row items-center mt-1">
                                <AnimatedStars rating={item?.rating ?? 0} />
                                <Text className="text-[10px] text-gray-500 ml-0.5">
                                    {/* ({item.rating ? item.rating.toFixed(1) : "N/A"}) */}
                                    ({item.rating ? item.rating.toFixed(1) : "1"})
                                </Text>
                            </View>

                            {/* Quantity Controls */}
                            <View className="flex-row items-center justify-between mt-2">
                                <View className="flex-row items-center border border-gray-300 rounded-md overflow-hidden">
                                    <Pressable
                                        className="bg-red-50 px-2 py-1"
                                        onPress={() => {
                                            if (item.orderquantity <= 1) {
                                                handleRemoveItem(item);
                                            } else {
                                                dispatch(decrementQuantity(item));
                                            }
                                        }}
                                    >
                                        <Text className="text-base font-semibold text-red-600">-</Text>
                                    </Pressable>

                                    <Text className="text-sm font-semibold px-2">
                                        {item.orderquantity}
                                    </Text>

                                    <Pressable
                                        disabled={!canIncrementItem(item)}
                                        className={`${canIncrementItem(item) ? "bg-green-50" : "bg-gray-50"} px-2 py-1`}
                                        onPress={() => dispatch(incrementQuantity(item))}
                                    >
                                        <Text className={`text-base font-semibold ${canIncrementItem(item) ? "text-green-600" : "text-gray-300"}`}>+</Text>
                                    </Pressable>
                                </View>

                                {/* Total Price */}
                                <View className="items-end">
                                    <Text className="text-sm font-bold">
                                        ₹{totalPrice.toFixed(2)}
                                    </Text>
                                    {item.discount > 0 && (
                                        <Text className="text-[10px] text-gray-400 line-through">
                                            ₹{originalTotal.toFixed(2)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                );

            })}
        </ScrollView>
    );
}
