import React, { useEffect, useState } from "react";
import { Alert } from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import ProductDetail from "../Components/ProductDetail";
import ProductView from "../Components_New/ProductView";

export default function ProductAndVariantScreen() {
    const nav = useNavigation();
    const route = useRoute();
    const { setLoading } = useLoading();
    const { prod, selectedvariantid } = route.params;

    // console.log(prod);

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












    // const product = {
    //     productname: 'Premium Wireless Headphones',
    //     shortdescription: 'High-quality wireless headphones with noise cancellation',
    //     fulldescription: 'Experience premium sound quality with our latest wireless headphones. Featuring active noise cancellation, 30-hour battery life, and comfortable over-ear design. Perfect for music lovers and professionals alike.',
    //     isfeatured: true,
    //     productid:prod.productid
    // };

    const product = prod

    // const variants = [
    //     {
    //         variantid: '3FCE0519-8F94-4387-BD36-E44CCD29A418',
    //         variantname: 'Black Edition',
    //         images: [
    //               'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',

    //             'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'

    //         ],
    //         sku: 'SKU001',
    //         weight: 0.25,
    //         dimensions: '18x16x8 cm',
    //         packsize: 1,
    //         baseprice: 199.99,
    //         sellingprice: 179.99,
    //         discountpercentage: 10,
    //         stockquantity: 50,
    //     },
    //     {
    //         variantid: '2',
    //         variantname: 'Silver Edition',
    //         images: [
    //             'https://images.unsplash.com/photo-1593784991095-a205069470b6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1545127398-5aae47194b22?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1545127398-146d7df33533?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1545127398-5aae47194b22?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1545127398-146d7df33533?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    //         ],
    //         sku: 'SKU002',
    //         weight: 0.27,
    //         dimensions: '18x16x8 cm',
    //         packsize: 1,
    //         baseprice: 219.99,
    //         sellingprice: 199.99,
    //         discountpercentage: 9,
    //         stockquantity: 30,
    //     },
    //     {
    //         variantid: '3',
    //         variantname: 'Pro Bundle',
    //         images: [
    //             'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1593784991095-a205069470b6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1545127398-5aae47194b22?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    //             'https://images.unsplash.com/photo-1545127398-146d7df33533?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
    //         ],
    //         sku: 'SKU003',
    //         weight: 0.45,
    //         dimensions: '22x20x10 cm',
    //         packsize: 2,
    //         baseprice: 399.99,
    //         sellingprice: 349.99,
    //         discountpercentage: 12,
    //         stockquantity: 15,
    //     },
    // ];

    const variants = prod?.variants || [];
    return (
        <ProductView product={product} variants={variants} selectedvariantid={selectedvariantid} onUpdate={handleUpdate}
            onDelete={handleDelete} />
        // <ProductDetail
        //     product={prod}

        // />


    );
}
