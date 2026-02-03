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


                {/* Basic Information */}
                <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Basic Information</Text>

                    <View className="space-y-3">
                        <View>
                            <Text className="text-gray-600 mb-1">Variant Name</Text>
                            <TextInput
                                value={variantData.variantname?.toString()}
                                onChangeText={(text) => handleInputChange('variantname', text)}
                                editable={isEditing}
                                className={`border ${errors.variantname ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3`}
                            />
                            {errors.variantname && <Text className="text-red-500 text-xs mt-1">{errors.variantname}</Text>}
                        </View>

                        <View>
                            <Text className="text-gray-600 mb-1">SKU</Text>
                            <TextInput
                                value={variantData.sku?.toString()}
                                onChangeText={(text) => handleInputChange('sku', text)}
                                editable={isEditing}
                                className="border border-gray-300 rounded-lg p-3"
                            />
                        </View>

                        <View className="flex-row space-x-3">
                            <View className="flex-1 mr-2">
                                <Text className="text-gray-600 mb-1">Weight (kg)</Text>
                                <TextInput
                                    value={variantData.weight?.toString()}
                                    onChangeText={(text) => handleInputChange('weight', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
                            <View className="flex-1 ml-2">
                                <Text className="text-gray-600 mb-1">Dimensions</Text>
                                <TextInput
                                    value={variantData.dimensions?.toString()}
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
                            <View className="flex-1 mr-2">
                                <Text className="text-gray-600 mb-1">Base Price ($)</Text>
                                <TextInput
                                    value={variantData.baseprice?.toString()}
                                    onChangeText={(text) => handleInputChange('baseprice', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className={`border ${errors.baseprice ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3`}
                                />
                                {errors.baseprice && <Text className="text-red-500 text-xs mt-1">{errors.baseprice}</Text>}
                            </View>
                            <View className="flex-1 ml-2">
                                <Text className="text-gray-600 mb-1">Selling Price ($)</Text>
                                <TextInput
                                    value={variantData.sellingprice?.toString()}
                                    onChangeText={(text) => handleInputChange('sellingprice', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className={`border ${errors.sellingprice ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3`}
                                />
                                {errors.sellingprice && <Text className="text-red-500 text-xs mt-1">{errors.sellingprice}</Text>}
                            </View>
                        </View>

                        <View className="flex-row space-x-3">
                            <View className="flex-1 mr-2">
                                <Text className="text-gray-600 mb-1">Discount (%)</Text>
                                <TextInput
                                    value={variantData.discountpercentage?.toString()}
                                    onChangeText={(text) => handleInputChange('discountpercentage', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
                            <View className="flex-1 ml-2">
                                <Text className="text-gray-600 mb-1">Stock Quantity</Text>
                                <TextInput
                                    value={variantData.stockquantity?.toString()}
                                    onChangeText={(text) => handleInputChange('stockquantity', text)}
                                    editable={isEditing}
                                    keyboardType="numeric"
                                    className="border border-gray-300 rounded-lg p-3"
                                />
                            </View>
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