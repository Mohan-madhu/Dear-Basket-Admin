// HomeScreen.js

// ───────────────────────────────────────────────────────────────────────────
// Imports
// ───────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import ColorPicker from "react-native-wheel-color-picker";
import throttle from "lodash.throttle";

import AdminDashboard from "../Screens/AdminDashboard";
import MenuViewScreen from "../Screens/MenuViewScreen";
import { API, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Storage from "../../App_Utils/Services/StorageService";
import { useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";

const menusData = [];
const ADDNEWMENU = {
  id: "add_new",
  name: "Add\nNew",
  colors: ["#cccccc", "#999999"],
  icon: "add-circle",
  image: require("../../assets/addnewcategory.webp"),
};

const normalizeRole = (role) => String(role || "").trim().toUpperCase();
const SPECIAL_MENU_IDS_WITH_OWN_CART = new Set([
  "376A5632-41F7-489C-9522-D6293A61D1E0",
  "7B7A4417-266F-4D2B-88CB-F1BD590BF799",
]);
const DAILY_MILK_MENU_ID = "376A5632-41F7-489C-9522-D6293A61D1E0";
const DEAR_FOODIE_MENU_ID = "7B7A4417-266F-4D2B-88CB-F1BD590BF799";

const getBrandTitle = (selectedMenuId) => {
  if (selectedMenuId === DAILY_MILK_MENU_ID) return "Dear Milk";
  if (selectedMenuId === DEAR_FOODIE_MENU_ID) return "Dear Kitchen";
  return "Dear Basket";
};

// ───────────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Animated component
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

// Simple logger with error handling
const log = (val = "", msg = "") => {
  try {
    console.log(`[HOME SCREEN] ${msg}`, val);
  } catch (error) {
    console.error("Logging error:", error);
  }
};

// Error display function
const showError = (error, customMessage = "An error occurred") => {
  console.error(customMessage, error);
  Alert.alert(
    "Error",
    getUserFacingErrorMessage(error, customMessage),
    [{ text: "OK" }]
  );
};

// ───────────────────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  // ─────────────────────────────────────────────────────────────────────────
  // Loading & Theme
  // ─────────────────────────────────────────────────────────────────────────
  const { setLoading } = useLoading();
  const theme = useColorScheme();
  const activeColor = theme === "dark" ? "#fff" : "#000";
  const idleColor = theme === "dark" ? "#aaa" : "#666";
  const navigation = useNavigation();
  const route = useRoute();
  const dailyMilkRefreshKey =
    route?.params?.dailyMilkRefreshKey ||
    route?.params?.params?.dailyMilkRefreshKey ||
    null;

  // ─────────────────────────────────────────────────────────────────────────
  // State & Refs
  // ─────────────────────────────────────────────────────────────────────────
  const [menus, setMenus] = useState(menusData);
  const [ROLE, setROLE] = useState(null);
  const [selected, setSelected] = useState(menus[0]?.id ? menus[0].id : null);
  const [prevColors, setPrevColors] = useState(["#ffffff", "#000000"]);
  const [nextColors, setNextColors] = useState(["#ffffff", "#000000"]);

  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newCat, setNewCat] = useState({
    id: "",
    name: "",
    image: null,
    icon: "",
    startColor: "#4fc3f7",
    endColor: "#4dd0e1",
  });

  const [tabLayouts, setTabLayouts] = useState([]);
  const scrollViewRef = useRef(null);
  const progress = useSharedValue(1);
  const titleProgress = useSharedValue(1);
  const titleShineProgress = useSharedValue(1);

  // Temporary color state for ColorPicker
  const [tempColor, setTempColor] = useState(newCat.startColor);
  const throttledTempColor = useRef(
    throttle((c) => setTempColor(c), 10, { trailing: true })
  ).current;



  const allCart = useSelector((state) => state.cart.cart || []);
  const cart = useMemo(
    () => allCart.filter((item) => item?.source !== "dearkitchen"),
    [allCart]
  );

  const total = cart
    .map((item) => item.price * item.orderquantity)
    .reduce((cur, prev) => cur + prev, 0);





  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  const getRole = async () => {
    try {
      const role = await Storage.getData("ROLE");
      setROLE(normalizeRole(role));
    } catch (error) {
      showError(error, "Failed to get user role");
    }
  };

  useEffect(() => {
    getRole();
  }, []);

  async function fetchData() {
    try {
      setLoading(true, "Fetching Menu Data");
      const menudata = await API.GET("MenuSectionCategory");
      const ordered = menudata.Response.map((item) => ({
        id: item.transid,
        transid: item.transid,
        name: item.name,
        colors: [item.startcolor, item.endcolor],
        icon: item.icon,
        sections: item.sections,
      }));

      if (ROLE === "ADMIN") {
        ordered.push(ADDNEWMENU);
      }

      setMenus(ordered);
      if (ordered.length > 0) {
        const targetMenu =
          dailyMilkRefreshKey
            ? ordered.find((item) => item.id === DAILY_MILK_MENU_ID) || ordered[0]
            : ordered[0];
        setSelected(targetMenu.id);
        setPrevColors(targetMenu.colors);
        setNextColors(targetMenu.colors);
      }
    } catch (error) {
      showError(error, "Failed to fetch menu data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [ROLE, dailyMilkRefreshKey]);

  // ─────────────────────────────────────────────────────────────────────────
  // Gradient Animation on Tab Change
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fade() {
      try {
        const newColors = menus.find((c) => c.id === selected)?.colors;
        if (!newColors) return;

        setPrevColors(nextColors);
        setNextColors(newColors);

        progress.value = 0;
        progress.value = withTiming(1, { duration: 1500 });

        await new Promise((r) => setTimeout(r, 1000));
        setPrevColors(newColors);
      } catch (error) {
        showError(error, "Animation error");
      }
    }
    fade();
  }, [selected]);

  const prevStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const nextStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [
      { translateY: (1 - titleProgress.value) * 14 },
      { scale: 0.94 + titleProgress.value * 0.06 },
    ],
  }));
  const titleShineStyle = useAnimatedStyle(() => ({
    opacity:
      titleShineProgress.value < 0.08 || titleShineProgress.value > 0.92
        ? 0
        : 0.95,
    transform: [
      { translateX: -96 + titleShineProgress.value * 260 },
      { rotate: "-18deg" },
    ],
  }));

  useEffect(() => {
    titleProgress.value = 0;
    titleShineProgress.value = 0;
    titleProgress.value = withTiming(1, {
      duration: 1050,
      easing: Easing.out(Easing.cubic),
    });
    titleShineProgress.value = withTiming(1, {
      duration: 1450,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [selected]);

  // ─────────────────────────────────────────────────────────────────────────
  // Document Picker
  // ─────────────────────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || result.cancelled) return;

      const file = "assets" in result ? result.assets[0] : result;
      setNewCat((prev) => ({ ...prev, image: file.uri }));
    } catch (error) {
      showError(error, "Failed to pick image");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const addNewMenu = async () => {
    try {
      setLoading(true, "Adding New Menu");
      const data = {
        name: newCat.name,
        icon: newCat.icon,
        image: newCat.image,
        endcolor: newCat.endColor,
        startcolor: newCat.startColor,
        rcu: "ADMIN",
      };

      await API.POST("Menu", data);
      fetchData();
    } catch (error) {
      showError(error, "Failed to add menu");
    } finally {
      setLoading(false);
    }
  };

  const updateMenu = async () => {
    try {
      setLoading(true, "Updating Menu");
      const data = {
        transid: editingId,
        name: newCat.name,
        icon: newCat.icon,
        image: newCat.image,
        endcolor: newCat.endColor,
        startcolor: newCat.startColor,
        luu: "ADMIN",
      };

      await API.PUT("Menu", data);
      fetchData();
    } catch (error) {
      showError(error, "Failed to update menu");
    } finally {
      setLoading(false);
    }
  };

  const deleteMenu = async () => {
    try {
      setLoading(true, "Deleting Menu");
      const data = {
        transid: editingId,
        name: newCat.name,
        icon: newCat.icon,
        image: newCat.image,
        endcolor: newCat.endColor,
        startcolor: newCat.startColor,
        luu: "ADMIN",
      };

      await API.DELETE("Menu", data);
      fetchData();
    } catch (error) {
      showError(error, "Failed to delete menu");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (onDelete) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this Menu? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
      { cancelable: true }
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Press Handler
  // ─────────────────────────────────────────────────────────────────────────
  const onTabPress = (cat, idx) => {
    try {
      if (cat.id === "add_new") {
        setShowAddPopup(true);
        setEditingId(null);
        setSelected("add_new");
      } else {
        setSelected(cat.id);
        setEditingId(null);

        const layout = tabLayouts[idx];
        if (layout && scrollViewRef.current) {
          const tabCenter = layout.x + layout.width / 2;
          if (tabCenter > SCREEN_WIDTH / 2) {
            scrollViewRef.current.scrollTo({
              x: tabCenter - SCREEN_WIDTH / 2,
              animated: true,
            });
          }
        }
      }
    } catch (error) {
      showError(error, "Tab press error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render Menu Content
  // ─────────────────────────────────────────────────────────────────────────
  const renderMenuScreen = () => {
    try {
      const selectedMenu = menus.find((c) => c.id === selected);
     // console.log("Selected Menu:", selectedMenu);
      if (!selectedMenu) return null;

      return <MenuViewScreen MENU={selectedMenu} dailyMilkRefreshKey={dailyMilkRefreshKey} />;
    } catch (error) {
      showError(error, "Failed to render menu");
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <AnimatedGradient
        colors={prevColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, prevStyle]}
      />
      <AnimatedGradient
        colors={nextColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, nextStyle]}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleReveal}>
          <Animated.Text style={[styles.title, { color: activeColor }, titleStyle]}>
            {getBrandTitle(selected)}
          </Animated.Text>
          <AnimatedGradient
            pointerEvents="none"
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.92)",
              "rgba(251,191,36,0.72)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.titleShine, titleShineStyle]}
          />
        </View>
        <View className="flex-row items-center justify-between border-black h-0  mb-2" >

        </View>
        {/* <View style={styles.searchBox}>
          <TextInput
            placeholder="Search…"
            placeholderTextColor="#888"
            style={{ color: "#000" }}
          />
        </View> */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: 50,
          }}
        >
          {menus?.map((cat, idx) => (
            <View
              key={cat.id || idx}
              onLayout={(e) => {
                try {
                  const { x, width } = e.nativeEvent.layout;
                  setTabLayouts((t) => {
                    const copy = [...t];
                    copy[idx] = { x, width };
                    return copy;
                  });
                } catch (error) {
                  showError(error, "Layout error");
                }
              }}
            >
              <TouchableOpacity
                onPress={() => onTabPress(cat, idx)}
                style={[
                  styles.tabItem,
                  selected === cat?.id && styles.tabItemActive,
                ]}
              >
                {cat?.id === "add_new" ? (
                  <Image
                    source={cat.image}
                    style={styles.addMenuImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Ionicons
                    name={
                      selected === cat?.id ? cat?.icon : `${cat?.icon}-outline`
                    }
                    size={24}
                    color={selected === cat?.id ? activeColor : idleColor}
                  />
                )}
                <Text
                  style={[
                    styles.tabLabel,
                    selected === cat?.id && styles.tabLabelActive,
                    { color: selected === cat?.id ? activeColor : idleColor },
                  ]}
                  numberOfLines={2}
                >
                  {cat?.name?.replace(/\\n/g, "\n")}
                </Text>
              </TouchableOpacity>

              {cat?.id !== "add_new" && ROLE === "ADMIN" && (
                <TouchableOpacity
                  onPress={() => {
                    try {
                      setEditingId(cat.id);
                      setNewCat({
                        id: cat.id,
                        name: cat.name?.replace(/\n/g, " ") || "",
                        image: cat.image || null,
                        icon: cat.icon || "",
                        startColor: cat.colors?.[0] || "#4fc3f7",
                        endColor: cat.colors?.[1] || "#4dd0e1",
                      });
                      setShowAddPopup(true);
                    } catch (error) {
                      showError(error, "Edit button error");
                    }
                  }}
                  style={styles.editIcon}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={14}
                    color="white"
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderMenuScreen()}</View>

      {/* Add/Edit Popup */}
      {showAddPopup && (
        <View style={styles.popupOverlay}>
          <View className="w-full h-[70%] bg-white rounded-xl p-5 mt-40">
            <Text style={styles.popupTitle}>
              {editingId ? "Edit Menu" : "Add New Menu"}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.popupInput}
                placeholder="Vegetables & Groceries"
                value={newCat.name}
                onChangeText={(t) =>
                  setNewCat((prev) => ({ ...prev, name: t }))
                }
              />

              {/* Image */}
              <Text style={styles.fieldLabel}>Image</Text>
              <TouchableOpacity
                onPress={pickImage}
                style={[
                  styles.imagePicker,
                  newCat.image && styles.imagePickerActive,
                ]}
              >
                {newCat.image ? (
                  <Image
                    cachePolicy="memory-disk"
                    source={{ uri: newCat.image }}
                    style={styles.previewImage}
                  />
                ) : (
                  <Text style={styles.imagePlaceholder}>
                    Tap to choose image
                  </Text>
                )}
              </TouchableOpacity>

              {/* Icon */}
              <Text style={styles.fieldLabel}>Ionicon name</Text>
              <TextInput
                style={styles.popupInput}
                placeholder="leaf / shirt / basket …"
                value={newCat.icon}
                onChangeText={(t) =>
                  setNewCat((prev) => ({ ...prev, icon: t }))
                }
              />

              {/* Colors */}
              <Text style={styles.fieldLabel}>Gradient colours</Text>
              <View style={styles.colorRow}>
                {["startColor", "endColor"].map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={styles.colorPreviewContainer}
                    onPress={() =>
                      setNewCat((prev) => ({
                        ...prev,
                        [`show${key}`]: true,
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.colorPreview,
                        { backgroundColor: newCat[key] },
                      ]}
                    />
                    <Text style={styles.colorText}>
                      {key === "startColor" ? "Start" : "End"} {newCat[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Picker Modals */}
              {["startColor", "endColor"].map(
                (key) =>
                  newCat[`show${key}`] && (
                    <Modal
                      key={key}
                      transparent
                      animationType="fade"
                      onRequestClose={() =>
                        setNewCat((prev) => ({
                          ...prev,
                          [`show${key}`]: false,
                        }))
                      }
                    >
                      <View className="flex-1 bg-black/70 justify-center items-center p-5 flex mt-5">
                        <View className="w-full h-[60%] bg-white rounded-xl p-4">
                          <Text style={styles.modalTitle}>
                            Pick {key === "startColor" ? "start" : "end"} colour
                          </Text>
                          <ColorPicker
                            color={tempColor}
                            onColorChangeComplete={throttledTempColor}
                            thumbSize={30}
                            sliderSize={30}
                            noSnap
                            row={false}
                          />
                          <View style={styles.modalButtons}>
                            <TouchableOpacity
                              onPress={() =>
                                setNewCat((prev) => ({
                                  ...prev,
                                  [`show${key}`]: false,
                                }))
                              }
                            >
                              <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                setNewCat((prev) => ({
                                  ...prev,
                                  [key]: tempColor,
                                  [`show${key}`]: false,
                                }))
                              }
                            >
                              <Text style={styles.doneText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  )
              )}
            </ScrollView>

            {/* Actions */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                try {
                  if (!newCat.name.trim()) {
                    Alert.alert("Error", "Please enter a Menu name");
                    return;
                  }
                  setShowAddPopup(false);
                  editingId ? updateMenu() : addNewMenu();
                  setEditingId(null);
                  setNewCat({
                    name: "",
                    image: null,
                    icon: "",
                    startColor: "#4fc3f7",
                    endColor: "#4dd0e1",
                  });
                } catch (error) {
                  showError(error, "Save operation failed");
                }
              }}
            >
              <Text style={styles.saveButtonText}>
                {editingId ? "Save Changes" : "Add Menu"}
              </Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  confirmDelete(() => {
                    try {
                      deleteMenu();
                      setShowAddPopup(false);
                    } catch (error) {
                      showError(error, "Delete operation failed");
                    }
                  })
                }
              >
                <Text style={styles.deleteButtonText}>Delete Menu</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowAddPopup(false);
                setEditingId(null);
              }}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {total === 0 || SPECIAL_MENU_IDS_WITH_OWN_CART.has(selected) ? null : (
        <Pressable
          className="bg-[#00A877] w-[90%] p-3 mx-auto mb-1 absolute left-5 bottom-1 rounded-lg"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-white">
                {cart.length} items | {total} 
              </Text>
              <Text className="font-normal text-sm mt-1 text-white">
                Delivery Charges May Apply
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate("ViewCartScreen", { name: "data.name" })}>
              <Text className="text-xl font-medium text-white">
                View Cart
              </Text>
            </Pressable>
          </View>
        </Pressable>
      )}

    </View>
  );
}

// Styles
// ───────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30 },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: { paddingHorizontal: 16 },
  titleReveal: {
    width: 210,
    minHeight: 31,
    overflow: "hidden",
    paddingRight: 16,
    marginBottom: 8,
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 0 },
  titleShine: {
    position: "absolute",
    top: -14,
    bottom: -10,
    width: 64,
  },
  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  tabItem: {
    width: 80,
    marginRight: 24,
    paddingBottom: 4,
    alignItems: "center",
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
  },
  tabLabel: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  tabLabelActive: {
    fontWeight: "bold",
  },
  addMenuImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  editIcon: {
    position: "absolute",
    top: 0,
    right: 16,
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Popup
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 99,
  },
  popupContent: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  fieldLabel: {
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 12,
  },
  popupInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  imagePicker: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  imagePickerActive: {
    borderColor: "transparent",
    backgroundColor: "#eee",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imagePlaceholder: {
    color: "#888",
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  colorPreviewContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  colorPreview: {
    width: "100%",
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  colorText: {
    marginTop: 4,
    fontSize: 12,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e74c3c",
  },
  doneText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#27ae60",
  },

  // Actions
  saveButton: {
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#c0392b",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeText: {
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 12,
  },
});
