// ProductDetail.js
import React, { useEffect, useState } from "react";
import { getImageUrl } from "../../config";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  FadeIn,
  SlideInUp,
  ZoomIn,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import { useNavigation } from "@react-navigation/native";
import Storage from "../../App_Utils/Services/StorageService";
import { Image } from "expo-image";
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function calcMrp(price, discount) {
  if (!discount || discount <= 0) return price;
  return Math.round((price * 100) / (100 - discount));
}

export default function ProductDetail({ 
  product, 
  onUpdate, 
  onDelete, 
  onAdd, 
  onIncrement, 
  onDecrement, 
  cartQuantity = 0 
}) {
  const nav = useNavigation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...product });
  const [imageUri, setImageUri] = useState(product.image);
  const [fileInfo, setFileInfo] = useState(null);
  const [relatedProducts, setrelatedProducts] = useState([]);
  const [ROLE, setROLE] = useState(null);
  
  const { setLoading } = useLoading();
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  // Animation values
  const scrollY = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const controlsOpacity = useSharedValue(cartQuantity > 0 ? 1 : 0);
  const addButtonOpacity = useSharedValue(cartQuantity > 0 ? 0 : 1);
  const controlsTranslateX = useSharedValue(cartQuantity > 0 ? 0 : 50);

  var mrp = calcMrp(product.price, product.discount);

  function handleChange(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

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
      handleChange("image", file.uri);
      setFileInfo(file);
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const Update = async (draft) => {
    try {
      var profilePath = "";
      try {
        if (fileInfo) {
          setLoading(true, "Updating Product Image");
          const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
            path: "Product",
          });
          profilePath = uploadRes.virtualPath;
          setFileInfo(null);
        } else {
          profilePath = imageUri;
        }
      } catch (e) {
        console.log(e);
        profilePath = "File Not Uploaded";
      } finally {
        setLoading(false);
      }
      
      setLoading(true, "Updating Product");
      const data = {
        transid: draft.transid,
        image: profilePath,
        name: draft.name,
        description: draft.description,
        quantity: draft.quantity,
        stock: draft.stock,
        instock: draft.instock,
        price: draft.price,
        discount: draft.discount,
        rating: draft.rating,
        luu: "ADMIN",
      };
      onUpdate(data);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  function handleSave() {
    Update(draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft({ ...product });
    setImageUri(product.image);
    setFileInfo(null);
    setEditing(false);
  }

  const getRole = async () => {
    try {
      var ROLE = await Storage.getData("ROLE");
      setROLE(ROLE);
    } catch (error) {
      console.log("Error getting role:", error);
    }
  };

  useEffect(() => {
    getRole();
    setImageUri(product.image);
    setDraft({ ...product });
  }, [product]);

  // Update animation values when cartQuantity changes
  useEffect(() => {
    if (cartQuantity > 0) {
      addButtonOpacity.value = withTiming(0, { duration: 200 });
      controlsOpacity.value = withTiming(1, { duration: 300 });
      controlsTranslateX.value = withSpring(0, { damping: 15 });
    } else {
      controlsOpacity.value = withTiming(0, { duration: 200 });
      controlsTranslateX.value = withTiming(50, { duration: 200 });
      addButtonOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [cartQuantity]);

  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= full) stars.push("star");
      else if (i === full + 1 && half) stars.push("star-half-full");
      else stars.push("star-outline");
    }
    return stars.map((name, i) => (
      <Icon key={i} name={name} size={18} color="#F59E0B" />
    ));
  };

  const getImageURI = () => {
    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    return getImageUrl(imageUri);
  };

  const Get = async (id) => {
    setLoading(true, "Fetching Related Products");
    try {
      const Data = await API.GET("Product/RelatedProducts/" + id);
      if (Data?.Response?.length > 0) {
        setrelatedProducts(Data.Response);
      } else {
        setrelatedProducts([]);
      }
    } catch (error) {
      console.error("Error fetching Related Products data:", error);
      setrelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product?.categoryid) {
      Get(product.categoryid);
    }
  }, [product?.categoryid]);

  // Cart action handlers
  const handleAddToCart = () => {
    if (product.instock === 0) return;
    
    buttonScale.value = withSpring(0.9, { duration: 100 }, () => {
      buttonScale.value = withSpring(1);
    });
    
    onAdd(product);
  };

  const handleIncrement = () => {
    buttonScale.value = withSpring(0.95, { duration: 100 }, () => {
      buttonScale.value = withSpring(1);
    });
    onIncrement(product);
  };

  const handleDecrement = () => {
    buttonScale.value = withSpring(0.95, { duration: 100 }, () => {
      buttonScale.value = withSpring(1);
    });
    
    onDecrement(product);
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(product.transid) }
      ]
    );
  };

  // Animated styles
  const headerAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 100],
          [0, -50],
          'clamp'
        ),
      },
    ],
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.8], 'clamp'),
  }));

  const addButtonAnimStyle = useAnimatedStyle(() => ({
    opacity: addButtonOpacity.value,
    transform: [
      { scale: buttonScale.value },
      { translateX: interpolate(addButtonOpacity.value, [0, 1], [20, 0]) }
    ],
  }));

  const controlsAnimStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    transform: [
      { translateX: controlsTranslateX.value },
      { scale: interpolate(controlsOpacity.value, [0, 1], [0.8, 1]) }
    ],
  }));

  const renderRelated = ({ item }) => {
    const relatedImageUri = item.image;
    const getRelatedImageURI = () => {
      if (!relatedImageUri) return null;
      if (relatedImageUri.startsWith("file://")) return relatedImageUri;
      if (relatedImageUri.startsWith("http")) return relatedImageUri;
      return getImageUrl(relatedImageUri);
    };

    const relatedMrp = calcMrp(item.price, item.discount);

    return (
      <TouchableOpacity
        style={{
          width: windowWidth * 0.4,
          marginRight: 16,
          backgroundColor: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }}
        onPress={() => nav.navigate("ProductScreen", { prod: item })}
      >
        <Image
          cachePolicy="memory-disk"
          source={
            getRelatedImageURI()
              ? { uri: getRelatedImageURI() }
              : require("../../assets/icon.png")
          }
          style={{ width: "100%", height: 120 }}
          contentFit="cover"
          transition={300}
        />
        <View style={{ padding: 12 }}>
          <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: "600", color: '#1f2937' }}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#059669' }}>
              ₹{item.price}
            </Text>
            {item.discount > 0 && (
              <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600' }}>
                  {item.discount}% OFF
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      showsVerticalScrollIndicator={false}
      onScroll={(e) => {
        scrollY.value = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HERO IMAGE SECTION */}
      <AnimatedView style={headerAnimStyle}>
        <View style={{ height: windowHeight * 0.5, position: 'relative' }}>
          <Image
            cachePolicy="disk"
            source={
              getImageURI()
                ? { uri: getImageURI() }
                : require("../../assets/icon.png")
            }
            style={{ 
              width: windowWidth, 
              height: windowHeight * 0.5,
            }}
            contentFit="cover"
            transition={500}
          />
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          {/* Floating Action Buttons */}
          <View style={{ 
            position: 'absolute', 
            top: StatusBar.currentHeight + 16 || 44, 
            left: 16, 
            right: 16, 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <TouchableOpacity
              onPress={() => nav.goBack()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 12,
                borderRadius: 50,
              }}
            >
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            
            {editing && (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: 12,
                  borderRadius: 50,
                }}
              >
                <Icon name="camera-plus" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stock Status Badge */}
          <View style={{ position: 'absolute', top: StatusBar.currentHeight + 80 || 108, right: 16 }}>
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 50,
              backgroundColor: product.instock > 0 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                {product.instock > 0 ? `${product.instock} In Stock` : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Discount Badge */}
          {product.discount > 0 && (
            <View style={{ position: 'absolute', bottom: 16, left: 16 }}>
              <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                  {product.discount}% OFF
                </Text>
              </View>
            </View>
          )}
        </View>
      </AnimatedView>

      {/* MAIN CONTENT */}
      <AnimatedView 
        entering={SlideInUp.delay(300)}
        style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          marginTop: -24,
          position: 'relative',
          zIndex: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
          minHeight: windowHeight * 0.6
        }}
      >
        <View style={{ padding: 24 }}>
          {/* PRODUCT NAME & RATING */}
          <View style={{ marginBottom: 24 }}>
            {editing ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: '500' }}>Product Name</Text>
                <TextInput
                  value={draft.name}
                  onChangeText={(txt) => handleChange("name", txt)}
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    borderWidth: 2,
                    borderColor: '#e5e7eb',
                    borderRadius: 12,
                    padding: 16,
                    backgroundColor: '#f9fafb'
                  }}
                  placeholder="Enter product name"
                />
              </View>
            ) : (
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 12, lineHeight: 40 }}>
                {product.name}
              </Text>
            )}

            {/* Rating & Reviews */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fef3c7',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 50
              }}>
                {renderStars(product.rating)}
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#b45309', marginLeft: 8 }}>
                  {product.rating.toFixed(1)}
                </Text>
              </View>
              
              <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50 }}>
                <Text style={{ color: '#1d4ed8', fontWeight: '600' }}>{product.quantity}</Text>
              </View>
            </View>
          </View>

          {/* PRICE SECTION */}
          <AnimatedView entering={ZoomIn.delay(400)} style={{ marginBottom: 32 }}>
            {editing ? (
              <View style={{ backgroundColor: '#f9fafb', padding: 24, borderRadius: 16 }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, color: '#374151', marginBottom: 8, fontWeight: '600' }}>Price (₹)</Text>
                  <TextInput
                    value={String(draft.price)}
                    onChangeText={(txt) => handleChange("price", parseFloat(txt) || 0)}
                    keyboardType="numeric"
                    style={{
                      fontSize: 32,
                      fontWeight: 'bold',
                      borderWidth: 2,
                      borderColor: '#e5e7eb',
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: 'white'
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, color: '#374151', marginRight: 16, fontWeight: '600' }}>Discount (%)</Text>
                  <TextInput
                    value={String(draft.discount)}
                    onChangeText={(txt) => handleChange("discount", parseFloat(txt) || 0)}
                    keyboardType="numeric"
                    style={{
                      fontSize: 20,
                      borderWidth: 2,
                      borderColor: '#e5e7eb',
                      borderRadius: 12,
                      padding: 12,
                      width: 96,
                      backgroundColor: 'white',
                      textAlign: 'center'
                    }}
                  />
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={['#ecfdf5', '#d1fae5']}
                style={{
                  padding: 24,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: '#bbf7d0'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#047857', marginBottom: 8 }}>
                      ₹{product.price}
                    </Text>
                    {product.discount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 20,
                          color: '#6b7280',
                          textDecorationLine: 'line-through',
                          marginRight: 12
                        }}>
                          ₹{mrp}
                        </Text>
                        <Text style={{ fontSize: 18, color: '#059669', fontWeight: 'bold' }}>
                          Save ₹{mrp - product.price}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            )}
          </AnimatedView>

          {/* DESCRIPTION */}
          {editing ? (
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, color: '#374151', marginBottom: 12, fontWeight: '600' }}>Description</Text>
              <TextInput
                value={draft.description}
                onChangeText={(txt) => handleChange("description", txt)}
                multiline
                style={{
                  fontSize: 16,
                  color: '#374151',
                  borderWidth: 2,
                  borderColor: '#e5e7eb',
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: '#f9fafb',
                  minHeight: 120,
                  textAlignVertical: 'top'
                }}
                placeholder="Enter product description"
              />
            </View>
          ) : product.description ? (
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>Description</Text>
              <Text style={{
                fontSize: 16,
                color: '#374151',
                lineHeight: 24,
                backgroundColor: '#f9fafb',
                padding: 16,
                borderRadius: 16
              }}>
                {product.description}
              </Text>
            </View>
          ) : null}

          {/* PRODUCT DETAILS GRID */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>Product Details</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {/* Stock Info */}
              <View style={{
                backgroundColor: '#dbeafe',
                padding: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                flex: 0.48
              }}>
                <Icon name="warehouse" size={24} color="#3B82F6" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  {editing ? (
                    <TextInput
                      value={String(draft.stock)}
                      onChangeText={(txt) => handleChange("stock", parseInt(txt, 10) || 0)}
                      keyboardType="numeric"
                      style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#1d4ed8',
                        borderBottomWidth: 1,
                        borderBottomColor: '#93c5fd',
                        paddingBottom: 4
                      }}
                    />
                  ) : (
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1d4ed8' }}>{product.stock}</Text>
                  )}
                  <Text style={{ fontSize: 14, color: '#2563eb' }}>Total Stock</Text>
                </View>
              </View>

              {/* Available Stock */}
              <View style={{
                backgroundColor: '#dcfce7',
                padding: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                flex: 0.48
              }}>
                <Icon name="check-circle" size={24} color="#10B981" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  {editing ? (
                    <TextInput
                      value={String(draft.instock)}
                      onChangeText={(txt) => handleChange("instock", parseInt(txt, 10) || 0)}
                      keyboardType="numeric"
                      style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#059669',
                        borderBottomWidth: 1,
                        borderBottomColor: '#86efac',
                        paddingBottom: 4
                      }}
                    />
                  ) : (
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{product.instock}</Text>
                  )}
                  <Text style={{ fontSize: 14, color: '#16a34a' }}>Available</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ADD TO CART SECTION */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ height: 64, position: 'relative' }}>
              {/* Add Button */}
              <AnimatedView style={[addButtonAnimStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                <TouchableOpacity
                  disabled={product.instock === 0}
                  onPress={handleAddToCart}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                    backgroundColor: product.instock === 0 ? "#d1d5db" : "#10b981"
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
                    {product.instock === 0 ? "OUT OF STOCK" : "ADD TO CART"}
                  </Text>
                </TouchableOpacity>
              </AnimatedView>

              {/* Quantity Controls */}
              <AnimatedView style={[controlsAnimStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
                <View style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  borderRadius: 16,
                  borderWidth: 3,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4
                }}>
                  <TouchableOpacity
                    onPress={handleDecrement}
                    style={{
                      flex: 1,
                      backgroundColor: '#fef2f2',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}
                  >
                    <Icon name="minus" size={28} color="#EF4444" />
                  </TouchableOpacity>
                  
                  <LinearGradient
                    colors={['#ecfdf5', '#d1fae5']}
                    style={{
                      paddingHorizontal: 32,
                      paddingVertical: 16,
                      minWidth: 96,
                      alignItems: 'center',
                      borderLeftWidth: 2,
                      borderRightWidth: 2,
                      borderColor: '#bbf7d0'
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#047857' }}>
                      {cartQuantity}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#059669', fontWeight: '500' }}>In Cart</Text>
                  </LinearGradient>
                  
                  <TouchableOpacity
                    onPress={handleIncrement}
                    style={{
                      flex: 1,
                      backgroundColor: '#ecfdf5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}
                  >
                    <Icon name="plus" size={28} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </AnimatedView>
            </View>
          </View>

          {/* ADMIN CONTROLS */}
          {ROLE === "ADMIN" && (
            <AnimatedView entering={SlideInUp.delay(600)} style={{ marginBottom: 32 }}>
              <View style={{ backgroundColor: '#f9fafb', padding: 24, borderRadius: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 }}>Admin Controls</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {editing ? (
                    <>
                      <TouchableOpacity
                        onPress={handleSave}
                        style={{
                          flex: 0.48,
                          backgroundColor: '#10b981',
                          paddingVertical: 16,
                          borderRadius: 12,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3
                        }}
                      >
                        <Text style={{ textAlign: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                          Save Changes
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancel}
                        style={{
                          flex: 0.48,
                          backgroundColor: '#d1d5db',
                          paddingVertical: 16,
                          borderRadius: 12
                        }}
                      >
                        <Text style={{ textAlign: 'center', color: '#374151', fontWeight: 'bold', fontSize: 18 }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => setEditing(true)}
                        style={{
                          flex: 0.48,
                          backgroundColor: '#3b82f6',
                          paddingVertical: 16,
                          borderRadius: 12,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3
                        }}
                      >
                        <Text style={{ textAlign: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                          Edit Product
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleDeletePress}
                        style={{
                          flex: 0.48,
                          backgroundColor: '#ef4444',
                          paddingVertical: 16,
                          borderRadius: 12,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3
                        }}
                      >
                        <Text style={{ textAlign: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </AnimatedView>
          )}
        </View>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <AnimatedView entering={SlideInUp.delay(700)} style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 24 }}>You Might Also Like</Text>
            <FlatList
              horizontal
              data={relatedProducts}
              keyExtractor={(item) => item.transid.toString()}
              renderItem={renderRelated}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 4, paddingRight: 20 }}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            />
          </AnimatedView>
        )}
      </AnimatedView>
    </ScrollView>
  );
}