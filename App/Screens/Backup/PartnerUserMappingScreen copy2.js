import React, { useEffect, useState } from "react";
import { Config } from "../../../config";
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, Pressable } from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Linking } from "react-native";
import { Image } from 'expo-image';

const PartnerUserMappingScreen = () => {
  const [partners, setPartners] = useState([]);
  const [allusers, setallusers] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const { setLoading } = useLoading();

  // Fetch all partners
  const fetchPartners = async () => {
    try {
      setLoading(true, "Fetching partners...");
      const res = await API.GET("User");
      setallusers(res.Response)
      const partnerUsers = res.Response.filter(user =>
        user.usertype.toLowerCase() === "partner"
      );
      const Users = res.Response.filter(user =>
        user.usertype.toLowerCase() === "user"
      );
      setUsers(Users

      )
      console.log(Users)
      //console.log(partnerUsers);
      setPartners(partnerUsers);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch partners");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };




  function GetUsersForSelectedPartner(partnerid) {
    var selectedusers = users.filter(user =>
      user.mappedpartnerid === partnerid
    );
    return selectedusers.length;
  }
  function GetUserData(userid) {
    //  console.log(userid)
    var selecteduser = allusers.filter(user =>
      user.transid === userid
    );
    // console.log(selecteduser)
    return selecteduser[0];
  }



  // Fetch customers for a specific partner
  const fetchPartnerCustomers = async (partnerId) => {
    try {
      setLoading(true, "Fetching customers...");
      const res = await API.GET("DailyMilkRegistration");
      const partnerCustomers = res.Response;
      //  console.log(partnerCustomers)
      setCustomers(partnerCustomers);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch customers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle partner selection
  const handlePartnerSelect = async (partner) => {
    setSelectedPartner(partner);
    setSelectedCustomers([]);
    await fetchPartnerCustomers(partner.transid);
  };

  // Handle customer selection toggle
  const toggleCustomerSelect = (customerId) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Open maps with coordinates
  const openMaps = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert("Error", "Location coordinates not available");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(err => {
      Alert.alert("Error", "Could not open maps");
      console.error(err);
    });
  };

  // Save selected customers
  const handleSaveCustomers = async () => {
    if (selectedCustomers.length === 0) {
      Alert.alert("Info", "Please select at least one customer");
      return;
    }


    const res = await API.PUT("User/partner-user-mapping", {
      partnerid: selectedPartner.transid,
      userids: selectedCustomers,
    });

    console.log(selectedCustomers)
    console.log(res);


    Alert.alert(
      "Confirm",
      `Assign ${selectedCustomers.length} customers to ${selectedPartner.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            Alert.alert("Success", "Customers assigned successfully");
            setSelectedPartner(null);
            setSelectedCustomers([]);
            fetchPartners()
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const renderProfileImage = (profile) => {

    if (!profile || profile === "No File Uploaded") {
      return (
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center border border-gray-200 mr-4">
          <Icon name="person" size={28} color="#6b7280" />
        </View>
      );
    }


    if (profile.startsWith("~/") || profile.startsWith("/")) {
      var profileurl = Config.BASE_URL + profile?.slice(1)
      //   console.log(profileurl)
      return (

        <Image
          source={{ uri: profileurl }}
          contentFit="cover"

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
        style={{ width: 80, height: 80, borderRadius: 9999, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 16, backgroundColor: 'red' }}
      />
    );


  };

  const CustomCheckbox = ({ value, onValueChange, disabled }) => {
    //console.log(disabled);  // Log disabled value for debugging

    return (
      <Pressable
        disabled={disabled}  // Ensure Pressable is actually disabled
        onPress={!disabled ? onValueChange : null}  // Disable onPress when disabled is true
        className={`w-6 h-6 rounded-md border-2 items-center justify-center ${value ? "bg-blue-500 border-blue-500" : "border-gray-400"} ${disabled ? "opacity-50" : ""}`}
      >
        {value && <Icon name="check" size={16} color="white" />}
      </Pressable>
    );
  };


  useEffect(() => {
    // Update selectedCustomers only if needed
    const newSelectedCustomers = customers
      .filter(customer =>
        GetUserData(customer.userid).mappedpartnerid === selectedPartner?.transid &&
        !selectedCustomers.includes(customer.userid)
      )
      .map(customer => customer.userid);

    if (newSelectedCustomers.length > 0) {
      setSelectedCustomers(prev => [...prev, ...newSelectedCustomers]);
    }
  }, [customers, selectedPartner]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="px-4  pt-10">
        {partners.length === 0 ? (
          <View className="items-center justify-center mt-16 py-8">
            <View className="bg-gray-100 p-6 rounded-full">
              <Icon name="group" size={48} color="#9ca3af" />
            </View>
            <Text className="text-gray-500 text-lg mt-6 font-medium">
              No partners found
            </Text>
            <Text className="text-gray-400 mt-1 text-center">
              There are currently no partner users in the system
            </Text>
          </View>
        ) : (
          <View className="pb-6">
            {partners.map((partner, index) => (
              <Animated.View
                key={partner.transid}
                entering={FadeIn.delay(100 * index)}
                exiting={FadeOut}
                layout={Layout.springify()}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4"
              >
                <TouchableOpacity
                  onPress={() => handlePartnerSelect(partner)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row space-x-4">
                    {renderProfileImage(partner.profile)}

                    <View className="flex-1">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-gray-800">
                            {partner.name}
                          </Text>
                          <Text className="text-gray-500 text-sm mt-1">
                            ID: {partner.transid.substring(0, 8)}...
                          </Text>
                          <View className="flex-row items-center mt-2">
                            <Icon name="phone" size={16} color="#6b7280" />
                            <Text className="text-gray-600 ml-1.5">
                              {partner.mobile}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${partner.status === 1
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                            }`}
                        >
                          {partner.status === 1 ? "Active" : "Inactive"}
                        </Text>
                      </View>

                      <View className="mt-3 space-y-1">
                        <View className="flex-row items-center">
                          <Icon name="people" size={16} color="#6b7280" />
                          <Text className="text-gray-600 ml-2">
                            Customers:
                            {" " + GetUsersForSelectedPartner(partner.transid)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal
        visible={!!selectedPartner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedPartner(null)}
      >
        <View className="flex-1 bg-white p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-800">
              {selectedPartner?.name}'s Customers
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedPartner(null)}
              className="p-2"
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            {customers.length === 0 ? (
              <View className="items-center justify-center mt-16 py-8">
                <View className="bg-gray-100 p-6 rounded-full">
                  <Icon name="person-off" size={48} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 text-lg mt-6 font-medium">
                  No customers found
                </Text>
                <Text className="text-gray-400 mt-1 text-center">
                  This partner has no assigned customers
                </Text>
              </View>
            ) : (

              <View className="space-y-3">
                {customers.map(customer => {

                  return (
                    <Pressable
                      key={customer?.transid}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                      onPress={
                        GetUserData(customer.userid).mappedpartnerid
                          ? GetUserData(customer.userid).mappedpartnerid === selectedPartner?.transid
                            ? () => toggleCustomerSelect(customer.userid) // Do nothing if mappedpartnerid equals selectedPartner.transid
                            : null // Call toggleCustomerSelect if mappedpartnerid is not equal to selectedPartner.transid
                          : () => toggleCustomerSelect(customer.userid) // Call toggleCustomerSelect if mappedpartnerid is falsy
                      }
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="font-medium text-gray-800">{customer.name}</Text>
                          <Text className="text-gray-500 text-sm">{customer.mobile}</Text>
                          <Text className="text-gray-600 text-sm mt-1">{customer.address}</Text>
                          <View className="flex-row items-center mt-1">
                            <Icon name="people" size={14} color="#6b7280" />
                            <Text className="text-gray-600 text-sm ml-1">Family: {customer.familymembers}
                            </Text>
                          </View>
                        </View>
                        <CustomCheckbox
                          value={selectedCustomers.includes(customer.userid)}
                          onValueChange={() => toggleCustomerSelect(customer.userid)} // Same function to toggle checkbox
                          disabled={
                            GetUserData(customer.userid).mappedpartnerid
                              ? GetUserData(customer.userid).mappedpartnerid === selectedPartner?.transid
                                ? false
                                : true
                              : false
                          }
                        />

                      </View>

                      {GetUserData(customer.userid).mappedpartnerid && (
                        <Text className="text-red-400">
                          Already Mapped To - {GetUserData(GetUserData(customer?.userid)?.mappedpartnerid)?.name}
                        </Text>
                      )}

                      {customer.latitude && customer.longitude && (
                        <TouchableOpacity
                          className="flex-row items-center mt-2 bg-blue-50 p-2 rounded justify-center border border-blue-100"
                          onPress={() => openMaps(customer.latitude, customer.longitude)}
                        >
                          <Icon name="map" size={16} color="#3b82f6" />
                          <Text className="text-blue-600 ml-2 font-medium">View on Map</Text>
                        </TouchableOpacity>
                      )}
                    </Pressable>
                  )
                })}
              </View>

            )}
          </ScrollView>

          <View className="flex-row space-x-3 mt-4">
            <TouchableOpacity
              className="flex-1 bg-gray-200 p-3 rounded-lg items-center justify-center"
              onPress={() => setSelectedPartner(null)}
            >
              <Text className="text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-blue-500 p-3 rounded-lg items-center justify-center"
              onPress={handleSaveCustomers}
            >
              <Text className="text-white font-medium">Save ({selectedCustomers.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PartnerUserMappingScreen;