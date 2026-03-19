import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import ProductList from "./ProductList";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import { Image } from "expo-image";
import { useDispatch } from "react-redux";
import {
  addToCart,
  decrementQuantity,
  incrementQuantity,
  removeFromCart,
} from "../Redux/CartReducer";
const TypeListDetails = ({ item }) => {
  const { setLoading } = useLoading();
  const [data, setData] = useState([]);
  const [ref, setrefresh] = useState(0);
  const dispatch = useDispatch();


  const GetProductsData = async (id) => {
    setLoading(true, "Fetching Products");
    try {
      //.log("Product/Type/" + id);
      // const Data = await API.GET("Products_new/Type/" + id);
      const Data = await API.GET("Products_new/ProductsWithAllDataForType/" + id);
      if (Data?.Response?.length > 0) {
        setData(Data.Response);
        // setMenuItems(Data.Response); // <- remove if not defined
        //console.log(Data.Response);
      } else {
        setData([]);
        console.warn("No Types data found for menu ID:", id);
      }
    } catch (error) {
      console.error("Error fetching Type data:", error);
      Alert.alert("Error", "Failed to fetch menu Types.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item?.transid) {
      GetProductsData(item.transid);
    }
  }, [item?.transid, ref]);

  if (!item) {
    return (
      <View>
        <Text className="text-xl font-semibold text-center mt-10 text-gray-600">
          No Product Type Exists..
        </Text>
      </View>
    );
  }

  return (
    <View className="">
      <ProductList
        type={item}
        products={data}
        onAdd={(p) => {
          console.log("Added Product : ", p)
          alert(`Added ${p.transid}`)
          dispatch(addToCart(p));
        }}
        setrefresh={setrefresh}
      />
    </View>
  );
};

export default TypeListDetails;

const styles = StyleSheet.create({});
