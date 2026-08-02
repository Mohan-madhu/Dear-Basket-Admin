import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getImageUrl } from "../../config";
import { API, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Toaster from "../../App_Utils/Services/ToastService";

const emptyForm = {
  transid: "",
  name: "",
  price: "",
  quantity: "litre",
  image: "",
  increment: "0.50",
  minimumquantity: "0.50",
};

const parseNumber = (value) => Number(value || 0);
const formatCurrency = (value) => `₹${parseNumber(value).toFixed(2)}`;
const getMinimumQuantity = (product) => {
  const min = Number(product?.minimumquantity ?? product?.minimumqty ?? product?.minquantity);
  if (Number.isFinite(min) && min > 0) return min;
  const increment = Number(product?.increment);
  return Number.isFinite(increment) && increment > 0 ? increment : 0.5;
};

const getCurrentUserName = async () => {
  const data = await Storage.getData("DATA");
  const user = await Storage.getData("USER");
  return data?.name || user || data?.transid || "ADMIN";
};

const SummaryCard = ({ title, value, icon, tone = "neutral" }) => {
  const tones = {
    neutral: { bg: "#f9fafb", iconBg: "#f3f4f6", icon: "#374151" },
    green: { bg: "#ecfdf5", iconBg: "#d1fae5", icon: "#059669" },
    blue: { bg: "#eff6ff", iconBg: "#dbeafe", icon: "#2563eb" },
  };
  const color = tones[tone] || tones.neutral;

  return (
    <View style={[styles.summaryCard, { backgroundColor: color.bg }]}>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
      <View style={[styles.summaryIcon, { backgroundColor: color.iconBg }]}>
        <Icon name={icon} size={18} color={color.icon} />
      </View>
    </View>
  );
};

const ProductImage = ({ image, size = 62 }) => {
  const rawImage = String(image || "");
  const uri =
    rawImage.startsWith("file:") ||
    rawImage.startsWith("content:") ||
    rawImage.startsWith("data:")
      ? rawImage
      : getImageUrl(rawImage);

  if (!uri) {
    return (
      <View style={[styles.imagePlaceholder, { width: size, height: size }]}>
        <Icon name="local-drink" size={28} color="#9ca3af" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: 14, backgroundColor: "#f3f4f6" }}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  );
};

const DailyMilkProductsManageScreen = () => {
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [fileInfo, setFileInfo] = useState(null);
  const [previewUri, setPreviewUri] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isFetchingRef = useRef(false);
  const isSavingRef = useRef(false);
  const isMountedRef = useRef(true);

  const isEditing = Boolean(form.transid);

  const fetchProducts = useCallback(
    async (showLoader = true) => {
      if (isFetchingRef.current) {
        return;
      }

      try {
        isFetchingRef.current = true;
        if (showLoader) {
          setLoading(true, "Fetching daily milk products...");
        }
        const res = await API.GET("DailyMilkProducts");
        if (isMountedRef.current) {
          setProducts(Array.isArray(res?.Response) ? res.Response : []);
        }
      } catch (error) {
        console.error("DailyMilkProducts fetch error:", error);
        if (isMountedRef.current) {
          Alert.alert("Error", "Failed to fetch daily milk products.");
        }
      } finally {
        isFetchingRef.current = false;
        if (showLoader) {
          setLoading(false);
        }
        if (isMountedRef.current) {
          setRefreshing(false);
        }
      }
    },
    [setLoading]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchProducts(true);

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const summary = useMemo(() => {
    const activeProducts = products.length;
    const avgPrice =
      activeProducts > 0
        ? products.reduce((sum, item) => sum + parseNumber(item?.price), 0) / activeProducts
        : 0;
    const minIncrement =
      activeProducts > 0
        ? Math.min(...products.map((item) => parseNumber(item?.increment || 0)).filter((n) => n > 0))
        : 0;

    return {
      count: activeProducts,
      avgPrice,
      minIncrement: Number.isFinite(minIncrement) ? minIncrement : 0,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((item) =>
      [item?.name, item?.quantity, item?.transid]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [products, search]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFileInfo(null);
    setPreviewUri("");
  };

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setFileInfo({
        uri: asset.uri,
        name: asset.name || `daily-milk-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      setPreviewUri(asset.uri);
      Toaster.successtop("Product image selected");
    } catch (error) {
      console.error("DailyMilkProducts image picker error:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const startEdit = (product) => {
    setForm({
      transid: product?.transid || "",
      name: product?.name || "",
      price: String(product?.price ?? ""),
      quantity: product?.quantity || "litre",
      image: product?.image || "",
      increment: String(product?.increment ?? "0.50"),
      minimumquantity: String(getMinimumQuantity(product)),
    });
    setFileInfo(null);
    setPreviewUri("");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert("Validation", "Product name is required.");
      return false;
    }
    if (!form.price || Number.isNaN(Number(form.price))) {
      Alert.alert("Validation", "Enter a valid price.");
      return false;
    }
    if (!form.increment || Number.isNaN(Number(form.increment))) {
      Alert.alert("Validation", "Enter a valid increment.");
      return false;
    }
    if (!form.minimumquantity || Number.isNaN(Number(form.minimumquantity))) {
      Alert.alert("Validation", "Enter a valid minimum quantity.");
      return false;
    }
    if (Number(form.price) <= 0) {
      Alert.alert("Validation", "Price must be greater than zero.");
      return false;
    }
    if (Number(form.increment) <= 0) {
      Alert.alert("Validation", "Increment must be greater than zero.");
      return false;
    }
    if (Number(form.minimumquantity) <= 0) {
      Alert.alert("Validation", "Minimum quantity must be greater than zero.");
      return false;
    }
    return true;
  };

  const uploadImageIfNeeded = async () => {
    if (!fileInfo) return form.image || null;

    const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
      path: "Images",
    });

    return uploadRes?.virtualPath || form.image || null;
  };

  const handleSave = async () => {
    if (isSavingRef.current || !validateForm()) return;

    try {
      isSavingRef.current = true;
      setIsSaving(true);
      setLoading(true, isEditing ? "Updating daily milk product..." : "Creating daily milk product...");

      const currentUser = await getCurrentUserName();
      const imagePath = await uploadImageIfNeeded();
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        quantity: form.quantity?.trim() || "litre",
        image: imagePath,
        increment: Number(form.increment),
        minimumquantity: Number(form.minimumquantity),
        ...(isEditing
          ? { transid: form.transid, luu: currentUser }
          : { rcu: currentUser }),
      };

      if (isEditing) {
        await API.PUT("DailyMilkProducts", payload);
        Toaster.successtop("Daily milk product updated");
      } else {
        await API.POST("DailyMilkProducts", payload);
        Toaster.successtop("Daily milk product created");
      }

      resetForm();
      await fetchProducts(false);
    } catch (error) {
      console.error("DailyMilkProducts save error:", error);
      Alert.alert(
        "Save Failed",
        getUserFacingErrorMessage(error, "Could not save the daily milk product.")
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      setLoading(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      "Delete Product",
      `Delete ${product?.name || "this product"} from daily milk booking?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true, "Deleting daily milk product...");
              await API.DELETE("DailyMilkProducts", { transid: product?.transid });
              if (form.transid === product?.transid) {
                resetForm();
              }
              Toaster.successtop("Daily milk product deleted");
              await fetchProducts(false);
            } catch (error) {
              console.error("DailyMilkProducts delete error:", error);
              Alert.alert("Delete Failed", "Could not delete the daily milk product.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Daily Milk Products</Text>
            <Text style={styles.pageSubtitle}>
              Manage products used in the 30-day booking flow.
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard title="Products" value={summary.count} icon="inventory-2" tone="blue" />
          <SummaryCard title="Avg Price" value={formatCurrency(summary.avgPrice)} icon="payments" tone="green" />
          <SummaryCard title="Smallest Step" value={summary.minIncrement || "-"} icon="add-circle" />
        </View>

        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{isEditing ? "Edit Product" : "New Product"}</Text>
              <Text style={styles.sectionSubTitle}>
                Name, price, unit, image, quantity increment, and minimum booking quantity.
              </Text>
            </View>
            {isEditing ? (
              <TouchableOpacity activeOpacity={0.85} onPress={resetForm} style={styles.clearButton}>
                <Icon name="close" size={16} color="#374151" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.imagePickerRow}>
            <ProductImage image={previewUri || form.image} size={82} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={pickImage} style={styles.imageButton}>
                <Icon name="upload-file" size={18} color="#2563eb" />
                <Text style={styles.imageButtonText}>Choose Image</Text>
              </TouchableOpacity>
              <Text style={styles.imageHelp} numberOfLines={2}>
                Current path: {fileInfo?.name || form.image || "No image selected"}
              </Text>
            </View>
          </View>

          <TextInput
            placeholder="Product name"
            value={form.name}
            onChangeText={(value) => updateForm("name", value)}
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />

          <View style={styles.twoColumn}>
            <TextInput
              placeholder="Price"
              value={form.price}
              onChangeText={(value) => updateForm("price", value)}
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Increment"
              value={form.increment}
              onChangeText={(value) => updateForm("increment", value)}
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TextInput
            placeholder="Minimum quantity, e.g. 0.5 or 1"
            value={form.minimumquantity}
            onChangeText={(value) => updateForm("minimumquantity", value)}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />

          <TextInput
            placeholder="Unit label, e.g. litre"
            value={form.quantity}
            onChangeText={(value) => updateForm("quantity", value)}
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
          >
            <Icon name={isEditing ? "save" : "add"} size={19} color="white" />
            <Text style={styles.saveButtonText}>
              {isEditing ? "Update Product" : "Create Product"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Product List</Text>
          <Text style={styles.resultText}>{filteredProducts.length} shown</Text>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={19} color="#6b7280" />
          <TextInput
            placeholder="Search products"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#9ca3af"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.85}>
              <Icon name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="local-drink" size={42} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubTitle}>Create a product to show it in daily milk booking.</Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <View key={product?.transid || product?.name} style={styles.productCard}>
              <ProductImage image={product?.image} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product?.name || "Unnamed Product"}</Text>
                <Text style={styles.productMeta}>
                  {formatCurrency(product?.price)} per {product?.quantity || "unit"}
                </Text>
                <Text style={styles.productMeta}>
                  Step: {product?.increment || "-"} | Min: {getMinimumQuantity(product)}
                </Text>
                <Text style={styles.productId} numberOfLines={1}>
                  {product?.transid || "-"}
                </Text>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => startEdit(product)}
                  style={[styles.iconButton, { backgroundColor: "#eff6ff" }]}
                >
                  <Icon name="edit" size={18} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleDelete(product)}
                  style={[styles.iconButton, { backgroundColor: "#fef2f2" }]}
                >
                  <Icon name="delete-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryCard: {
    width: "32%",
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 10,
    justifyContent: "space-between",
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
  },
  summaryValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "900",
    marginTop: 5,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  formCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  sectionSubTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearButtonText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
  imagePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
  },
  imagePlaceholder: {
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imageButtonText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },
  imageHelp: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#111827",
    backgroundColor: "white",
    marginBottom: 10,
  },
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48.5%",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 2,
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#111827",
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
  },
  emptyTitle: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptySubTitle: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 5,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  productMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "600",
  },
  productId: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 5,
  },
  productActions: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 3,
  },
});

export default DailyMilkProductsManageScreen;
