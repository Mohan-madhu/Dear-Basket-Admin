import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, Switch } from 'react-native';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import { useNavigation, useRoute } from '@react-navigation/native';
import Storage from '../../App_Utils/Services/StorageService';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const VariantEditScreen = () => {
    const { setLoading } = useLoading();
    const navigation = useNavigation();
    const route = useRoute();
    const { variant, product, productAttributesold, variantAttributesold } = route.params;

    const [variantData, setVariantData] = useState(variant);
    const [productAttributes, setProductAttributes] = useState(productAttributesold);
    const [variantAttributes, setVariantAttributes] = useState(variantAttributesold);
    const [images, setImages] = useState([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadVariantDetails();
        loadAttributes();
        loadImages();
    }, []);

    const loadVariantDetails = async () => {
        // try {
        //     setLoading(true, 'Loading variant details...');
        //     // Fetch complete variant data if needed
        //     const response = await API.GET(`ProductVariant/${variant.variantid}`);
        //     if (response) {
        //         setVariantData(response);
        //     }
        // } catch (error) {
        //     Alert.alert('Error', 'Failed to load variant details');
        // } finally {
        //     setLoading(false);
        // }
    };

    const loadAttributes = async () => {
        // setProductAttributes(prodAttrs || []);
        // setVariantAttributes(varAttrs || []);
        // try {
        //   // Load product attributes
        //   const prodAttrs = await API.GET(`ProductAttributes/${product.productid}/global`);
        //   setProductAttributes(prodAttrs || []);

        //   // Load variant attributes
        //   const varAttrs = await API.GET(`ProductAttributes/${product.productid}/${variant.variantid}`);
        //   setVariantAttributes(varAttrs || []);
        // } catch (error) {
        //   console.error('Error loading attributes:', error);
        // }
    };

    const loadImages = async () => {
        // try {
        //     const variantImages = await API.GET(`ProductImages/${product.productid}/${variant.variantid}`);
        //     setImages(variantImages || []);
        // } catch (error) {
        //     console.error('Error loading images:', error);
        // }
    };

    const handleInputChange = (field, value) => {
        setVariantData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAttributeChange = (attributeId, newValue, isVariantAttribute = true) => {
        if (isVariantAttribute) {
            setVariantAttributes(prev => prev.map(attr =>
                attr.attributeid === attributeId ? { ...attr, attributevalue: newValue } : attr
            ));
        } else {
            setProductAttributes(prev => prev.map(attr =>
                attr.attributeid === attributeId ? { ...attr, attributevalue: newValue } : attr
            ));
        }
    };

    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["image/*"],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const file = {
                uri: result.assets[0].uri,
                name: result.assets[0].name,
                type: result.assets[0].mimeType,
            };

            await uploadImage(file);
        } catch (error) {
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const uploadImage = async (file) => {
        try {
            setLoading(true, "Uploading image...");
            const USER = await Storage.getData("USER");

            const uploadRes = await API.UPLOAD("FileUpload", file, {
                path: "ProductVariant",
            });

            const imageData = {
                productid: product.productid,
                variantid: variant.variantid,
                imageurl: uploadRes.virtualPath,
                imagetype: "Additional",
                sortorder: images.length,
                isactive: 1,
                rcu: USER,
            };

            await API.POST("ProductImages", imageData);
            await loadImages(); // Reload images
            Alert.alert("Success", "Image uploaded successfully");
        } catch (error) {
            Alert.alert("Error", "Failed to upload image");
        } finally {
            setLoading(false);
        }
    };

    const setAsMainImage = async (image) => {
        try {
            setLoading(true, "Setting main image...");
            const USER = await Storage.getData("USER");

            // Update all images to not be main
            await API.PUT(`ProductImages/${product.productid}/${variant.variantid}/set-main`, {
                imageid: image.imageid,
                rcu: USER
            });

            await loadImages();
            Alert.alert("Success", "Main image updated");
        } catch (error) {
            Alert.alert("Error", "Failed to set main image");
        } finally {
            setLoading(false);
        }
    };

    const deleteImage = async (image) => {
        try {
            Alert.alert(
                "Confirm Delete",
                "Are you sure you want to delete this image?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            setLoading(true, "Deleting image...");
                            await API.DELETE(`ProductImages/${image.imageid}`);
                            await loadImages();
                            Alert.alert("Success", "Image deleted");
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to delete image");
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!variantData.variantname?.trim()) {
            newErrors.variantname = 'Variant name is required';
        }
        if (!variantData.baseprice) {
            newErrors.baseprice = 'Base price is required';
        }
        if (!variantData.sellingprice) {
            newErrors.sellingprice = 'Selling price is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveChanges = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true, "Saving changes...");
            const USER = await Storage.getData("USER");

            // Update variant basic info
            await API.PUT(`ProductVariant/${variant.variantid}`, {
                ...variantData,
                luu: USER
            });

            // Update variant attributes
            for (const attr of variantAttributes) {
                await API.PUT(`ProductAttributes/${attr.attributeid}`, {
                    attributevalue: attr.attributevalue,
                    luu: USER
                });
            }

            Alert.alert("Success", "Variant updated successfully");
            navigation.goBack();
        } catch (error) {
            Alert.alert("Error", "Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    const AttributeSection = ({ title, attributes, editable = false }) => (
        <View className="mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">{title}</Text>
            <View className="bg-gray-50 rounded-lg p-4">
                {attributes.map((attr, index) => (
                    <View key={attr.attributeid} className={`flex-row justify-between items-center py-3 ${index < attributes.length - 1 ? 'border-b border-gray-200' : ''}`}>
                        <Text className="text-gray-600 font-medium flex-1 capitalize">
                            {attr.attributename.replace(/_/g, ' ')}
                        </Text>
                        {editable ? (
                            <TextInput
                                value={attr.attributevalue}
                                onChangeText={(text) => handleAttributeChange(attr.attributeid, text, editable)}
                                className="text-gray-800 font-normal flex-1 text-right bg-white border border-gray-300 rounded px-2 py-1"
                            />
                        ) : (
                            <Text className="text-gray-800 font-normal flex-1 text-right">
                                {attr.attributevalue}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white p-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-800">Edit Variant</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                        <Icon name={isEditing ? "check" : "pencil"} size={24} color="#3B82F6" />
                    </TouchableOpacity>
                </View>
                <Text className="text-gray-600 text-center mt-2">{product.productname}</Text>
                <Text className="text-blue-600 font-semibold text-center">{variantData.variantname}</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Images Section */}
                <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Images</Text>

                    {/* Main Image */}
                    {images.length > 0 && (
                        <View className="mb-4">
                            <Image
                                source={{ uri: images[selectedImageIndex]?.imageurl }}
                                className="w-full h-64 rounded-lg mb-2"
                                resizeMode="contain"
                            />
                            <Text className="text-sm text-gray-600 text-center">
                                {selectedImageIndex + 1} of {images.length}
                            </Text>
                        </View>
                    )}

                    {/* Thumbnails */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        {images.map((image, index) => (
                            <TouchableOpacity
                                key={image.imageid}
                                onPress={() => setSelectedImageIndex(index)}
                                className={`mr-2 p-1 ${selectedImageIndex === index ? 'border-2 border-blue-500 rounded' : ''}`}
                            >
                                <Image
                                    source={{ uri: image.imageurl }}
                                    className="w-16 h-16 rounded"
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            onPress={pickImage}
                            className="w-16 h-16 bg-gray-100 rounded justify-center items-center border border-dashed border-gray-300"
                        >
                            <Icon name="plus" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Image Actions */}
                    {images.length > 0 && (
                        <View className="flex-row justify-between">
                            <TouchableOpacity
                                onPress={() => setAsMainImage(images[selectedImageIndex])}
                                className="flex-row items-center bg-blue-100 px-3 py-2 rounded"
                            >
                                <Icon name="star" size={16} color="#3B82F6" />
                                <Text className="text-blue-600 ml-1">Set as Main</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => deleteImage(images[selectedImageIndex])}
                                className="flex-row items-center bg-red-100 px-3 py-2 rounded"
                            >
                                <Icon name="trash-can" size={16} color="#DC2626" />
                                <Text className="text-red-600 ml-1">Delete</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Basic Information */}
                <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Basic Information</Text>

                    <View className="space-y-3">
                        <View>
                            <Text className="text-gray-600 mb-1">Variant Name</Text>
                            <TextInput
                                value={variantData.variantname}
                                onChangeText={(text) => handleInputChange('variantname', text)}
                                editable={isEditing}
                                className={`border ${errors.variantname ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3`}
                            />
                            {errors.variantname && <Text className="text-red-500 text-xs mt-1">{errors.variantname}</Text>}
                        </View>

                        <View>
                            <Text className="text-gray-600 mb-1">SKU</Text>
                            <TextInput
                                value={variantData.sku}
                                onChangeText={(text) => handleInputChange('sku', text)}
                                editable={isEditing}
                                className="border border-gray-300 rounded-lg p-3"
                            />
                        </View>

                        <View className="flex-row space-x-3">
                            <View className="flex-1">
                                <Text className="text-gray-600 mb-1">Weight (kg)</Text>
                                <TextInput
                                    value={variantData.weight}
                                    onChangeText={(text) => handleInputChange('weight', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-600 mb-1">Dimensions</Text>
                                <TextInput
                                    value={variantData.dimensions}
                                    onChangeText={(text) => handleInputChange('dimensions', text)}
                                    editable={isEditing}
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Pricing */}
                <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Pricing & Stock</Text>

                    <View className="space-y-3">
                        <View className="flex-row space-x-3">
                            <View className="flex-1">
                                <Text className="text-gray-600 mb-1">Base Price ($)</Text>
                                <TextInput
                                    value={variantData.baseprice}
                                    onChangeText={(text) => handleInputChange('baseprice', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className={`border ${errors.baseprice ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3`}
                                />
                                {errors.baseprice && <Text className="text-red-500 text-xs mt-1">{errors.baseprice}</Text>}
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-600 mb-1">Selling Price ($)</Text>
                                <TextInput
                                    value={variantData.sellingprice}
                                    onChangeText={(text) => handleInputChange('sellingprice', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className={`border ${errors.sellingprice ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3`}
                                />
                                {errors.sellingprice && <Text className="text-red-500 text-xs mt-1">{errors.sellingprice}</Text>}
                            </View>
                        </View>

                        <View className="flex-row space-x-3">
                            <View className="flex-1">
                                <Text className="text-gray-600 mb-1">Discount (%)</Text>
                                <TextInput
                                    value={variantData.discountpercentage}
                                    onChangeText={(text) => handleInputChange('discountpercentage', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-600 mb-1">Stock Quantity</Text>
                                <TextInput
                                    value={variantData.stockquantity}
                                    onChangeText={(text) => handleInputChange('stockquantity', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-600">Active Status</Text>
                            <Switch
                                value={variantData.isactive}
                                onValueChange={(value) => handleInputChange('isactive', value ? 1 : 0)}
                                disabled={!isEditing}
                            />
                        </View>
                    </View>
                </View>

                {/* Variant Attributes */}
                <AttributeSection
                    title="Variant Specifications"
                    attributes={variantAttributes}
                    editable={isEditing}
                />

                {/* Product Attributes */}
                <AttributeSection
                    title="Product Specifications"
                    attributes={productAttributes}
                    editable={false}
                />

                {/* Save Button */}
                {isEditing && (
                    <TouchableOpacity
                        onPress={saveChanges}
                        className="bg-blue-600 py-4 rounded-lg mb-8"
                    >
                        <Text className="text-white font-bold text-center">Save All Changes</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
};

export default VariantEditScreen;