import { Alert, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
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
const getSearchText = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return [
    product?.productname,
    product?.productcode,
    product?.shortdescription,
    product?.fulldescription,
    product?.typename,
    product?.categoryname,
    product?.sectionname,
    product?.menuname,
    ...variants.flatMap((variant) => [
      variant?.variantname,
      variant?.sku,
      variant?.sellingprice,
      variant?.baseprice,
      variant?.packsize,
      variant?.weight,
    ]),
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
};

const TypeListDetails = ({ item, searchQuery = "" }) => {
  const { setLoading } = useLoading();
  const [data, setData] = useState([]);
  const [ref, setrefresh] = useState(0);
  const dispatch = useDispatch();


  const GetProductsData = async (id) => {
    if (!id) {
      setData([]);
      return;
    }
    setLoading(true, "Fetching Products");
    try {
      //.log("Product/Type/" + id);
      // const Data = await API.GET("Products_new/Type/" + id);
      const Data = await API.GET("Products_new/ProductsWithAllDataForType/" + id);
      const products = Array.isArray(Data?.Response) ? Data.Response : [];
      if (products.length > 0) {
        setData(products);
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

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;
    return data.filter((product) => getSearchText(product).includes(query));
  }, [data, searchQuery]);

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
        products={filteredProducts}
        searchQuery={searchQuery}
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
