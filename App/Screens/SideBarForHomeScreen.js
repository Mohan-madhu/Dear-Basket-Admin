import React, { useEffect, useState, useRef } from "react"; // Added useRef
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  Modal,
  Alert,
  Animated, // Added Animated
  Easing,
  Pressable, // Added Easing
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Storage from "../../App_Utils/Services/StorageService";
import TypeListDetails from "../Components/TypeListDetails";
import { Image } from 'expo-image';
import { useSelector } from "react-redux";
//const ROLE = "ADMIN";
export default function SidebarScreen(data) {
  const { setLoading } = useLoading();
  const route = useRoute();
  const { SECTION, CATEGORY } = route.params;
  const navigation = useNavigation();
  //console.log(CATEGORY)
  const [searchVisible, setSearchVisible] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [CatmodalMode, setCatModalMode] = useState("add");
  // Modal states
  const [catModalVisible, setCatModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [transid, settransid] = useState(null);
  const [ROLE, setROLE] = useState(null);
  const [typedata, setTypeData] = useState([]);

  const scrollRef = useRef(null); // Initialize the scrollRef
  const animation = useRef(new Animated.Value(0)).current; // Initialize the animation value



  const cart = useSelector((state) => state.cart.cart);

  const total = cart
    .map((item) => item.price * item.orderquantity)
    .reduce((cur, prev) => cur + prev, 0);


  useEffect(() => {
    if (menuItems.length > 0 && selectedId === null) {
      setSelectedId(menuItems[0].transid);
    }
  }, [menuItems]);

  // useEffect(() => {
  //   if (selectedId && scrollRef.current) {
  //     const index = menuItems.findIndex((item) => item.transid === selectedId);
  //     if (index !== -1) {
  //       const itemHeight = 76;
  //       const scrollToY = index * itemHeight;

  //       scrollRef.current.scrollTo({ y: scrollToY, animated: true });

  //       // Reset animation value at the start
  //       animation.setValue(0);

  //       // Trigger the animation for the selected item
  //       Animated.timing(animation, {
  //         toValue: 1,
  //         duration: 400,
  //         easing: Easing.easeInOut,
  //         useNativeDriver: true,
  //       }).start(() => {
  //         // Optionally reset the animation after it completes (though the translateY is now conditional)
  //         // Animated.timing(animation, {
  //         //   toValue: 0,
  //         //   duration: 150,
  //         //   easing: Easing.linear,
  //         //   useNativeDriver: true,
  //         // }).start();
  //       });
  //     } else {
  //       // If no item is selected, reset the animation
  //       animation.setValue(0);
  //     }
  //   } else {
  //     // If scrollRef is not yet available, reset the animation
  //     animation.setValue(0);
  //   }
  // }, [selectedId, menuItems, animation]);

  const hasAnimated = useRef(false);

  useEffect(() => {
    // if there's no selection, or we're still on mount, do nothing
    if (!selectedId || !scrollRef.current || !hasAnimated.current) {
      hasAnimated.current = true;
      return;
    }

    const index = menuItems.findIndex((i) => i.transid === selectedId);
    if (index === -1) return;

    const itemHeight = 76;
    scrollRef.current.scrollTo({ y: index * itemHeight, animated: true });

    // reset + run
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 200,
      easing: Easing.easeInOut,
      useNativeDriver: true,
    }).start();
  }, [selectedId, menuItems]);

  const handleBackPress = () => {
    if (searchVisible) {
      setSearchVisible(false);
    } else {
      navigation.goBack();
    }
  };

  const GetTypeData = async (id = CATEGORY.transid) => {
    setLoading(true, "Fetching Types");
    try {
      const typedata = await API.GET("Type/" + id);
      if (typedata && typedata.Response && typedata.Response.length > 0) {
        setTypeData(typedata.Response);
        setMenuItems(typedata.Response);
        //setSelectedId(typedata.Response[0].transid);
     //   console.log(typedata.Response);
      } else {
        setTypeData([]);
        console.warn("No Types data found for menu ID:", id);
      }
    } catch (error) {
      console.error("Error fetching Type data:", error);
      Alert.alert("Error", "Failed to fetch menu Types.");
      setTypeData([]);
    } finally {
      setLoading(false);
    }
  };
  const getRole = async () => {
    setLoading(true);
    var ROLE = await Storage.getData("ROLE");
    console.log(ROLE);
    setROLE(ROLE);
    setLoading(false);
  };

  useEffect(() => {
    getRole();
  }, []);
  useEffect(() => {
    if (CATEGORY) {
      getRole();
      GetTypeData(CATEGORY.transid);
    }
  }, [CATEGORY]);

  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.cancelled) return;

    const file = {
      uri: result.assets[0].uri,
      name: result.assets[0].name,
      type: result.assets[0].mimeType,
    };

    setImageUri(file.uri);
    setFileInfo(file);
  };

  const addNewType = async () => {
    setCatModalVisible(false);
    if (name && imageUri) {
      try {
        let profilePath = "";

        try {
          if (fileInfo) {
            setLoading(true, "Uploading Type Image");
            const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
              path: "Type",
            });
            profilePath = uploadRes.virtualPath;
            setFileInfo(null);
          } else {
            profilePath = "No File Uploaded";
          }
        } catch {
          profilePath = "File Not Uploaded";
        } finally {
          setLoading(false);
        }

        setLoading(true, "Adding New Type");
        const data = {
          name: name,
          image: profilePath,
          categoryname: CATEGORY.name,
          categoryid: CATEGORY.transid,
          sectionid: CATEGORY.sectionid,
          sectionname: CATEGORY.sectionname,
          menuid: CATEGORY.menuid,
          menuname: CATEGORY.menuname,
          rcu: "ADMIN",
        };

        console.log("Adding Type Data:", data);
        console.log(data, "Type Menu");
        const res = await API.POST("Type", data);
        GetTypeData();
        console.log(res);
        //fetchData();
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }

      setName("");
      setImageUri(null);
    }
  };

  const updateType = async (selectedId) => {
    try {
      var profilePath = "";

      try {
        if (fileInfo) {
          setLoading(true, "Updating Type Image");
          const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
            path: "Type",
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
      setLoading(true, "Updating Type");

      const data = {
        transid: selectedId,
        name: name,
        image: profilePath,
        categoryname: CATEGORY.name,
        categoryid: CATEGORY.transid,
        sectionid: CATEGORY.sectionid,
        sectionname: CATEGORY.sectionname,
        menuid: CATEGORY.menuname,
        menuname: CATEGORY.menuid,
        luu: "ADMIN",
      };

      const res = await API.PUT("Type", data);
      GetTypeData();
      console.log(res);
      //fetchData();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (selectedId) => {
    Alert.alert("Delete Type", "Are you sure you want to delete this Type?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true, "Deleting Type");
          try {
            console.log(selectedId);
            const delType = await API.DELETE("Type", {
              transid: selectedId,
            });
            if (delType) {
              GetTypeData();
            } else {
              Alert.alert("Error", "Failed to delete Type.");
              console.error("Error deleting Type:", delType);
            }
          } catch (error) {
            console.error("Error deleting Type:", error);
            Alert.alert("Error", "Failed to delete Type.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const getTypeUri = () => {
    if (!imageUri) return null;
    if (imageUri.startsWith("file://")) return imageUri;
    if (imageUri.startsWith("http")) return imageUri;
    return "https://dev.dine360.ca/backend/" + imageUri.replace(/^\/+/, "").slice(2);
  };

  ;
  // }

  const DetailsPane = React.memo(function DetailsPane({ item }) {
    return <TypeListDetails item={item} />;
  });

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-white px-4 pt-10 pb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={handleBackPress}
              className="w-10 h-10 justify-center items-center mr-2"
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>

            {!searchVisible && (
              <Text className="text-2xl font-bold text-black">
                {CATEGORY.name}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setSearchVisible(true)}
            className="w-10 h-10 justify-center items-center"
          >
            <Ionicons name="search" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {searchVisible && (
          <View className="mt-2 bg-gray-100 rounded-md px-3 py-1">
            <TextInput
              autoFocus
              placeholder="Search…"
              placeholderTextColor="#888"
              className="text-gray-800"
            />
          </View>
        )}
      </View>

      {/* Main content */}
      <View className="flex-row flex-1">
        {/* Sidebar */}
        <ScrollView
          ref={scrollRef} // Attach the ref here
          style={{ width: "25%" }}
          className="bg-white border-r border-gray-200 pt-6"
          contentContainerStyle={{ alignItems: "center", paddingVertical: 10 }} // Added paddingVertical
          showsVerticalScrollIndicator={false}
        >
          {ROLE == "ADMIN" && (
            <TouchableOpacity
              className="items-center mb-6"
              onPress={() => {
                setCatModalVisible(true);
                setCatModalMode("add");
                setName(null);
                setImageUri(null);
              }}
            >
              <View className="w-16 h-16 rounded-full bg-gray-200 justify-center items-center mb-1">
                <Ionicons name="add" size={24} color="black" />
              </View>
              <Text className="text-xs text-gray-600">Add New</Text>
            </TouchableOpacity>
          )}
          {/* {menuItems.map((item) => {
            const isActive = item.transid === selectedId;
            const imageAnimatedStyle = {
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, isActive ? -5 : 0], // Only move up if active
                  }),
                },
              ],
            };

            return (
              <TouchableOpacity
                key={item.transid}
                className={`items-center mb-6 ${isActive ? "" : "opacity-90"}`}
                onPress={() => setSelectedId(item.transid)}
              >
                <Animated.View className="relative" >
                  <Animated.Image // Animate the Image directly
                    source={{
                      uri: `https://dev.dine360.ca/backend/${item.image.slice(2)}`,
                    }}
                    className="w-16 h-16 rounded-full mb-1 bg-red-800"
                    style={imageAnimatedStyle}
                  />
                  {ROLE == "ADMIN" && (
                    <TouchableOpacity
                      onPress={() => {
                        setName(item.name);
                        setFileInfo(null);
                        setImageUri(item.image);
                        settransid(item.transid);
                        setCatModalMode("edit");
                        setCatModalVisible(true);
                      }}
                      className="absolute top-0 right-0 w-6 h-6 rounded-full justify-center items-center bg-red-500"
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={14}
                        color="white"
                      />
                    </TouchableOpacity>
                  )}
                </Animated.View>
                <Text
                  className={`text-xs ${
                    isActive ? "text-blue-600" : "text-gray-600"
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })} */}

          {menuItems.map((item) => {
            const isActive = item.transid === selectedId;
            const imageAnimatedStyle = {
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, isActive ? -5 : 0], // Move up if active
                  }),
                },
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, isActive ? 1.1 : 1], // Scale up if active
                  }),
                },
              ],
            };

            return (
              <TouchableOpacity
                key={item.transid}
                className={`items-center mb-6 ${isActive ? "" : "opacity-90"}`}
                onPress={() => setSelectedId(item.transid)}
              >
                <View className="relative w-16 h-16 rounded-full mb-1 bg-transparent justify-center items-center">
                  {/* Background View */}
                  <Animated.Image // Animate the Image directly
                    source={{
                      uri: `https://dev.dine360.ca/backend/${item.image.slice(2)}`,
                    }}
                    className="w-full h-full rounded-full" // Make the image fill the container
                    style={imageAnimatedStyle}
                    resizeMode="contain" // Or 'cover' depending on your image aspect ratio
                  />
                  {ROLE == "ADMIN" && (
                    <TouchableOpacity
                      onPress={() => {
                        setName(item.name);
                        setFileInfo(null);
                        setImageUri(item.image);
                        settransid(item.transid);
                        setCatModalMode("edit");
                        setCatModalVisible(true);
                      }}
                      className="absolute top-0 right-0 w-6 h-6 rounded-full justify-center items-center bg-red-500"
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={14}
                        color="white"
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <Text
                  className={`text-center text-xs ${isActive ? "text-blue-600" : "text-gray-600"
                    }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Right Pane */}
        {/* <View style={{ width: "82%" }} className="bg-gray-50">
          <TypeListDetails
            item={menuItems.find((i) => i.transid === selectedId)}
          />
        </View> */}
        {/* Right Pane */}
        <View style={{ width: "82%" }} className="bg-gray-50">
          {/* <DetailsPane item={menuItems.find((i) => i.transid === selectedId)} /> */}
          <TypeListDetails
            item={menuItems.find((i) => i.transid === selectedId)}
          />
        </View>
      </View>

      {total === 0 ? null : (
        <Pressable
          className="bg-[#00A877] w-[90%] p-3 mx-auto mb-5 absolute left-5 bottom-1 rounded-lg"
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


      {/* Modal */}
      <Modal
        visible={catModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="w-full bg-white rounded-lg p-4">
            <Text className="text-lg font-bold mb-4">Add New Type</Text>

            <Text className="mb-1">Name</Text>
            <TextInput
              className="border border-gray-300 rounded-md px-3 py-2 mb-4"
              value={name}
              onChangeText={setName}
              placeholder="Enter Type name"
            />

            <Text className="mb-1">Image</Text>
            <TouchableOpacity
              className="border border-gray-300 rounded-md aspect-square w-full mb-4 justify-center items-center"
              onPress={pickImage}
            >
              {getTypeUri() ? (
                <Image cachePolicy="disk"
                  source={{ uri: getTypeUri() }}
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
                      await handleDelete(transid);
                    }}
                    className="px-4 py-2"
                  >
                    <Text className="text-red-500">Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      setCatModalVisible(false);
                      await updateType(transid);
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
                    await addNewType();
                  }}
                  className="px-4 py-2"
                >
                  <Text className="text-blue-500">Add Type</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}
