// Products_New_Screen.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StyleSheet,
  Switch,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import Toaster from "../../App_Utils/Services/ToastService";
import { createLogger } from "../../App_Utils/Utils/logger";

const { width } = Dimensions.get("window");

/** ─── Enhanced Animation Hook ─── */
const useSlideFade = (delay = 0, from = 40, duration = 550) => {
  const slide = useRef(new Animated.Value(from)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return { slide, fade };
};

const Products_New_Screen = () => {
  const log = createLogger("Products_New_Screen");

  const nav = useNavigation();
  const { setLoading } = useLoading();
  const [ROLE, setROLE] = useState(null);

  const route = useRoute();
  const { typedata, isedit, productdata } = route.params;



  // Product form state
  const [productid, setProductid] = useState(productdata?.productid || "");
  const [productname, setProductname] = useState(productdata?.productname || "");
  const [productcode, setProductcode] = useState(productdata?.productcode || "");
  const [shortdescription, setShortdescription] = useState(productdata?.shortdescription || "");
  const [fulldescription, setFulldescription] = useState(productdata?.fulldescription || "");
  const [isactive, setIsactive] = useState(productdata?.isactive || true);
  const [isfeatured, setIsfeatured] = useState(productdata?.isfeatured || false);

  // Category/Menu state
  const [typename, setTypename] = useState(productdata?.typename || typedata.name || "");
  const [typeid, setTypeid] = useState(productdata?.typeid || typedata.transid || "");
  const [categoryname, setCategoryname] = useState(productdata?.categoryname || typedata.categoryname || "");
  const [categoryid, setCategoryid] = useState(productdata?.categoryid || typedata.categoryid || "");
  const [sectionname, setSectionname] = useState(productdata?.sectionname || typedata.sectionname || "");
  const [sectionid, setSectionid] = useState(productdata?.sectionid || typedata.sectionid || "");
  const [menuname, setMenuname] = useState(productdata?.menuname || typedata.menuname || "");
  const [menuid, setMenuid] = useState(productdata?.menuid || typedata.menuid || "");

  // File upload state
  const [fileInfo, setFileInfo] = useState(null);
  const [productImage, setProductImage] = useState(null);

  // Enhanced animations with staggered timing
  const headerAnim = useSlideFade(0, 30, 600);
  const basicInfoAnim = useSlideFade(150, 40, 500);
  const descriptionAnim = useSlideFade(250, 40, 500);
  const categoryAnim = useSlideFade(350, 40, 500);
  const settingsAnim = useSlideFade(450, 40, 500);
  const imageAnim = useSlideFade(550, 40, 500);
  const buttonsAnim = useSlideFade(650, 50, 600);

  // Pulse animation for product image with spring effect
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = () => {
    Animated.loop(
      Animated.sequence([
        Animated.spring(pulse, {
          toValue: 1.1,
          friction: 2,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    ).start();
  };

  // Get user role
  const getRole = async () => {
    try {
      const ROLE = await Storage.getData("ROLE");
      setROLE(ROLE);
    } catch (error) {
      console.error("Error getting role:", error);
      Toaster.errortop("Failed to get user role");
    }
  };

  useEffect(() => {
    getRole();
    pulseAnim();
  }, []);

  // Image picker with enhanced error handling
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

      // Success feedback animation
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      Toaster.successtop("Product image selected");
    } catch (err) {
      Toaster.errortop("Failed to select image");
      console.error("Image picker error:", err);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!productname.trim()) {
      Toaster.errortop("Product name is required");
      return false;
    }
    if (!shortdescription.trim()) {
      Toaster.errortop("Short description is required");
      return false;
    }
    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true, "Uploading Product Image…");
    let imagePath = "";

    try {
      if (fileInfo) {
        const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
          path: "Product Images",
        });
        imagePath = uploadRes.virtualPath;
        setFileInfo(null);
      } else {
        imagePath = productdata?.imageurl || null;
      }
    } catch (err) {
      console.error("Upload error:", err);
      Toaster.errortop("Image upload failed");
    } finally {
      setLoading(false);
    }

    setLoading(true, "Creating Product…");

    try {
      const CURRENT_USER = await Storage.getData("USER");

      const payload = {
        productid: isedit ? productid : null,
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
        rcu: CURRENT_USER || CURRENT_USER,
        luu: CURRENT_USER || CURRENT_USER,
        imageurl: imagePath || "No Image Uploaded",
      };

      console.log("Product Payload:", payload);

      var res;
      if (isedit) {
        res = await API.PUT("Products_new", payload);
      } else {

        res = await API.POST("Products_new", payload);
      }

      if (res.message === "Product created successfully." || res.message === "Product updated successfully.") {
        // Success animation
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(pulse, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();
        if (isedit) {
          Alert.alert(
            "Product Updated 🎉",
            `Product: ${productname}\nCode: ${productcode || 'Auto-generated'}\nStatus: ${isactive ? 'Active' : 'Inactive'}`,
            [{ text: "OK", onPress: () => nav.goBack() }]
          );
        } else {
          Alert.alert(
            "Product Created 🎉",
            `Product: ${productname}\nCode: ${productcode || 'Auto-generated'}\nStatus: ${isactive ? 'Active' : 'Inactive'}`,
            [{ text: "OK", onPress: () => nav.goBack() }]
          );
        }
      } else {
        Toaster.errortop(res.message || "Failed to create product");
      }
    } catch (err) {
      console.error("Submission error:", err);
      Toaster.errortop("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const getImageURI = () => {
    var imageUri = productImage || productdata?.imageurl || null;
    console.log("yufhvkb", imageUri);
    console.log(productdata);
    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    //console.log("https://dev.dine360.ca/backend/" + imageUri.replace(/^\/+/, "").slice(2));
    return "https://dev.dine360.ca/backend/" + imageUri.replace(/^\/+/, "").slice(2);
  };



  // Section header component
  const SectionHeader = ({ title, anim, icon }) => (
    <Animated.View
      style={[
        styles.sectionHeader,
        {
          opacity: anim.fade,
          transform: [{ translateY: anim.slide }],
        },
      ]}
    >
      <LinearGradient
        colors={["#FF6B6B", "#FF8E8E"]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          {icon && <MaterialIcons name={icon} size={20} color="white" style={styles.headerIcon} />}
          <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with animated gradient */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim.fade,
              transform: [{ translateY: headerAnim.slide }],
            },
          ]}
        >
          <LinearGradient
            colors={["#4A6FA5", "#3A5673"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <MaterialIcons name="add-shopping-cart" size={28} color="white" style={styles.headerIcon} />
              <Text style={styles.headerText}>Create New Product</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Basic Information Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Basic Information" anim={basicInfoAnim} icon="info" />

          <Animated.View
            style={{
              opacity: basicInfoAnim.fade,
              transform: [{ translateY: basicInfoAnim.slide }],
            }}
          >
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              placeholder="Enter product name"
              value={productname}
              onChangeText={setProductname}
              style={styles.input}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Product Code (Optional)</Text>
            <TextInput
              placeholder="Enter unique product code"
              value={productcode}
              onChangeText={setProductcode}
              style={styles.input}
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />
          </Animated.View>
        </View>

        {/* Description Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Product Description" anim={descriptionAnim} icon="description" />

          <Animated.View
            style={{
              opacity: descriptionAnim.fade,
              transform: [{ translateY: descriptionAnim.slide }],
            }}
          >
            <Text style={styles.label}>Short Description *</Text>
            <TextInput
              placeholder="Brief product description (max 500 characters)"
              value={shortdescription}
              onChangeText={setShortdescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              style={[styles.input, styles.multilineInput]}
              placeholderTextColor="#999"
            />
            <Text style={styles.characterCount}>
              {shortdescription.length}/500 characters
            </Text>

            <Text style={styles.label}>Full Description</Text>
            <TextInput
              placeholder="Detailed product description"
              value={fulldescription}
              onChangeText={setFulldescription}
              multiline
              numberOfLines={5}
              style={[styles.input, styles.multilineInput]}
              placeholderTextColor="#999"
            />
          </Animated.View>
        </View>

        {/* Category & Menu Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Category & Menu" anim={categoryAnim} icon="category" />

          <Animated.View
            style={{
              opacity: categoryAnim.fade,
              transform: [{ translateY: categoryAnim.slide }],
            }}
          >
            <Text style={styles.label}>Type Name</Text>
            <TextInput
              placeholder="Enter type name"
              value={typename}
              onChangeText={setTypename}
              style={styles.input}
              editable={false}
              placeholderTextColor="#999"
            />

            {/* <Text style={styles.label}>Type ID</Text>
            <TextInput
              placeholder="Enter type ID"
              value={typeid}
              onChangeText={setTypeid}
              style={styles.input}
              placeholderTextColor="#999"
            /> */}

            <Text style={styles.label}>Category Name</Text>
            <TextInput
              placeholder="Enter category name"
              value={categoryname}
              editable={false}
              onChangeText={setCategoryname}
              style={styles.input}
              placeholderTextColor="#999"
            />

            {/* <Text style={styles.label}>Category ID</Text>
            <TextInput
              placeholder="Enter category ID"
              value={categoryid}
              onChangeText={setCategoryid}
              style={styles.input}
              placeholderTextColor="#999"
            /> */}

            <Text style={styles.label}>Section Name</Text>
            <TextInput
              placeholder="Enter section name"
              value={sectionname}
              editable={false}
              onChangeText={setSectionname}
              style={styles.input}
              placeholderTextColor="#999"
            />

            {/* <Text style={styles.label}>Section ID</Text>
            <TextInput
              placeholder="Enter section ID"
              value={sectionid}
              onChangeText={setSectionid}
              style={styles.input}
              placeholderTextColor="#999"
            /> */}

            <Text style={styles.label}>Menu Name</Text>
            <TextInput
              disabled={true}
              placeholder="Enter menu name"
              value={menuname}
              onChangeText={setMenuname}
              editable={false}
              style={styles.input}
              placeholderTextColor="#999"
            />

            {/* <Text style={styles.label}>Menu ID</Text>
            <TextInput
              placeholder="Enter menu ID"
              value={menuid}
              onChangeText={setMenuid}
              style={styles.input}
              placeholderTextColor="#999"
            /> */}
          </Animated.View>
        </View>

        {/* Product Settings Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Product Settings" anim={settingsAnim} icon="settings" />

          <Animated.View
            style={{
              opacity: settingsAnim.fade,
              transform: [{ translateY: settingsAnim.slide }],
            }}
          >
            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <MaterialIcons name="visibility" size={24} color="#4A6FA5" />
                <Text style={styles.switchLabel}>Product Active</Text>
                <Switch
                  value={isactive}
                  onValueChange={setIsactive}
                  trackColor={{ false: "#D1D5DB", true: "#4CAF50" }}
                  thumbColor={isactive ? "#fff" : "#f4f3f4"}
                />
              </View>
              <Text style={styles.switchDescription}>
                Enable this to make the product visible to customers
              </Text>
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <MaterialIcons name="star" size={24} color="#FF9800" />
                <Text style={styles.switchLabel}>Featured Product</Text>
                <Switch
                  value={isfeatured}
                  onValueChange={setIsfeatured}
                  trackColor={{ false: "#D1D5DB", true: "#FF9800" }}
                  thumbColor={isfeatured ? "#fff" : "#f4f3f4"}
                />
              </View>
              <Text style={styles.switchDescription}>
                Featured products appear prominently on the homepage
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Product Image Section */}
        <View style={styles.sectionContainer}>
          <SectionHeader title="Product Image" anim={imageAnim} icon="photo" />

          <Animated.View
            style={[
              styles.imageContainer,
              {
                opacity: imageAnim.fade,
                transform: [
                  { translateY: imageAnim.slide },
                  { scale: pulse },
                ],
              },
            ]}
          >
            <TouchableOpacity
              onPress={pickImage}
              style={styles.imageButton}
              activeOpacity={0.7}
            >
              {getImageURI() ? (
                <Animated.Image
                  source={{ uri: getImageURI() }}
                  style={[
                    styles.productImage,
                    { transform: [{ scale: pulse }] },
                  ]}
                />
              ) : (
                <View style={styles.uploadContainer}>
                  <MaterialIcons name="add-photo-alternate" size={40} color="#4A6FA5" />
                  <Text style={styles.uploadText}>Upload Product Image</Text>
                  <Text style={styles.uploadSubtext}>JPG, PNG supported</Text>
                </View>
              )}
            </TouchableOpacity>

            {fileInfo && (
              <Text style={styles.fileInfoText}>
                Selected: {fileInfo.name}
              </Text>
            )}
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonsAnim.fade,
              transform: [{ translateY: buttonsAnim.slide }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.submitButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#4CAF50", "#2E7D32"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="check" size={24} color="white" />
              <Text style={styles.buttonText}> {isedit ? "Edit" : "Create"} Product</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={styles.cancelButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#F44336", "#D32F2F"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="cancel" size={24} color="white" />
              <Text style={styles.buttonText}>Cancel</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingTop: 10,
  },

  // Header styles
  header: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    marginRight: 12,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Section container styles
  sectionContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
  },
  gradientHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },

  // Product image styles
  imageContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  imageButton: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#E9F0F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A6FA5",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  uploadContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  uploadText: {
    marginTop: 12,
    color: "#4A6FA5",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  uploadSubtext: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
  fileInfoText: {
    marginTop: 8,
    color: "#4A6FA5",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // Form input styles
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A6FA5",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: "white",
    color: "#333",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 4,
  },

  // Switch styles
  switchContainer: {
    marginVertical: 12,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 12,
  },
  switchDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginLeft: 36,
  },

  // Button styles
  buttonContainer: {
    marginTop: 30,
    marginHorizontal: 16,
    marginBottom: 40,
  },
  submitButton: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
  },
  cancelButton: {
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
  },
  buttonGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
});

export default Products_New_Screen;