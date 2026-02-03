import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import ProductDetail from "./ProductDetail";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";

export default function ProductScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { setLoading } = useLoading();
  const { prod } = route.params;

 

  const Delete = async (productid) => {
    try {
      setLoading(true, "Deleting Product");
      const del = await API.DELETE("Product", {
        transid: productid,
      });
      console.log(del);
      setLoading(false);
      Alert.alert("Message", del.Response);
      nav.goBack();
    } catch (error) {
      console.error("Error Deleting Product:", error);
      Alert.alert("Error", "Failed to Delete Product.");
    } finally {
      setLoading(false);
    }
  };

  const Update = async (productdata) => {
    try {
      setLoading(true, "Updating Product");
      console.log(productdata, "Product");
      const res = await API.PUT("Product", productdata);

      console.log(res);
      Alert.alert("Message", res.Response);
      // nav.goBack();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  async function handleUpdate(updated) {
    await Update(updated);
    // })
  }

  function handleDelete(id) {
    Alert.alert("Confirm delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await Delete(id);
        },
      },
    ]);
  }

  return (
    <ProductDetail
      product={prod}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
