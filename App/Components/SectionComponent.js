// ==========================
// Imports
// ==========================
import React, { useEffect, useState } from "react";
import { getImageUrl } from "../../config";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  Button,
} from "react-native";
import { Image } from "expo-image";
import Icon from "react-native-vector-icons/Feather";
import Animated, { FadeIn } from "react-native-reanimated";
import ShimmerPlaceHolder from "react-native-shimmer-placeholder";
import ColorPicker from "react-native-wheel-color-picker";
import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import Storage from "../../App_Utils/Services/StorageService";

// ==========================
// Constants
// ==========================
const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 32 - 0) / 4;

//const ROLE = "ADMIN";

// ==========================
// Utility Functions
// ==========================
/**
 * Split an array into chunks of given size.
 * @param {Array} array - The array to chunk.
 * @param {number} size - The chunk size.
 * @returns {Array[]} - Array of chunks.
 */
const chunkArray = (array, size) =>
  array.reduce((acc, _, i) => {
    if (i % size === 0) acc.push(array.slice(i, i + size));
    return acc;
  }, []);

// ==========================
// MenuCard Component
// ==========================

function MenuCard({
  item,
  index,
  color = "#dbeafe",
  setCatModalVisible,
  setCatModalMode,
  setCatTransid,
  setBackground,
  setImageUri,
  setName,
  SECTION,
  setcatSectionId,
  setcatSectionName,
  ROLE,
  loading,
}) {
  const nav = useNavigation();
  const [loaded, setLoaded] = useState(false);
  const imagePath =
    item?.image && typeof item.image === "string" ? item.image.slice(2) : "";
  var uri = { uri: getImageUrl(imagePath) };
  if (item.name == "Add New Category" && ROLE == "ADMIN") {
    uri = item.image;
  }
  return (
    <Animated.View
      entering={FadeIn.delay((index % 4) * 100)}
      style={{ width: CARD_SIZE }}
      className="place-items-center"
    >
      <TouchableOpacity
        onPress={() => {
          setcatSectionId(SECTION.transid);
          setcatSectionName(SECTION.name);

          if (item.name != "Add New Category") {
            nav.navigate("TypeListScreen", {
              SECTION,
              CATEGORY: item,
            });
          } else {
            setCatTransid(null);
            setName(null);
            setBackground(null);
            setImageUri(null);
            setCatModalMode("add");
            setCatModalVisible(true);
          }
        }}
      >
        <ShimmerPlaceHolder
          className="rounded-lg p-2 items-center mb-1"
          style={{ borderRadius: 8, marginBottom: 6 }}
          visible={loaded}
          width={CARD_SIZE * 0.95}
          height={CARD_SIZE * 0.95}
        >
          <View
            className="relative rounded-lg p-2 items-center"
            style={{
              backgroundColor: color,
              width: CARD_SIZE * 0.95,
              height: CARD_SIZE * 0.95,
            }}
          >
            <Image
              cachePolicy="disk"
              className="rounded-lg flex-1"
              source={uri}
              onLoadEnd={() => setLoaded(true)}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />

            {ROLE == "ADMIN" && item.name != "Add New Category" && (
              <TouchableOpacity
                onPress={() => {
                  console.log(item);
                  // setEditingId(cat.id);
                  setcatSectionId(SECTION.transid);
                  setcatSectionName(SECTION.name);
                  setName(item.name);
                  setBackground(item?.background);
                  setImageUri(item.image);
                  setCatTransid(item.transid);
                  setCatModalMode("edit");
                  setCatModalVisible(true);
                }}
                className="absolute top-1 right-1 w-8 h-8 rounded-lg justify-center items-center bg-red-500"
              >
                <MaterialCommunityIcons name="pencil" size={14} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </ShimmerPlaceHolder>

        {/* Text placeholder with shimmer until loaded */}
        <ShimmerPlaceHolder
          style={{ borderRadius: 4 }}
          visible={loading}
          width={CARD_SIZE * 0.9}
          height={12}
        >
          <Text className="text-sm font-semibold text-center -ml-1">
            {item.name}
          </Text>
        </ShimmerPlaceHolder>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ==========================
// MenuViewComponent
// ==========================
export default function MenuViewComponent({ MENU, loading }) {
  // Loading context
  const { setLoading } = useLoading();

  const nav = useNavigation();

  // State declarations
  const [search, setSearch] = useState("");
  const [sectionsData, setSectionsData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [CatmodalVisible, setCatModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [CatmodalMode, setCatModalMode] = useState("add"); // 'add' or 'edit'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [sectionName, setSectionName] = useState(null);
  const [catsectionID, setcatSectionId] = useState(null);
  const [catsectionName, setcatSectionName] = useState(null);
  const [catTransid, setCatTransid] = useState(null);
  const [menuName, setMenuName] = useState(null);
  const [menuID, setMenuId] = useState("");
  const [sectionColor, setSectionColor] = useState("#ffffff");

  const [ROLE, setROLE] = useState(null);

  const [name, setName] = useState(null);
  const [background, setBackground] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  // ==========================
  // Effect: Initialize when MENU prop changes
  // ==========================
  const getRole = async () => {
    var ROLE = await Storage.getData("ROLE");
    console.log();
    setROLE(ROLE);
  };

  useEffect(() => {
    getRole();
  }, []);
  useEffect(() => {
    if (MENU) {
      getRole();
      setMenuName(MENU.name);
      setMenuId(MENU.id);
      if (MENU.sections) {
        GetSectionData(MENU.id);
        //console.log(MENU.id);
      }
    }
  }, [MENU]);

  // ==========================
  // API: Fetch sections for a menu
  // ==========================
  const GetSectionData = async (id) => {
    setLoading(true, "Fetching  Sections");
    try {
      const menusectioncategorysdata = await API.GET(
        "MenuSectionCategory/" + id
      );
      if (
        menusectioncategorysdata &&
        menusectioncategorysdata.Response &&
        menusectioncategorysdata.Response.length > 0 &&
        menusectioncategorysdata.Response[0].sections
      ) {
        setSectionsData(menusectioncategorysdata.Response[0].sections);
      } else {
        setSectionsData([]);
        console.warn("No sections data found for menu ID:", id);
      }
    } catch (error) {
      console.error("Error fetching section data:", error);
      Alert.alert("Error", "Failed to fetch menu sections.");
      setSectionsData([]);
    } finally {
      setLoading(false);
    }
  };

  const addnewcategory = async () => {
    try {
      let profilePath = "";

      try {
        if (fileInfo) {
          setLoading(true, "Uploading Category Image");
          const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
            path: "Category",
          });
          console.log(uploadRes)
          profilePath = uploadRes.virtualPath;
          setFileInfo(null);
        } else {
          profilePath = "No File Uploaded";
        }
      } catch(e) 
      {
        console.log(e)
        profilePath = "File Not Uploaded";
      } finally {
        setLoading(false);
      }

      setLoading(true, "Adding New Category");
      const data = {
        name: name,
        image: profilePath,
        sectionid: catsectionID,
        sectionname: catsectionName,
        menuid: menuID,
        menuname: menuName,
        rcu: "ADMIN",
      };
      console.log(data, "Category Menu");
      const res = await API.POST("Category", data);
      GetSectionData(MENU.id);
      console.log(res);
      //fetchData();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const updatecategory = async () => {
    try {
      var profilePath = "";
      try {
        if (fileInfo) {
          setLoading(true, "Updating Category Image");
          const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
            path: "Category",
          });
          profilePath = uploadRes.virtualPath;
          setFileInfo(null);
        } else {
          profilePath = imageUri;
        }
      } catch {
        profilePath = "File Not Uploaded";
      } finally {
        setLoading(false);
      }
      console.log(profilePath);
      setLoading(true, "Updating Category");
      const data = {
        transid: catTransid,
        name: name,
        image: profilePath,
        sectionid: catsectionID,
        sectionname: catsectionName,
        menuid: menuID,
        menuname: menuName,
        luu: "ADMIN",
      };
      console.log(data, "Category Menu");
      const res = await API.PUT("Category", data);
      GetSectionData(MENU.id);
      console.log(res);
      //fetchData();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const deletecategory = async () => {
    try {
      setLoading(true, "Deleting Category");
      const data = {
        transid: catTransid,
      };
      console.log(data);
      const res = await API.DELETE("Category", data);
      GetSectionData(MENU.id);
      console.log(res);
      //fetchData();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.cancelled) return;
    //const file = "assets" in result ? result.assets[0] : result;

    const file = {
      uri: result.assets[0].uri,
      name: result.assets[0].name,
      type: result.assets[0].mimeType,
    };
    setImageUri(file.uri);
    setFileInfo(file);
  };

  const handleUpdate = () => {
    // your update logic…
    setCatModalVisible(false);
  };

  // ==========================
  // API: Add a new section
  // ==========================
  const AddSection = async () => {
    setLoading(true, "Adding New Section");
    try {
      const newsection = await API.POST("Section", {
        name: sectionName,
        image: sectionColor,
        menuname: menuName,
        menuid: menuID,
      });
      if (newsection) {
        GetSectionData(menuID);
      } else {
        Alert.alert("Error", "Failed to add new section.");
        console.error("Error adding section:", newsection);
      }
    } catch (error) {
      console.error("Error adding section:", error);
      Alert.alert("Error", "Failed to add new section.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // API: Update an existing section
  // ==========================
  const UpdateSection = async () => {
    setLoading(true, "Updating Section");
    try {
      const updatesection = await API.PUT("Section", {
        transid: selectedIndex,
        name: sectionName,
        image: sectionColor,
        menuname: menuName,
        menuid: menuID,
      });
      if (updatesection) {
        GetSectionData(menuID);
      } else {
        Alert.alert("Error", "Failed to update section.");
        console.error("Error updating section:", updatesection);
      }
    } catch (error) {
      console.error("Error updating section:", error);
      Alert.alert("Error", "Failed to update section.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // API: Delete a section
  // ==========================
  const DeleteSection = async (section) => {
    const delsection = await API.DELETE("Section", {
      transid: section.transid,
    });
    // console.log(delsection);
    GetSectionData(menuID);
  };

  // ==========================
  // Handlers: Modal open/close
  // ==========================
  const openAddModal = () => {
    setModalMode("add");
    setSectionName("");
    setSectionColor("#ffffff");
    setSelectedIndex(null);
    setModalVisible(true);
  };

  const openEditModal = (section) => {
    setModalMode("edit");
    setSectionName(section.name);
    setSectionColor(section.image);
    setSelectedIndex(section.transid);
    setModalVisible(true);
  };

  // ==========================
  // Handler: Delete confirmation
  // ==========================
  const handleDelete = async (section) => {
    Alert.alert(
      "Delete Section",
      "Are you sure you want to delete this section?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true, "Deleting Section");
            try {
              const delsection = await API.DELETE("Section", {
                transid: section.transid,
              });
              if (delsection) {
                GetSectionData(menuID);
              } else {
                Alert.alert("Error", "Failed to delete section.");
                console.error("Error deleting section:", delsection);
              }
            } catch (error) {
              console.error("Error deleting section:", error);
              Alert.alert("Error", "Failed to delete section.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ==========================
  // Handler: Save from modal
  // ==========================
  const handleSave = async () => {
    if (!sectionName.trim()) {
      Alert.alert("Validation Error", "Section name cannot be empty.");
      return;
    }

    if (modalMode === "add") {
      await AddSection();
    } else if (modalMode === "edit" && selectedIndex !== null) {
      UpdateSection();
    }

    setModalVisible(false);
  };

  // ==========================
  // Prepare data for SectionList (apply search + chunking)
  // ==========================
  // const sections = sectionsData?.map((section) => ({
  //   transid: section.transid,
  //   name: section.name,
  //   image: section.image,
  //   data: chunkArray(
  //     INITIAL_SECTIONS[0].data.filter((item) =>
  //       item.name.toLowerCase().includes(search.toLowerCase())
  //     ),
  //     4
  //   ),
  // }));

  // const sections = sectionsData?.map((section) => ({
  //   transid: section.transid,
  //   name: section.name,
  //   image: section.image,
  //   data: chunkArray(
  //     section.categories.filter((item) =>
  //       item.name.toLowerCase().includes(search.toLowerCase())
  //     ),
  //     4
  //   ),
  // } ));

  const addNewCategoryItem = {
    name: "Add New Category",
    image: require("../../assets/addnewcategory.webp"),
  };

  const sections = sectionsData?.map((section) => {
    // Filter matching items
    const filteredCategories = section.categories.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );

    var updatedCategories = filteredCategories;
    // Insert the new item at the beginning
    if (ROLE == "ADMIN") {
      updatedCategories = [addNewCategoryItem, ...filteredCategories];
    }
    return {
      transid: section.transid,
      name: section.name,
      image: section.image,
      data: chunkArray(updatedCategories, 4),
    };
  });

  const getProfileUri = () => {
    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    return getImageUrl(imageUri);
  };
  // ==========================
  // Render
  // ==========================
  return (
    <View className="flex-1 bg-white  p-3">
      {/* Add Section Button */}
      {ROLE == "ADMIN" && (
        <View className="mb-2">
          <Button title="Add Section" onPress={openAddModal} />
        </View>
      )}
      {/* Sections List */}
      <SectionList
        sections={sections}
        keyExtractor={(row, i) =>
          row.map((it) => it.transid + row.name + row.id).join("_") + i
        }
        renderSectionHeader={({ section, index }) => (
          <View className="flex-row justify-between items-center mb-2">
            <View style={{ flex: 1 }}>
              <Text className="text-2xl font-bold">{section.name}</Text>
            </View>
            {ROLE == "ADMIN" && (
              <View className="flex-row">
                {true && (
                  <TouchableOpacity
                    onPress={() => openEditModal(section)}
                    className="px-2"
                  >
                    <Ionicons name="pencil" size={20} color="black" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(section)}
                  className="px-2"
                >
                  <Ionicons name="trash" size={20} color="red" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        renderItem={({ item: rowItems, section }) => (
          <View
            className="justify-between"
            style={{
              flexDirection: "row",
              marginBottom: 12,
            }}
          >
            {true &&
              rowItems.map((card, idx) => (
                <MenuCard
                  name={card.name}
                  item={card}
                  index={idx}
                  setCatModalVisible={setCatModalVisible}
                  setName={setName}
                  setBackground={setBackground}
                  setImageUri={setImageUri}
                  setCatModalMode={setCatModalMode}
                  SECTION={section}
                  setcatSectionId={setcatSectionId}
                  setcatSectionName={setcatSectionName}
                  setCatTransid={setCatTransid}
                  ROLE={ROLE}
                  loading={loading}
                />
              ))}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Section Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="bg-white rounded-lg p-4 h-full">
            <Text className="text-xl font-semibold mb-2">
              {CatmodalMode === "add" ? "Add Section" : "Edit Section"}
            </Text>
            <TextInput
              placeholder="Section Name"
              value={sectionName}
              onChangeText={setSectionName}
              className="border p-2 mb-4 rounded"
            />
            <Text className="mb-2">Pick Background Color:</Text>
            <ColorPicker
              color={sectionColor}
              onColorChangeComplete={setSectionColor}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={true}
            />
            <View className="flex-row justify-end mt-4">
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <View className="w-4" />
              <Button title="Save" onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={CatmodalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModalMode(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="w-full bg-white rounded-lg p-4">
            <Text className="text-lg font-bold mb-4">Edit Item</Text>

            <Text className="mb-1">Name</Text>
            <TextInput
              className="border border-gray-300 rounded-md px-3 py-2 mb-4"
              value={name}
              onChangeText={setName}
            />

            {/* <Text className="mb-1">Background Color</Text>
            <TextInput
              className="border border-gray-300 rounded-md px-3 py-2 mb-4"
              value={background}
              onChangeText={setBackground}
            /> */}

            <Text className="mb-1">Image</Text>
            <TouchableOpacity
              className="border border-gray-300 rounded-md aspect-square w-full mb-4 justify-center items-center"
              onPress={pickImage}
            >
              {getProfileUri() ? (
                <Image
                  cachePolicy="disk"
                  source={{
                    uri: getProfileUri(),
                  }}
                  className="w-full h-full rounded-md"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Text>Select Image</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setCatModalVisible(false)}
                className="px-4 py-2"
              >
                <Text className="text-blue-500">Cancel</Text>
              </TouchableOpacity>

              {CatmodalMode == "edit" ? (
                <>
                  <TouchableOpacity
                    onPress={async () => {
                      setCatModalVisible(false);
                      await deletecategory();
                    }}
                    className="px-4 py-2"
                  >
                    <Text className="text-red-500">Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      setCatModalVisible(false);
                      await updatecategory();
                    }}
                    className="px-4 py-2"
                  >
                    <Text className="text-blue-500">Update</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    setCatModalVisible(false);
                    await addnewcategory();
                  }}
                  className="px-4 py-2"
                >
                  <Text className="text-blue-500">Add Category</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
