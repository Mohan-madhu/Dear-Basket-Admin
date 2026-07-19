// ProductList.js
import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Button,
} from "react-native";
import ProductCard from "./ProductCard";
import { useNavigation } from "@react-navigation/native";
import Storage from "../../App_Utils/Services/StorageService";
import { Image } from "expo-image";
export default function ProductList({ type, products, onAdd, setrefresh, searchQuery = "" }) {
  const nav = useNavigation();
  const [ROLE, setROLE] = useState(null);
  //const ROLE = "ADMIN";
  const getRole = async () => {
    var ROLE = await Storage.getData("ROLE");
    // console.log(ROLE);
    setROLE(ROLE);
  };


  useEffect(() => {
    getRole();
  }, []);

  //console.log(ROLE)
  if (products.length < 1 && ROLE !== "ADMIN") {
    const isSearching = Boolean(searchQuery.trim());
    return (
      <View className="px-6 py-14 items-center">
        <Text className="text-xl font-semibold text-center text-gray-600">
          {isSearching ? "No matching products found" : "No Products Available..."}
        </Text>
        {isSearching ? (
          <Text className="text-sm text-gray-500 text-center mt-2">
            Try another product name, code, description, or variant.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <>
      {/* Add Section Button */}
      {ROLE == "ADMIN" && (
        <View className="m-1">
          <Button
            title="Add New Product"
            onPress={() => nav.navigate("Products_New", { typedata: type })}
          />
        </View>
      )}

      <View className="pb-0">
        <FlatList
          data={products}
          keyExtractor={(item) => item.productid}
          renderItem={({ item }) => <ProductCard product={item} onAdd={onAdd} setrefresh={setrefresh} />}
          numColumns={2}
          contentContainerStyle={{ padding: 0, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View className="h-72" />
          }
        />


      </View>


    </>
  );
}
