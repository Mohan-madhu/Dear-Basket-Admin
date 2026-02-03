// CreateProduct.js
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { Image } from 'expo-image';
function calcMrp(price, discount) {
  if (!discount || discount <= 0) return price;
  return Math.round((price * 100) / (100 - discount));
}

export default function NewProduct() {
  const { setLoading } = useLoading();
  const nav = useNavigation();
  const route = useRoute();
  const { typedata } = route.params;
  //console.log(typedata)
  const [imageUri, setImageUri] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    quantity: "",
    rating: 0,
    stock: 0,
    instock: 0,
    price: 0,
    discount: 0,
    image: null,
  });
  const [saving, setSaving] = useState(false);
  const mrp = calcMrp(draft.price, draft.discount);
  const windowWidth = Dimensions.get("window").width;

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
    setFileInfo(file);
  };

  const getImageURI = () => {
    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    return "https://dev.dine360.ca/backend/" + imageUri.replace(/^\/+/, "").slice(2);
  };

  async function handleCreate() {
    setSaving(true);
    try {
      await Insert(draft);
    } finally {
      setSaving(false);
    }
  }

  const Insert = async (draft) => {
    try {
      let profilePath = "";
      try {
        if (fileInfo) {
          setLoading(true, "Uploading Product Image");
          const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
            path: "Product",
          });
          profilePath = uploadRes.virtualPath;
          setFileInfo(null);
        } else {
          profilePath = "No File Uploaded";
        }
      } catch {
        profilePath = "File Not Uploaded";
      } finally {
        setLoading(false);
      }

      setLoading(true, "Adding New Product");
      const data = {
        image: profilePath,
        name: draft.name,
        description: draft.description,
        quantity: draft.quantity,
        stock: draft.stock,
        instock: draft.instock,
        price: draft.price,
        discount: draft.discount,
        rating: draft.rating,
        typename: typedata.name,
        typeid: typedata.transid,
        categoryname: typedata.categoryname,
        categoryid: typedata.categoryid,
        sectionid: typedata.sectionid,
        sectionname: typedata.sectionname,
        menuid: typedata.menuname,
        menuname: typedata.menuid,
        rcu: "ADMIN",
      };
      //console.log(data, "Type Menu");
      const { Response } = await API.POST("Product", data);
nav.goBack();
      console.log(Response);
      if (Response === "Successfully Inserted") {
       // nav.goBack();
      }
      //   //fetchData();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
    setImageUri(null);
  };

  const Cancel = () => {
    console.log("Cancelled");
    nav.goBack();
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text
        className="text-center mt-4"
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 16,
        }}
      >
        New Product
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGE + PICKER */}
        <View className=" bg-white rounded-lg overflow-hidden shadow-lg">
          {/* <Image  cachePolicy="disk"
          source={
            draft.image
              ? { uri: draft.image }
              : require("../../assets/icon.png")
          }
          className="w-full h-64"
          resizeMode="cover"
        />
        <TouchableOpacity
          onPress={pickImage}
          className="absolute top-2 right-2 bg-black bg-opacity-50 p-2 rounded-full"
        >
          <Icon name="camera-plus" size={24} color="#fff" />
        </TouchableOpacity> */}

          <TouchableOpacity
            className=" rounded-md aspect-square w-full mb-4 justify-center items-center"
            onPress={pickImage}
          >
            {getImageURI() ? (
              <Image  cachePolicy="disk"
                source={{ uri: getImageURI() }}
                className="w-full h-full rounded-md"
                  style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Text>Select Product Image</Text>
            )}
          </TouchableOpacity>
        </View>
        {/* FORM FIELDS */}
        <View className="mt-4 bg-white rounded-lg p-4 shadow">
          {/* NAME */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-1">Name</Text>
            <TextInput
              placeholder="Product Name"
              value={draft.name}
              onChangeText={(txt) => handleChange("name", txt)}
              className="text-xl font-bold border-b border-gray-300 pb-1"
            />
          </View>

          {/* DESCRIPTION */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-1">Description</Text>
            <TextInput
              placeholder="Short description"
              value={draft.description}
              onChangeText={(txt) => handleChange("description", txt)}
              multiline
              className="text-base text-gray-700 border border-gray-300 rounded p-2"
            />
          </View>

          {/* QUANTITY & RATING */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-row ">
              <Icon name="cube-outline" size={18} color="#555" />
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">Quantity</Text>
                <TextInput
                  placeholder="e.g. 4 x 125 g"
                  value={draft.quantity}
                  onChangeText={(txt) => handleChange("quantity", txt)}
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            </View>
            <View className="flex-row ">
              <Icon name="star" size={18} color="#fbbf24" />
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">Rating</Text>
                <TextInput
                  placeholder="0–5"
                  // value={String(draft.rating)}
                  onChangeText={(txt) =>
                    handleChange("rating", parseFloat(txt) || 0)
                  }
                  keyboardType="numeric"
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            </View>
          </View>

          {/* STOCK & INSTOCK */}
          <View className="flex-row justify-between mb-4">
            <View className="flex-row ">
              <Icon name="warehouse" size={18} color="#555" />
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">Stock</Text>
                <TextInput
                  placeholder="Total stock"
                  //value={String(draft.stock)}
                  onChangeText={(txt) =>
                    handleChange("stock", parseInt(txt, 10) || 0)
                  }
                  keyboardType="numeric"
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            </View>
            <View className="flex-row ">
              <Icon name="shopping-outline" size={18} color="#555" />
              <View className="ml-2">
                <Text className="text-sm text-gray-600 mb-1">In Stock</Text>
                <TextInput
                  placeholder="Available"
                  // value={String(draft.instock)}
                  onChangeText={(txt) =>
                    handleChange("instock", parseInt(txt, 10) || 0)
                  }
                  keyboardType="numeric"
                  className="border-b border-gray-300 pb-1 w-20"
                />
              </View>
            </View>
          </View>

          {/* PRICE & DISCOUNT */}
          <View className="mb-4">
            <View className="mb-2">
              <Text className="text-sm text-gray-600 mb-1">Price (₹)</Text>
              <TextInput
                placeholder="0.00"
                //value={String(draft.price)}
                onChangeText={(txt) =>
                  handleChange("price", parseFloat(txt) || 0)
                }
                keyboardType="numeric"
                className="text-2xl font-bold border-b border-gray-300 pb-1"
              />
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-600 mr-2">Discount (%)</Text>
              <TextInput
                placeholder="0"
                // value={String(draft.discount)}
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
          </View>

          {/* ACTIONS */}
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={handleCreate}
              className={`flex-1 py-3 rounded-lg mx-3 ${
                saving ? "bg-gray-400" : "bg-green-600"
              }`}
              disabled={saving}
            >
              <Text className="text-center text-white font-semibold">
                {saving ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={Cancel}
              className="flex-1 bg-gray-300 py-3 mx-3 rounded-lg"
            >
              <Text className="text-center text-gray-700 font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
