// Products_New_Screen.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
    Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import Toaster from "../../App_Utils/Services/ToastService";

// minimal fade-in hook
const useFadeIn = (delay = 0) => {
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, {
            toValue: 1,
            duration: 350,
            delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [delay]);
    return fade;
};

const Products_New_Screen = () => {
    const nav = useNavigation();
    const { setLoading } = useLoading();

    // wizard step
    const [step, setStep] = useState(1);

    // core fields
    const [productname, setProductname] = useState("");
    const [productcode, setProductcode] = useState("");
    const [shortdescription, setShortdescription] = useState("");
    const [fulldescription, setFulldescription] = useState("");

    // settings
    const [isactive, setIsactive] = useState(true);
    const [isfeatured, setIsfeatured] = useState(false);

    // advanced (collapsed)
    const [openAdvanced, setOpenAdvanced] = useState(false);
    const [typename, setTypename] = useState("");
    const [typeid, setTypeid] = useState("");
    const [categoryname, setCategoryname] = useState("");
    const [categoryid, setCategoryid] = useState("");
    const [sectionname, setSectionname] = useState("");
    const [sectionid, setSectionid] = useState("");
    const [menuname, setMenuname] = useState("");
    const [menuid, setMenuid] = useState("");

    // image
    const [fileInfo, setFileInfo] = useState(null);
    const [productImage, setProductImage] = useState(null);

    // errors
    const [errors, setErrors] = useState({});

    const fade = useFadeIn(50);

    // optional: role read
    useEffect(() => {
        (async () => {
            try {
                await Storage.getData("ROLE");
            } catch {
                Toaster.errortop("Failed to get user role");
            }
        })();
    }, []);

    const pickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["image/jpeg", "image/png", "image/jpg"],
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const { uri, name, mimeType } = result.assets[0];
            setFileInfo({ uri, name, type: mimeType });
            setProductImage(uri);
            Toaster.successtop("Product image selected");
        } catch {
            Toaster.errortop("Failed to select image");
        }
    };

    // -------- validation ----------
    // PURE: does not set state. Safe to call during render.
    const computeStepErrors = (s) => {
        const nextErrors = {};
        if (s === 1) {
            if (!productname.trim())
                nextErrors.productname = "Product name is required";
            if (!shortdescription.trim())
                nextErrors.shortdescription = "Short description is required";
        }
        if (s === 2) {
            if (shortdescription.length > 500)
                nextErrors.shortdescription = "Max 500 characters";
        }
        // If you want to enforce image selection on step 3, uncomment:
        // if (s === 3 && !productImage)
        //   nextErrors.productimage = "Please add a product image";
        return nextErrors;
    };

    // memoized validity for the current step — used only for rendering UI state
    const isCurrentStepValid = useMemo(() => {
        const errs = computeStepErrors(step);
        return Object.keys(errs).length === 0;
    }, [
        step,
        productname,
        shortdescription,
        // fulldescription, productImage // include if they affect validation
    ]);

    // sets errors & returns boolean — use only in event handlers
    const validateStep = (s) => {
        const nextErrors = computeStepErrors(s);
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };
    // -------- end validation ----------

    const next = () => {
        if (validateStep(step) && step < 3) setStep(step + 1);
    };
    const back = () => setStep((p) => (p > 1 ? p - 1 : p));

    const handleSubmit = async () => {
        // validate all steps before submit
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

        setLoading(true, "Uploading Product Image…");
        let imagePath = "";
        try {
            if (fileInfo) {
                const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
                    path: "Product Images",
                });
                imagePath = uploadRes.virtualPath;
                setFileInfo(null);
            }
        } catch {
            Toaster.errortop("Image upload failed");
        } finally {
            setLoading(false);
        }

        setLoading(true, "Creating Product…");
        try {
            const CURRENT_USER = await Storage.getData("USER");
            const payload = {
                productname,
                productcode: productcode || null,
                shortdescription,
                fulldescription: fulldescription || null,
                isactive,
                isfeatured,
                typename: typename || null,
                typeid: typeid || null,
                categoryname: categoryname || null,
                categoryid: categoryid || null,
                sectionname: sectionname || null,
                sectionid: sectionid || null,
                menuname: menuname || null,
                menuid: menuid || null,
                rcu:
                    (CURRENT_USER && (CURRENT_USER.id || CURRENT_USER.username)) || null,
                productimage: imagePath || "No Image Uploaded",
            };

            const res = await API.POST("products", payload);
            if (res.message === "Product created successfully.") {
                Alert.alert(
                    "Product Created 🎉",
                    `Product: ${productname}\nCode: ${productcode || "Auto-generated"
                    }\nStatus: ${isactive ? "Active" : "Inactive"}`,
                    [{ text: "OK", onPress: () => nav.goBack() }]
                );
            } else {
                Toaster.errortop(res.message || "Failed to create product");
            }
        } catch {
            Toaster.errortop("Failed to create product");
        } finally {
            setLoading(false);
        }
    };

    // stepper
    const Stepper = () => {
        const items = [
            { id: 1, label: "Basic" },
            { id: 2, label: "Description" },
            { id: 3, label: "Image & Settings" },
        ];
        return (
            <View className="px-4 pt-4 pb-3 bg-white">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xl font-bold text-[#1f2937]">New Product</Text>
                    <Text className="text-xs text-gray-500">Step {step} of 3</Text>
                </View>
                <View className="flex-row items-center">
                    {items.map((it, i) => {
                        const active = it.id <= step;
                        return (
                            <View key={it.id} className="flex-1 flex-row items-center">
                                <View
                                    className={`w-7 h-7 rounded-full items-center justify-center ${active ? "bg-[#4A6FA5]" : "bg-gray-300"
                                        }`}
                                >
                                    <Text className="text-white text-xs font-semibold">
                                        {it.id}
                                    </Text>
                                </View>
                                {i < items.length - 1 && (
                                    <View
                                        className={`h-1 flex-1 mx-2 rounded ${step > it.id ? "bg-[#4A6FA5]" : "bg-gray-300"
                                            }`}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // input field
    const Field = ({
        label,
        value,
        onChangeText,
        placeholder,
        error,
        multiline,
        maxLength,
        right,
    }) => (
        <View className="mb-4">
            <Text className="text-sm font-semibold text-[#4A6FA5] mb-1">
                {label}
            </Text>
            <View
                className={`rounded-lg border ${error ? "border-red-400" : "border-gray-300"
                    } bg-white`}
            >
                <View className="flex-row items-center">
                    <TextInput
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="#9CA3AF"
                        multiline={!!multiline}
                        maxLength={maxLength}
                        className={`flex-1 p-3.5 text-base text-[#111827] ${multiline ? "min-h-24" : ""
                            }`}
                        style={multiline ? { textAlignVertical: "top" } : undefined}
                    />
                    {right}
                </View>
            </View>
            {maxLength ? (
                <View className="flex-row justify-between mt-1">
                    <Text className="text-xs text-red-500">{error || " "}</Text>
                    <Text className="text-xs text-gray-500">
                        {(value?.length || 0)}/{maxLength}
                    </Text>
                </View>
            ) : error ? (
                <Text className="text-xs text-red-500 mt-1">{error}</Text>
            ) : null}
        </View>
    );

    return (
        // <KeyboardAvoidingView
        <View
            //   behavior={Platform.OS === "ios" ? "padding" : "height"}
            //   keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}

            //       behavior="padding"
            // keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}

            className="flex-1 bg-[#F5F7FA]"
        >
            <Stepper />

            <Animated.View style={{ opacity: fade }} className="flex-1">
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                >
                    {step === 1 && (
                        <View className="bg-white rounded-xl p-4">
                            <Field
                                label="Product Name *"
                                value={productname}
                                onChangeText={(t) => {
                                    setProductname(t);
                                    if (errors.productname)
                                        setErrors((e) => ({ ...e, productname: "" }));
                                }}
                                placeholder="Ex. Classic Cotton T-Shirt"
                                error={errors.productname}
                            />
                            <Field
                                label="Short Description *"
                                value={shortdescription}
                                onChangeText={(t) => {
                                    setShortdescription(t);
                                    if (errors.shortdescription)
                                        setErrors((e) => ({ ...e, shortdescription: "" }));
                                }}
                                placeholder="One-liner customers see first"
                                multiline
                                maxLength={500}
                                error={errors.shortdescription}
                            />
                            <Field
                                label="Product Code (optional)"
                                value={productcode}
                                onChangeText={setProductcode}
                                placeholder="AUTOGEN if empty"
                                right={
                                    <View className="px-3">
                                        <MaterialIcons name="qr-code-2" size={22} color="#6B7280" />
                                    </View>
                                }
                            />
                        </View>
                    )}

                    {step === 2 && (
                        <View className="bg-white rounded-xl p-4">
                            <Field
                                label="Full Description"
                                value={fulldescription}
                                onChangeText={setFulldescription}
                                placeholder="Write details, materials, care…"
                                multiline
                            />

                            <TouchableOpacity
                                onPress={() => setOpenAdvanced((v) => !v)}
                                className="mt-2 flex-row items-center"
                                activeOpacity={0.8}
                            >
                                <MaterialIcons
                                    name={openAdvanced ? "expand-less" : "expand-more"}
                                    size={22}
                                    color="#4A6FA5"
                                />
                                <Text className="ml-1 text-[#4A6FA5] font-semibold">
                                    Advanced (Type, Category, Menu)
                                </Text>
                            </TouchableOpacity>

                            {openAdvanced && (
                                <View className="mt-3 border-t border-gray-200 pt-3">
                                    <Field
                                        label="Type Name"
                                        value={typename}
                                        onChangeText={setTypename}
                                        placeholder="e.g., Apparel"
                                    />
                                    <Field
                                        label="Type ID"
                                        value={typeid}
                                        onChangeText={setTypeid}
                                        placeholder="Optional"
                                    />
                                    <Field
                                        label="Category Name"
                                        value={categoryname}
                                        onChangeText={setCategoryname}
                                        placeholder="e.g., T-Shirts"
                                    />
                                    <Field
                                        label="Category ID"
                                        value={categoryid}
                                        onChangeText={setCategoryid}
                                        placeholder="Optional"
                                    />
                                    <Field
                                        label="Section Name"
                                        value={sectionname}
                                        onChangeText={setSectionname}
                                        placeholder="Optional"
                                    />
                                    <Field
                                        label="Section ID"
                                        value={sectionid}
                                        onChangeText={setSectionid}
                                        placeholder="Optional"
                                    />
                                    <Field
                                        label="Menu Name"
                                        value={menuname}
                                        onChangeText={setMenuname}
                                        placeholder="Optional"
                                    />
                                    <Field
                                        label="Menu ID"
                                        value={menuid}
                                        onChangeText={setMenuid}
                                        placeholder="Optional"
                                    />
                                </View>
                            )}
                        </View>
                    )}

                    {step === 3 && (
                        <View className="bg-white rounded-xl p-4">
                            <Text className="text-sm font-semibold text-[#4A6FA5] mb-2">
                                Product Image
                            </Text>
                            <TouchableOpacity
                                onPress={pickImage}
                                activeOpacity={0.85}
                                className="h-48 rounded-xl border-2 border-dashed border-[#4A6FA5] bg-[#E9F0F9] items-center justify-center overflow-hidden"
                            >
                                {productImage ? (
                                    <View className="w-full h-full">
                                        <Image source={{ uri: productImage }} className="w-full h-full" />
                                    </View>
                                ) : (
                                    <View className="items-center">
                                        <MaterialIcons
                                            name="add-photo-alternate"
                                            size={40}
                                            color="#4A6FA5"
                                        />
                                        <Text className="mt-2 text-[#4A6FA5] font-semibold">
                                            Tap to add image
                                        </Text>
                                        <Text className="text-gray-500 text-xs mt-1">PNG or JPG</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            {fileInfo && (
                                <Text className="mt-2 text-[#4A6FA5] text-xs">
                                    Selected: {fileInfo.name}
                                </Text>
                            )}
                            {errors.productimage ? (
                                <Text className="text-xs text-red-500 mt-1">
                                    {errors.productimage}
                                </Text>
                            ) : null}

                            <View className="mt-5 space-y-3">
                                <View className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-200 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <MaterialIcons name="visibility" size={22} color="#4A6FA5" />
                                        <Text className="ml-2 text-gray-800 font-medium">
                                            Product Active
                                        </Text>
                                    </View>
                                    <Switch
                                        value={isactive}
                                        onValueChange={setIsactive}
                                        trackColor={{ false: "#D1D5DB", true: "#4CAF50" }}
                                        thumbColor={isactive ? "#fff" : "#f4f3f4"}
                                    />
                                </View>
                                <View className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-200 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <MaterialIcons name="star" size={22} color="#FF9800" />
                                        <Text className="ml-2 text-gray-800 font-medium">
                                            Featured Product
                                        </Text>
                                    </View>
                                    <Switch
                                        value={isfeatured}
                                        onValueChange={setIsfeatured}
                                        trackColor={{ false: "#D1D5DB", true: "#FF9800" }}
                                        thumbColor={isfeatured ? "#fff" : "#f4f3f4"}
                                    />
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </Animated.View>

            {/* sticky footer */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={() => nav.goBack()}
                        className="px-4 py-3 rounded-lg bg-gray-100 active:opacity-80"
                    >
                        <Text className="text-gray-700 font-semibold">Cancel</Text>
                    </TouchableOpacity>

                    <View className="flex-row">
                        {step > 1 && (
                            <TouchableOpacity
                                onPress={back}
                                className="px-4 py-3 rounded-lg bg-gray-100 active:opacity-80 mr-3"
                            >
                                <Text className="text-gray-700 font-semibold">Back</Text>
                            </TouchableOpacity>
                        )}

                        {step < 3 ? (
                            <TouchableOpacity
                                onPress={next}
                                className={`px-5 py-3 rounded-lg active:opacity-80 ${isCurrentStepValid ? "bg-[#4A6FA5]" : "bg-gray-300"
                                    }`}
                                disabled={!isCurrentStepValid}
                            >
                                <Text className="text-white font-semibold">Next</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleSubmit}
                                className="px-5 py-3 rounded-lg bg-green-600 active:opacity-80"
                            >
                                <Text className="text-white font-semibold">Create Product</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </View>
        // </KeyboardAvoidingView>
    );
};

export default Products_New_Screen;
