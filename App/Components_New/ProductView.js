import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getImageUrl } from '../../config';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Modal, Dimensions, Alert, StyleSheet, Button, Pressable } from 'react-native';
import ProductVariantCard from './ProductVariantCard';
import { Image } from "expo-image";
import AddVariantCard from './AddVariantCard';
import ZoomableImage from './ZoomableImage';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { createLogger } from '../../App_Utils/Utils/logger';
import { useNavigation } from '@react-navigation/native';
import ProductAttributesView from './ProductAttributesView';
import ProductReviews from './ProductReviews';
import { useDispatch, useSelector } from 'react-redux';
const { width } = Dimensions.get('window');
import {
    incrementQuantity,
    decrementQuantity,
    addToCart,
    removeFromCart,
} from "../Redux/CartReducer";
import { addToFavorites, removeFromFavorites } from '../Redux/FavouriteReducer';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';


const ProductView = ({ product, variants, selectedvariantid }) => {


    const allCart = useSelector((state) => state.cart.cart || []);
    const cart = useMemo(
        () => allCart.filter((item) => item?.source !== "dearkitchen"),
        [allCart]
    );

    const total = cart
        .map((item) => item.price * item.orderquantity)
        .reduce((cur, prev) => cur + prev, 0);






    var variantsLength = variants.length

    const { setLoading } = useLoading();


    const [selectedVariant, setSelectedVariant] = useState(
        variants.find(v => v.variantid === selectedvariantid) || variants[0] // fallback if no match
    );
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [zoomModalVisible, setZoomModalVisible] = useState(false);
    const [addImageModalVisible, setAddImageModalVisible] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [imageType, setImageType] = useState('Main');
    const scrollRef = useRef();
    const autoScrollRef = useRef();


    const [showCard, setShowCard] = useState(false);

    const log = createLogger("ProductView");
    const nav = useNavigation();

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




    const [variantImages, setVariantImages] = useState(selectedVariant?.images || []);
    useEffect(() => {
        // In case selectedVariant changes from parent
        if (selectedVariant?.images) {
            setVariantImages(selectedVariant.images);
        }
    }, [selectedVariant]);
    const navigation = useNavigation();



    const thumbnailWidth = 60 + 12; // width + gap

    // Auto-scroll images every 3 seconds
    useEffect(() => {
        if (selectedVariant?.images && selectedVariant?.images?.length > 1) {
            const timer = setInterval(() => {
                const nextIndex = (selectedImageIndex + 1) % selectedVariant?.images?.length;
                setSelectedImageIndex(nextIndex);

                // Scroll to the thumbnail
                scrollRef.current?.scrollTo({
                    x: nextIndex * thumbnailWidth,
                    animated: true
                });
            }, 3000);

            return () => clearInterval(timer);
        }
    }, [selectedImageIndex, selectedVariant?.images?.length]);

    const handleImageSelect = (index) => {
        setSelectedImageIndex(index);
        // Scroll to the selected thumbnail
        scrollRef.current?.scrollTo({
            x: index * thumbnailWidth,
            animated: true
        });
    };
    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["image/*"],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled || result.cancelled) return;

            const file = {
                uri: result.assets[0].uri,
                name: result.assets[0].name,
                type: result.assets[0].mimeType,
            };

            setImageUri(file.uri);
            setFileInfo(file);
        } catch (error) {
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const uploadImage = async () => {
        if (!fileInfo) {
            Alert.alert("Error", "Please select an image first");
            return;
        }

        setAddImageModalVisible(false)
        try {
            setLoading(true, "Uploading product image");
            const USER = await Storage.getData("USER");

            // First upload the image file
            const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
                path: "ProductImages",
            });

            // Then create the product image record
            const data = {
                productid: product.productid,
                variantid: selectedVariant?.variantid,
                imageurl: uploadRes.virtualPath,
                imagetype: imageType,
                sortorder: selectedVariant?.images?.length, // Add at the end
                isactive: 1,
                rcu: USER,
            };
            //   console.log(data, "Product Image Data");

            const { message } = await API.POST("ProductImages", data);
            Alert.alert("Success", "Image added successfully");

            // Reset and close modal
            setImageUri(null);
            setFileInfo(null);
            setAddImageModalVisible(false);

            // TODO: You might want to refresh the product data here to show the new image
            // This would depend on your state management approach
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to upload image");
        } finally {
            setLoading(false);
        }
    };






    const onDeleteImage = async (img) => {

        try {
            log("Deleting Variant Image : " + img)
            setLoading(true, "Deleting Variant Image...");
            const del = await API.PUT("ProductImages/status", { imageurl: img, isactive: 0, luu: USER });
            log(del);
            setLoading(false);
            Alert.alert("Message", del.message);
            //nav.goBack();
            //   setrefresh(prev => prev + 1)
        } catch (error) {
            console.error("Error Deleting Variant Image:", error);
            Alert.alert("Error", "Failed to Variant Image.");
        } finally {
            setLoading(false);
        }
    };







    // Sample data structure
    // const productAttributes = [
    //     {
    //         attributeid: '1',
    //         productid: 'prod123',
    //         variantid: 'global',
    //         attributename: 'brand',
    //         attributevalue: 'Premium Audio',
    //         displayorder: 1
    //     },
    //     {
    //         attributeid: '2',
    //         productid: 'prod123',
    //         variantid: 'global',
    //         attributename: 'battery_life',
    //         attributevalue: '30 hours',
    //         displayorder: 3
    //     },
    //     {
    //         attributeid: '2',
    //         productid: 'prod123',
    //         variantid: 'global',
    //         attributename: 'battery_lifughe',
    //         attributevalue: '30 hourhjgks',
    //         displayorder: 3
    //     },
    //     {
    //         attributeid: '3',
    //         productid: 'prod123',
    //         variantid: 'global',
    //         attributename: 'connectivity',
    //         attributevalue: 'Bluetooth 5.0',
    //         displayorder: 2
    //     },
    //     {
    //         attributeid: '4',
    //         productid: 'prod123',
    //         variantid: 'global',
    //         attributename: 'warranty',
    //         attributevalue: '2 years',
    //         displayorder: 5
    //     }
    // ];

    // const variantAttributes = [
    //     {
    //         attributeid: '5',
    //         productid: 'prod123',
    //         variantid: 'var1',
    //         attributename: 'color',
    //         attributevalue: 'Matte Black',
    //         displayorder: 1
    //     },
    //     {
    //         attributeid: '6',
    //         productid: 'prod123',
    //         variantid: 'var1',
    //         attributename: 'weight',
    //         attributevalue: '250g',
    //         displayorder: 4
    //     },
    //     {
    //         attributeid: '7',
    //         productid: 'prod123',
    //         variantid: 'var2',
    //         attributename: 'color',
    //         attributevalue: 'Silver',
    //         displayorder: 1
    //     },
    //     {
    //         attributeid: '8',
    //         productid: 'prod123',
    //         variantid: 'var2',
    //         attributename: 'weight',
    //         attributevalue: '270g',
    //         displayorder: 4
    //     }
    // ];

    var productAttributes = []
    var variantAttributes = []

    // Filter variant attributes for currently selected variant
    const currentVariantAttributes = variantAttributes.filter(
        attr => attr?.variantid === selectedVariant?.variantid
    );




    // const reviews = [
    //     {
    //         reviewId: '1',
    //         productId: 'prod123',
    //         variantId: 'var1',
    //         userId: 'user1',
    //         username: 'John Doe',
    //         rating: 5,
    //         reviewTitle: 'Excellent sound quality!',
    //         reviewText: 'These headphones have amazing sound quality. The bass is deep and the highs are crisp. The noise cancellation works perfectly in noisy environments. Battery life is as advertised. Highly recommended!',
    //         isVerifiedPurchase: true,
    //         reviewDate: '2025-08-15',
    //         helpfulVotes: 12,
    //         images: [
    //             'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'
    //         ]
    //     },
    //     {
    //         reviewId: '2',
    //         productId: 'prod123',
    //         variantId: 'var2',
    //         userId: 'user2',
    //         username: 'Sarah Wilson',
    //         rating: 4,
    //         reviewTitle: 'Good but could be better',
    //         reviewText: 'Overall good headphones. Comfortable to wear for long periods. Sound quality is decent but not exceptional. The build quality feels a bit plasticky for the price.',
    //         isVerifiedPurchase: true,
    //         reviewDate: '2025-08-10',
    //         helpfulVotes: 5,
    //         images: []
    //     },
    //     {
    //         reviewId: '3',
    //         productId: 'prod123',
    //         variantId: 'var1',
    //         userId: 'user3',
    //         username: 'Mike Chen',
    //         rating: 5,
    //         reviewTitle: 'Worth every penny',
    //         reviewText: 'Upgraded from my old headphones and the difference is night and day. The ANC is incredible, battery lasts forever, and they look great too.',
    //         isVerifiedPurchase: false,
    //         reviewDate: '2025-08-05',
    //         helpfulVotes: 8,
    //         images: [
    //             'https://images.unsplash.com/photo-1593784991095-a205069470b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
    //             'https://images.unsplash.com/photo-1545127398-146d7df33533?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'
    //         ]
    //     }
    // ];

    var reviews = []



    var averageRating = 0;
    var totalReviews = 0;

    if (reviews.length > 0) {
        averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        totalReviews = reviews.length;
    }


    const handleUpdateVariantAttribute = (attributeId, newValue) => {
        console.log('Update attribute:', attributeId, newValue);
        // Call your API to update the attribute
    };

    const handleDeleteVariantAttribute = (attributeId) => {
        console.log('Delete attribute:', attributeId);
        // Call your API to delete the attribute
    };

    const handleAddVariantAttribute = (newAttribute) => {
        console.log('Add new attribute:', newAttribute);
        // Call your API to add the attribute
    };


    const handleEditVariant = (variant) => {
        navigation.navigate('ProductVariantEditScreen', {
            variant: variant,
            product: product,
            variantAttributesold: variantAttributes,
            productAttributesold: productAttributes
        });
    };





    const dispatch = useDispatch();
    // const { cart } = useSelector((state) => state.cart);
    const cartItem = cart.find(item =>
        item.variantid === selectedVariant?.variantid
    );


    const { favorites } = useSelector((state) => state.favorites); // Adjust based on your Redux structure

    // Add animation values for heart
    const heartScale = useSharedValue(1);
    const isFavorite = favorites.some(fav => fav.variantid === selectedVariant?.variantid);

    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    // Add toggleFavorite function
    const toggleFavorite = () => {
        if (!selectedVariant) return;

        // Animate the heart
        heartScale.value = withSpring(1.3, { damping: 2 }, () => {
            heartScale.value = withSpring(1, { damping: 10 });
        });

        if (!isFavorite) {
            log("Added to favorites from product view:", selectedVariant?.variantname);

            const favoriteItem = {
                ...product,
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
            dispatch(addToFavorites(favoriteItem));
        } else {
            log("Removed from favorites from product view:", selectedVariant?.variantname);
            dispatch(removeFromFavorites({ variantid: selectedVariant.variantid }));
        }
    };
    const getCartItem = () => {
        return cartItems.find(item =>
            item.productid === product.productid &&
            item.variantid === selectedVariant?.variantid
        );
    };

    // Add this function to check current stock
    const getCurrentStock = () => {
        return selectedVariant?.stockquantity || 0;
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


    return (
        <>

            <ScrollView className="bg-gray-50 flex-1 ">


                {variantsLength > 0 && (
                    <>


                        <View className="bg-white">

                            <TouchableOpacity
                                onPress={() => setZoomModalVisible(true)}
                                className="w-full aspect-square bg-gray-100 justify-center items-center"
                                activeOpacity={0.95}
                            >
                                <Image
                                    cachePolicy="memory-disk"
                                    source={{ uri: getImageUrl(selectedVariant?.images[selectedImageIndex]) }}

                                    style={{ width: "100%", aspectRatio: 1 }}
                                    contentFit='contain'
                                />
                                <TouchableOpacity
                                    onPress={toggleFavorite}
                                    className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg"
                                >
                                    <Animated.View style={heartStyle}>
                                        <Ionicons
                                            name={isFavorite ? "heart" : "heart-outline"}
                                            size={24}
                                            color={isFavorite ? "#ef4444" : "#4b5563"}
                                        />
                                    </Animated.View>
                                </TouchableOpacity>

                                {/* Zoom Indicator */}
                                <View className="absolute bottom-4 right-4 bg-black bg-opacity-70 p-2 rounded-full">
                                    <Text className="text-white text-xs">Tap to zoom</Text>
                                </View>


                            </TouchableOpacity>

                            {/* Horizontal Thumbnail Strip */}
                            <ScrollView
                                ref={scrollRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="px-4 py-3 border-t border-gray-200"
                                contentContainerStyle={{ gap: 12 }}
                            >

                                {/* Add Image Button */}

                                {ROLE == "ADMIN" && (

                                    <TouchableOpacity
                                        onPress={() => setAddImageModalVisible(true)}
                                        className="rounded-md overflow-hidden border border-gray-300 justify-center items-center"
                                        style={{
                                            width: 60,
                                            height: 60,
                                            backgroundColor: '#f8f9fa'
                                        }}
                                    >
                                        <Icon name="plus" size={24} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                                {/* {selectedVariant?.images?.map((img, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleImageSelect(index)}
                                    className={`rounded-md overflow-hidden ${selectedImageIndex === index ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
                                    style={{
                                        width: 60,
                                        height: 60,
                                        backgroundColor: '#f8f9fa'
                                    }}
                                >
                                    <Image
                                        cachePolicy="memory-disk"

                                        source={{ uri: getImageUrl(img) }}



                                        style={{ width: "100%", aspectRatio: 1 }}
                                        contentFit="cover"
                                    />

                                    
                                    {selectedImageIndex === index && (
                                        <View className="absolute inset-0 bg-gray-700 bg-opacity-90" />

                                    )}
                                </TouchableOpacity>
                            ))} */}


                                {selectedVariant?.images?.map((img, index) => (
                                    <View key={index} className="relative mb-2 mr-2">
                                        <TouchableOpacity
                                            onPress={() => handleImageSelect(index)}
                                            className={`rounded-lg overflow-hidden ${selectedImageIndex === index
                                                ? 'border-2 border-blue-500'
                                                : 'border border-gray-200 '
                                                }`}

                                            style={{
                                                width: 72,
                                                height: 72,
                                                backgroundColor: '#f8f9fa',
                                            }}
                                        >
                                            <Image
                                                cachePolicy="memory-disk"
                                                source={{ uri: getImageUrl(img) }}
                                                style={{ width: "100%", height: "100%" }}
                                                contentFit="cover"
                                            />

                                            {/* Selection Indicator */}
                                            {selectedImageIndex === index && (
                                                // <View className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                                                //     <Ionicons name="checkmark-circle" size={24} color="white" />
                                                // </View>
                                                <View style={styles.overlay}>
                                                    <Ionicons name="checkmark-circle" size={24} color="white" />
                                                </View>
                                            )}
                                        </TouchableOpacity>

                                        {/* Delete Button - Always Visible */}
                                        {ROLE == "ADMIN" && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Alert.alert(
                                                        "Delete Image",
                                                        "Are you sure you want to delete this image?",
                                                        [
                                                            {
                                                                text: "Cancel",
                                                                style: "cancel",
                                                            },
                                                            {
                                                                text: "Delete",
                                                                style: "destructive",
                                                                onPress: () => {
                                                                    // Call your delete function here
                                                                    onDeleteImage(img);
                                                                },
                                                            },
                                                        ]
                                                    );
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full shadow-lg z-10"
                                            >
                                                <Ionicons name="close" size={14} color="white" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}

                            </ScrollView>
                        </View>


                        <View className="p-4 bg-white mt-1">
                            <Text className="text-2xl font-bold text-gray-900">{product.productname}</Text>
                            <Text className="text-lg text-blue-600 mb-2">{selectedVariant?.variantname}</Text>

                            {product.isfeatured && (
                                <View className="bg-amber-100 px-2 py-1 rounded-full self-start mb-2">
                                    <Text className="text-amber-800 text-xs font-medium">Featured</Text>
                                </View>
                            )}

                            <View className="flex-row items-center mb-3">
                                <Text className="text-xl font-bold text-gray-900 mr-2">
                                    ${selectedVariant?.sellingprice.toFixed(2)}
                                </Text>
                                {selectedVariant?.discountpercentage > 0 && (
                                    <>
                                        <Text className="text-sm text-gray-500 line-through mr-2">
                                            ${selectedVariant?.baseprice.toFixed(2)}
                                        </Text>
                                        <Text className="text-sm text-green-600">
                                            {selectedVariant?.discountpercentage}% OFF
                                        </Text>
                                    </>
                                )}
                            </View>

                            <Text className="text-gray-700 mb-4">{product.fulldescription}</Text>

                            <View className="bg-white rounded-lg shadow-md p-4 mb-4">
                                <Text className="text-lg font-bold text-gray-800 mb-3">About this item</Text>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-gray-600">Price:</Text>
                                    <Text className="font-bold">${selectedVariant?.sellingprice.toFixed(2)}</Text>
                                </View>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-gray-600">SKU:</Text>
                                    <Text>{selectedVariant?.sku}</Text>
                                </View>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-gray-600">Weight:</Text>
                                    <Text>{selectedVariant?.weight} kg</Text>
                                </View>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-gray-600">Dimensions:</Text>
                                    <Text>{selectedVariant?.dimensions}</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-600">In Stock:</Text>
                                    <Text className={selectedVariant?.stockquantity > 10 ? 'text-green-600' : 'text-amber-600'}>
                                        {selectedVariant?.stockquantity} units
                                    </Text>
                                </View>

                                {/* ADD CART CONTROLS HERE */}
                                {/* <View className="mt-4 flex-row justify-center">
                                {!cartItem ? (
                                    <TouchableOpacity
                                        disabled={getCurrentStock() === 0}
                                        onPress={handleAddToCart}
                                        className={`px-5 py-2 rounded-full ${getCurrentStock() === 0 ? "bg-gray-300" : "bg-green-500"
                                            } shadow-sm`}
                                        activeOpacity={0.8}
                                    >
                                        <Text className="text-xs font-semibold text-white">ADD</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View className="flex-row items-center border border-gray-200 rounded-full overflow-hidden shadow-sm bg-white">
                                       
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

                                       
                                        <Text className="text-sm font-semibold px-3 text-gray-800">
                                            {cartItem.orderquantity}
                                        </Text>

                                        <Pressable
                                            className="bg-gray-100 px-3 py-1.5 active:bg-gray-200"
                                            onPress={() => dispatch(incrementQuantity({
                                                ...product,
                                                variantid: selectedVariant?.variantid
                                            }))}
                                            android_ripple={{ color: '#e5e7eb', borderless: false }}
                                        >
                                            <Text className="text-base font-semibold text-green-600">+</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View> */}




                                {/* ADD TO CART SECTION - Place this right after the stock info */}
                                <View className="flex-row items-center justify-between mt-4 mb-4 p-3 bg-gray-50 rounded-lg">
                                    <View className="flex-row items-center">
                                        <Text className="text-lg font-semibold text-gray-900 mr-3">${selectedVariant?.sellingprice.toFixed(2) * (cartItem?.orderquantity || 0)}</Text>
                                        {selectedVariant?.discountpercentage > 0 && (
                                            <Text className="text-sm text-gray-500 line-through">
                                                ${selectedVariant?.baseprice.toFixed(2) * (cartItem?.orderquantity || 0)}
                                            </Text>
                                        )}
                                    </View>

                                    {!cartItem ? (
                                        <TouchableOpacity
                                            disabled={getCurrentStock() === 0}
                                            onPress={handleAddToCart}
                                            className={`px-5 py-3 rounded-full ${getCurrentStock() === 0 ? "bg-gray-300" : "bg-blue-600"} shadow-sm`}
                                            activeOpacity={0.8}
                                        >
                                            <Text className="text-base font-semibold text-white">
                                                {getCurrentStock() === 0 ? "Out of Stock" : "Add to Cart"}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View className="flex-row items-center border border-gray-200 rounded-full overflow-hidden shadow-sm bg-white">
                                            <Pressable
                                                className="bg-gray-100 px-4 py-2 active:bg-gray-200"
                                                onPress={() => dispatch(decrementQuantity({
                                                    ...product,
                                                    variantid: selectedVariant?.variantid
                                                }))}
                                                android_ripple={{ color: '#e5e7eb', borderless: false }}
                                            >
                                                <Text className="text-base font-semibold text-red-600">-</Text>
                                            </Pressable>

                                            <Text className="text-base font-semibold px-4 text-gray-800">
                                                {cartItem?.orderquantity}
                                            </Text>

                                            <Pressable
                                                className="bg-gray-100 px-4 py-2 active:bg-gray-200"
                                                onPress={() => dispatch(incrementQuantity({
                                                    ...product,
                                                    variantid: selectedVariant?.variantid
                                                }))}
                                                android_ripple={{ color: '#e5e7eb', borderless: false }}
                                            >
                                                <Text className="text-base font-semibold text-green-600">+</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>


                            </View>
                        </View>

                    </>
                )}

                {variantsLength > 0 && (

                    // <ProductAttributesView
                    //     productAttributes={productAttributes}
                    //     variantAttributes={variantAttributes}
                    // />



                    <ProductAttributesView
                        productAttributes={productAttributes}
                        variantAttributes={variantAttributes}
                        onUpdateVariantAttribute={handleUpdateVariantAttribute}
                        onDeleteVariantAttribute={handleDeleteVariantAttribute}
                        onAddVariantAttribute={handleAddVariantAttribute}
                    />
                )}
                {variantsLength === 0 && (
                    <>
                        <View className="p-4 bg-white mt-1">
                            <Text className="text-2xl font-bold text-gray-900">{product.productname}</Text>
                            <Text className="text-gray-700 mb-4">{product.shortdescription}</Text>

                        </View>

                    </>
                )}
                {/* Variants Section */}
                <View className="p-4 bg-white mt-1 mb-4">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Available Variants</Text>


                    {variantsLength === 0 && (
                        <>
                            <View className="p-4">
                                <Text className="text-1xl text-center font-semibold text-gray-900">There are No Variants for the Product. Kindly Add the Variants</Text>


                            </View>

                        </>
                    )}


                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="pb-2"
                    >
                        {variants.map((variant) => (
                            <TouchableOpacity
                                key={variant?.variantid}
                                className="mr-4"
                                onPress={() => {
                                    setSelectedVariant(variant);
                                    setSelectedImageIndex(0);
                                }}
                            >
                                <ProductVariantCard
                                    variant={variant}
                                    isActive={variant?.variantid === selectedVariant?.variantid}
                                    handleEditVariant={handleEditVariant}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Add Variant Section */}


                {/* <Button
                title={showCard ? "Hide Variant Card" : "Show Variant Card"}
                onPress={() => setShowCard(!showCard)}
            />

            {showCard && <AddVariantCard productData={product} editProductData={selectedVariant} />} */}

                {ROLE == "ADMIN" && (
                    <AddVariantCard productData={product} />
                )}
                {/* Image Zoom Modal */}
                <Modal
                    visible={zoomModalVisible}
                    transparent={true}
                    onRequestClose={() => setZoomModalVisible(false)}
                >
                    <View className="flex-1 bg-black bg-opacity-90 justify-center items-center">
                        <TouchableOpacity
                            className="absolute top-4 right-4 z-10"
                            onPress={() => setZoomModalVisible(false)}
                        >
                            <Text className="text-white text-2xl">×</Text>
                        </TouchableOpacity>
                        <ZoomableImage
                            source={{ uri: getImageUrl(selectedVariant?.images[selectedImageIndex]) }}
                            style={{ width: width - 40, height: width - 40 }}
                        />
                        <Text className="text-white mt-2">
                            {selectedImageIndex + 1} of {selectedVariant?.images.length}
                        </Text>
                    </View>
                </Modal>

                {/* Add Image Modal */}
                <Modal
                    visible={addImageModalVisible}
                    transparent={true}
                    onRequestClose={() => setAddImageModalVisible(false)}
                >
                    <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
                        <View className="bg-white w-full max-w-md rounded-lg p-6">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-gray-800">Add Product Image</Text>
                                <TouchableOpacity onPress={() => setAddImageModalVisible(false)}>
                                    <Icon name="close" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            <View className="mb-4">
                                <Text className="text-gray-600 mb-2">Image Type</Text>
                                <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
                                    {['Main', 'Thumbnail', 'Gallery'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            className={`flex-1 py-2 items-center ${imageType === type ? 'bg-blue-500' : 'bg-gray-100'}`}
                                            onPress={() => setImageType(type)}
                                        >
                                            <Text className={imageType === type ? 'text-white' : 'text-gray-800'}>
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-600 mb-2">Product Image</Text>
                                <TouchableOpacity
                                    onPress={pickImage}
                                    className="border border-gray-300 rounded-lg p-4 items-center"
                                >
                                    {imageUri ? (
                                        <Image
                                            cachePolicy="memory-disk"
                                            source={{ uri: getImageUrl(imageUri) }}


                                            style={{
                                                width: "100%",      // full width of parent
                                                aspectRatio: 1,     // makes height = width (square)
                                                borderRadius: 12,   // rounded corners (rounded-lg ≈ 12px)
                                            }}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <View className="items-center">
                                            <Icon name="image" size={48} color="#6b7280" />
                                            <Text className="text-gray-600 mt-2">Select an image</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row justify-between">
                                <TouchableOpacity
                                    onPress={() => setAddImageModalVisible(false)}
                                    className="flex-1 mr-2 bg-gray-200 py-3 rounded-lg items-center"
                                >
                                    <Text className="text-gray-800 font-bold">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={uploadImage}
                                    className="flex-1 ml-2 bg-blue-500 py-3 rounded-lg items-center"
                                >
                                    <Text className="text-white font-bold">Upload Image</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <ProductReviews
                    reviews={reviews}
                    averageRating={averageRating}
                    totalReviews={totalReviews}
                />
            </ScrollView>


            {
                total === 0 ? null : (
                    <Pressable
                        className="bg-[#00A877] w-[90%] p-3 mx-auto mb-1 absolute left-5 bottom-1 rounded-lg"
                    >
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-lg font-bold text-white">
                                    {cart.length} items | {total}
                                </Text>
                                <Text className="font-normal text-sm mt-1 text-white">
                                    Delivery Charges May Apply
                                </Text>
                            </View>
                            <Pressable onPress={() => navigation.navigate("ViewCartScreen", { name: "data.name" })}>
                                <Text className="text-xl font-medium text-white">
                                    View Cart
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                )
            }
        </>

    );
};

export default ProductView;

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.2)", // bg-black bg-opacity-20
        justifyContent: "center", // flex + justify-center
        alignItems: "center", // items-center
    },
});
