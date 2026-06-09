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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import { useNavigation } from "@react-navigation/native";
import Storage from "../../App_Utils/Services/StorageService";
import { Image } from "expo-image";
function calcMrp(price, discount) {
  console.log(price, discount);
  if (!discount || discount <= 0) return price;
  return Math.round((price * 100) / (100 - discount));
}

export default function ProductDetail({ product, onUpdate, onDelete }) {
  const nav = useNavigation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...product });
  const [imageUri, setImageUri] = useState(product.image);

  const [fileInfo, setFileInfo] = useState(null);
  const [relatedProducts, setrelatedProducts] = useState([]);
  var mrp = calcMrp(product.price, product.discount);
  const [ROLE, setROLE] = useState(null);
  const { setLoading } = useLoading();
  function handleChange(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const pickImage = async () => {
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
      console.log(profilePath);
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
      //console.log(data, "Product");
      onUpdate(data);
    } catch (err) {
      console.log(err);
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
    setEditing(false);
  }
  const getRole = async () => {
    setImageUri(null);
    var ROLE = await Storage.getData("ROLE");
    setImageUri(product.image);
    console.log(ROLE);
    setROLE(ROLE);
  };

  useEffect(() => {
    getRole();
  }, [product.image]);
  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars = [];
    for (let i = 1; i < 5; i++) {
      if (i < full) stars.push("star");
      else if (i === full && half) stars.push("star-half-full");
      else stars.push("star-outline");
    }
    return stars.map((name, i) => (
      <Icon key={i} name={name} size={20} color="#fbbf24" />
    ));
  };

  const windowWidth = Dimensions.get("window").width;

  const getImageURI = () => {
    //console.log(imageUri);

    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    //console.log(getImageUrl(imageUri));
    return getImageUrl(imageUri);
  };
  console.log(getImageURI());

  const Get = async (id) => {
    setLoading(true, "Fetching Related Products");
    try {
      //console.log("Product/RelatedProducts/" + id);
      const Data = await API.GET("Product/RelatedProducts/" + id);
      if (Data?.Response?.length > 0) {
        setrelatedProducts(Data.Response);
        // setMenuItems(Data.Response); // <- remove if not defined
        // console.log(Data.Response);
      } else {
        setrelatedProducts([]);
        console.warn("No fetching Related Products found for", id);
      }
    } catch (error) {
      console.error("Error fetching Related Products data:", error);
      Alert.alert("Error", "Failed to fetch fetching Related Products.");
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

  const renderRelated = ({ item, nav }) => {
    var imageUri = item.image;
    const getImageURI = () => {
      //console.log(imageUri);
      if (!imageUri) return null;
      if (imageUri.startsWith("file://")) return imageUri;
      if (imageUri.startsWith("http")) return imageUri;
      //console.log(getImageUrl(imageUri));
      return getImageUrl(imageUri);
    };
    return (
      <TouchableOpacity
        style={{
          width: windowWidth * 0.3,
          marginRight: 12,
          backgroundColor: "#fff",
          borderRadius: 8,
          overflow: "hidden",
          elevation: 3,
        }}
        onPress={() => {
          nav.navigate("ProductScreen", { prod: item });
        }}
      >
        <Image  cachePolicy="memory-disk"
          source={
            getImageURI()
              ? { uri: getImageURI() }
              : require("../../assets/icon.png")
          }
          style={{ width: "100%", height: 100 }}
          contentFit="cover"
        />
        <View style={{ padding: 6 }}>
          <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: "600" }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 12, color: "#111", marginTop: 4 }}>
            ₹{item.price}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <ScrollView className="flex-1 bg-gray-100 p-4 pt-10">
      {/* IMAGE + PICKER */}
      <View className="relative bg-white rounded-lg overflow-hidden shadow-lg">
         <Image  cachePolicy="memory-disk"  
          source={
            getImageURI()
              ? { uri: getImageURI() }
              : require("../../assets/icon.png")
          }
          className="w-full h-64"
          style={{ height: 256 }}
          contentFit="cover"
        />
        {editing && (
          <TouchableOpacity
            onPress={pickImage}
            className="absolute top-2 right-2 bg-black bg-opacity-50 p-2 rounded-full"
          >
            <Icon name="camera-plus" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* DETAILS */}
      <View className="mt-4 bg-white rounded-lg p-4 shadow">
        {/* NAME */}
        {editing ? (
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-1">Name</Text>
            <TextInput
              value={draft.name}
              onChangeText={(txt) => handleChange("name", txt)}
              className="text-xl font-bold border-b border-gray-300 pb-1"
            />
          </View>
        ) : (
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {product.name}
          </Text>
        )}

        {/* DESCRIPTION */}
        {editing ? (
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-1">Description</Text>
            <TextInput
              value={draft.description}
              onChangeText={(txt) => handleChange("description", txt)}
              multiline
              className="text-base text-gray-700 border border-gray-300 rounded p-2 h-40"
            />
          </View>
        ) : product.description ? (
          <Text className="text-base text-gray-700 mb-4">
            {product.description}
          </Text>
        ) : null}

        {/* METRICS ROW */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-row items">
            <Icon name="cube-outline" size={18} color="#555" />
            {editing ? (
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">Quantity</Text>
                <TextInput
                  value={String(draft.quantity)}
                  onChangeText={(txt) => handleChange("quantity", txt)}
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            ) : (
              <Text className="ml-2 text-gray-700">{product.quantity}</Text>
            )}
          </View>

          <View className="flex-row items">
            <Icon name="star" size={18} color="#fbbf24" />
            {editing ? (
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">Rating</Text>
                <TextInput
                  value={String(draft.rating)}
                  onChangeText={(txt) =>
                    handleChange("rating", parseFloat(txt) || 0)
                  }
                  keyboardType=""
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            ) : (
              renderStars(product.rating)
            )}
          </View>
        </View>

        {/* STOCKS ROW */}
        <View className="flex-row justify-between mb-4">
          <View className="flex-row items">
            <Icon name="warehouse" size={18} color="#555" />
            {editing ? (
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">Stock</Text>
                <TextInput
                  value={String(draft.stock)}
                  onChangeText={(txt) =>
                    handleChange("stock", parseInt(txt, 10) || 0)
                  }
                  keyboardType="numeric"
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            ) : (
              <Text className="ml-2 text-gray-700">Stock: {product.stock}</Text>
            )}
          </View>

          <View className="flex-row items">
            <Icon name="shopping-outline" size={18} color="#555" />
            {editing ? (
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">In Stock</Text>
                <TextInput
                  value={String(draft.instock)}
                  onChangeText={(txt) =>
                    handleChange("instock", parseInt(txt, 10) || 0)
                  }
                  keyboardType="numeric"
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            ) : (
              <Text className="ml-2 text-gray-700">
                In Stock: {product.instock}
              </Text>
            )}
          </View>
        </View>

        <View className="mb-4">
          {editing ? (
            <>
              <View className="mb-2">
                <Text className="text-sm text-gray-600 mb-1">Price (₹)</Text>
                <TextInput
                  value={String(draft.price)}
                  onChangeText={(txt) =>
                    handleChange("price", parseFloat(txt) || 0)
                  }
                  keyboardType="numeric"
                  className="text-2xl font-bold border-b border-gray-300 pb-1"
                />
              </View>

              <View className="flex-row items">
                <Text className="text-sm text-gray-600 mr-2">Discount (%)</Text>
                <TextInput
                  value={String(draft.discount)}
                  onChangeText={(txt) =>
                    handleChange("discount", parseFloat(txt) || 0)
                  }
                  keyboardType="numeric"
                  className="text-base border-b border-gray-300 pb-1 w-16"
                />
                <Text className="text-sm text-gray-500 line-through ml-4">
                  ₹{mrp}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                ₹{product.price}
              </Text>
              {product.discount > 0 && (
                <View className="flex-row items">
                  <Text className="text-sm text-green-600 font-semibold">
                    {product.discount}% OFF
                  </Text>
                  <Text className="text-sm text-gray-500 line-through ml-4">
                    ₹{mrp}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {ROLE == "ADMIN" && (
          <View className="flex-row space-x-3">
            {editing ? (
              <>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 bg-green-600 py-3 mx-2 rounded-lg"
                >
                  <Text className="text-center text-white font-semibold">
                    Save
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancel}
                  className="flex-1 bg-gray-300 py-3 mx-2 rounded-lg"
                >
                  <Text className="text-center text-gray-700 font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setEditing(true)}
                  className="flex-1 bg-blue-600 py-3 mx-2 rounded-lg"
                >
                  <Text className="text-center text-white font-semibold">
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(product.transid)}
                  className="flex-1 bg-red-600 py-3 mx-2 rounded-lg"
                >
                  <Text className="text-center text-white font-semibold">
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <View className="mt-6">
          <Text className="text-lg font-semibold mb-3">Related Products</Text>
          <FlatList
            className="py-2"
            horizontal
            data={relatedProducts}
            keyExtractor={(item) => item.transid.toString()}
            renderItem={({ item }) => renderRelated({ item, nav: nav })}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 4 }}
          />
        </View>
      )}
    </ScrollView>
  );
}
