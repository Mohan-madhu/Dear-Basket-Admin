import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView, RefreshControl } from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout, SlideInRight } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Image } from 'expo-image';


const Tab = createMaterialTopTabNavigator();

const UserList = ({ users, userType }) => {
  const filteredUsers = users.filter(user =>
    user.usertype.toLowerCase() === userType.toLowerCase()
  );

  const handleUserAction = (userId, action) => {
    Alert.alert(
      "Confirm",
      `Are you sure you want to ${action} this user?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm",
          onPress: () => {
            // Handle the action here
            Alert.alert("Success", `User ${action} successfully`);
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString; // Return as-is if parsing fails
    }
  };

  const renderProfileImage = (profile) => {
    // console.log("Pro", profile)

    if (!profile || profile === "No File Uploaded") {
      return (
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center border border-gray-200 mr-4">
          <Icon name="person" size={28} color="#6b7280" />
        </View>
      );
    }


    if (profile.startsWith("~/") || profile.startsWith("/")) {
      var profileurl = "https://dev.dine360.ca/backend" + profile?.slice(1)
      console.log(profileurl)
      return (
        // <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center border border-gray-200">
        //   <Icon name="image" size={28} color="#6b7280" />
        // </View>


        <Image
          source={{ uri: profileurl }}
          contentFit="cover"
          className="m-10"
          cachePolicy="memory-disk"  // ✅ Enables caching
          style={{ width: 80, height: 80, borderRadius: 9999, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 16 }}
        />
      );
    }


    return (
      <Image
        source={{ uri: profileurl }}
        contentFit="cover"
        cachePolicy="memory-disk"  // ✅ Enables caching
        style={{ width: 80, height: 80, borderRadius: 9999, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 16 }}
      />
    );
  };

  return (
    <Animated.ScrollView
      className="bg-gray-50 px-4 pt-4"
      entering={SlideInRight.duration(300)}
      showsVerticalScrollIndicator={false}
    >
      {filteredUsers.length === 0 ? (
        <Animated.View
          className="items-center justify-center mt-16 py-8"
          entering={FadeIn.delay(100)}
          exiting={FadeOut}
        >
          <View className="bg-gray-100 p-6 rounded-full">
            <Icon
              name="person-off"
              size={48}
              color="#9ca3af"
            />
          </View>
          <Text className="text-gray-500 text-lg mt-6 font-medium">
            No {userType.toLowerCase()} users found
          </Text>
          <Text className="text-gray-400 mt-1 text-center">
            There are currently no {userType.toLowerCase()} users in the system
          </Text>
        </Animated.View>
      ) : (
        <View className="space-y-5 pb-6">
          {filteredUsers.map((user, index) => (
            <Animated.View
              key={user.transid}
              entering={FadeIn.delay(100 * index)}
              exiting={FadeOut}
              layout={Layout.springify()}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
            >
              <View className="flex-row space-x-4">

                {user.usertype !== "USER" && renderProfileImage(user.profile)}

                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-800">
                        {user.name}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        ID: {user.transid}                     </Text>
                      <View className="flex-row items-center mt-2">
                        <Icon name="phone" size={16} color="#6b7280" />
                        <Text className="text-gray-600 ml-1.5">
                          {user.mobile}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row space-x-2">
                      <Text
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.status === 1
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                      >
                        {user.status === 1 ? "Active" : "Inactive"}
                      </Text>
                      <Text
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.usertype.toLowerCase() === "admin"
                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                          : user.usertype.toLowerCase() === "partner"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-gray-50 text-gray-700 border border-gray-100"
                          }`}
                      >
                        {user.usertype.charAt(0).toUpperCase() + user.usertype.slice(1).toLowerCase()}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 space-y-2.5">
                    <View className="flex-row items-start">
                      <Icon name="home" size={16} color="#6b7280" className="mt-0.5" />
                      <Text className="text-gray-600 ml-2 flex-1" numberOfLines={2}>
                        {user.address || "Address not provided"}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Icon name="cake" size={16} color="#6b7280" />
                      <Text className="text-gray-600 ml-2">
                        DOB: {formatDate(user.dob)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Icon name="person-add" size={16} color="#6b7280" />
                      <Text className="text-gray-600 ml-2">
                        Created by: {user.rcu || "Self"}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Icon name="calendar-today" size={16} color="#6b7280" />
                      <Text className="text-gray-600 ml-2">
                        Created: {formatDate(user.rcm)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="flex-row justify-between mt-6 space-x-3">
                {/* <TouchableOpacity
                  className="flex-row items-center justify-center flex-1 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-100 active:bg-blue-100"
                  activeOpacity={0.7}
                  onPress={() => handleUserAction(user.transid, "edit")}
                >
                  <Icon name="edit" size={18} color="#3b82f6" />
                  <Text className="text-blue-600 font-medium ml-2">
                    Edit Profile
                  </Text>
                </TouchableOpacity> */}


                {/* <TouchableOpacity
                  className={`flex-row items-center justify-center flex-1 px-4 py-2.5 rounded-lg border active:opacity-80 ${
                    user.status === 1
                      ? "bg-red-50 border-red-100"
                      : "bg-green-50 border-green-100"
                  }`}
                  activeOpacity={0.7}
                  onPress={() => handleUserAction(user.transid, user.status === 1 ? "deactivate" : "activate")}
                >
                  <Icon
                    name={user.status === 1 ? "lock" : "lock-open"}
                    size={18}
                    color={user.status === 1 ? "#ef4444" : "#10b981"}
                  />
                  <Text className={`font-medium ml-2 ${
                    user.status === 1 ? "text-red-600" : "text-green-600"
                  }`}>
                    {user.status === 1 ? "Deactivate" : "Activate"}
                  </Text>
                </TouchableOpacity> */}
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </Animated.ScrollView>
  );
};

// These components are now designed to receive a 'users' prop
// and will filter them internally.
const AdminUsers = ({ users }) => <UserList users={users} userType="admin" />;
const PartnerUsers = ({ users }) => <UserList users={users} userType="partner" />;
const RegularUsers = ({ users }) => <UserList users={users} userType="user" />;

const ManageUsersScreen = () => {
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { setLoading } = useLoading();

  const fetchUsers = async () => {
    try {
      setLoading(true, "Fetching users...");
      setRefreshing(true);
      const res = await API.GET("User");
      setUsers(res.Response || []);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <View className="flex-1 bg-white">
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIndicatorStyle: {
            backgroundColor: "#3b82f6",
            height: 3,
          },
          tabBarLabelStyle: {
            fontWeight: "600",
            textTransform: "none",
            fontSize: 14,
          },
          tabBarStyle: {
            backgroundColor: "white",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          },
          tabBarItemStyle: {
            paddingHorizontal: 8,
          },
          tabBarGap: 8,
        }}
      >
        <Tab.Screen
          name="Admins"
          // Correct way to pass props to a screen component
          children={() => <AdminUsers users={users} />}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="admin-panel-settings" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Partners"
          // Correct way to pass props to a screen component
          children={() => <PartnerUsers users={users} />}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="handshake" size={22} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Users"
          // Correct way to pass props to a screen component
          children={() => <RegularUsers users={users} />}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="people" size={22} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default ManageUsersScreen;