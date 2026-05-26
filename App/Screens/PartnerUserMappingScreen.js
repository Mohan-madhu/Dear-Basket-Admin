import React, { useEffect, useState, useMemo } from "react";
import { Config } from "../../config";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  Linking,
} from "react-native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Image } from "expo-image";

const DELIVERY_TYPES = ["Morning", "Evening"];

const normalizeDeliveryType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "morning") return "Morning";
  if (normalized === "evening") return "Evening";
  return "";
};

const PartnerUserMappingScreen = () => {
  const [allusers, setAllUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState({});
  const { setLoading } = useLoading();

  const userMap = useMemo(() => {
    const map = new Map();
    allusers.forEach((user) => map.set(user.transid, user));
    return map;
  }, [allusers]);

  const partners = useMemo(
    () =>
      allusers.filter(
        (user) => String(user?.usertype || "").toLowerCase() === "partner"
      ),
    [allusers]
  );

  const users = useMemo(
    () =>
      allusers.filter(
        (user) => String(user?.usertype || "").toLowerCase() === "user"
      ),
    [allusers]
  );

  const GetUserData = (userid) => userMap.get(userid);

  const fetchPartners = async () => {
    try {
      setLoading(true, "Fetching partners...");
      const res = await API.GET("User");
      setAllUsers(res?.Response || []);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch partners");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerCustomers = async () => {
    try {
      setLoading(true, "Fetching customers...");
      const res = await API.GET("DailyMilkRegistration");
      setCustomers(res?.Response || []);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch customers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const GetUsersForSelectedPartner = (partnerid) => {
    return users.filter((user) => user.mappedpartnerid === partnerid).length;
  };

  const getSelectedDeliveryType = (customerId) => {
    return (
      deliveryTypes[customerId] ||
      normalizeDeliveryType(GetUserData(customerId)?.milkdeliverytype)
    );
  };

  const handlePartnerSelect = async (partner) => {
    setSelectedPartner(partner);
    setSelectedCustomers([]);
    setDeliveryTypes({});
    await fetchPartnerCustomers();
  };

  const toggleCustomerSelect = (customerId) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const setCustomerDeliveryType = (customerId, deliveryType) => {
    setDeliveryTypes((prev) => ({
      ...prev,
      [customerId]: deliveryType,
    }));
  };

  const openMaps = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert("Error", "Location coordinates not available");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch((err) => {
      Alert.alert("Error", "Could not open maps");
      console.error(err);
    });
  };

  const handleSaveCustomers = async () => {
    if (!selectedPartner) {
      Alert.alert("Error", "Please select a partner first");
      return;
    }

    if (selectedCustomers.length === 0) {
      Alert.alert("Info", "Please select at least one customer");
      return;
    }

    const customersMissingDeliveryType = selectedCustomers.filter(
      (customerId) => !getSelectedDeliveryType(customerId)
    );

    if (customersMissingDeliveryType.length > 0) {
      Alert.alert(
        "Info",
        "Please select Morning or Evening delivery type for all selected customers"
      );
      return;
    }

    Alert.alert(
      "Confirm",
      `Assign ${selectedCustomers.length} customers to ${selectedPartner.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setLoading(true, "Saving customer mapping...");
              await API.PUT("User/partner-user-mapping", {
                partnerid: selectedPartner.transid,
                userids: selectedCustomers,
              });

              await Promise.all(
                selectedCustomers.map((userid) => {
                  const milkdeliverytype = getSelectedDeliveryType(userid);

                  return API.PUT("User", {
                    transid: userid,
                    milkdeliverytype,
                  });
                })
              );

              Alert.alert("Success", "Customers assigned successfully");
              setSelectedPartner(null);
              setSelectedCustomers([]);
              setDeliveryTypes({});
              fetchPartners();
            } catch (err) {
              Alert.alert("Error", "Failed to save customer mapping");
              console.error(err);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (!selectedPartner) return;

    const newSelected = customers
      .filter(
        (c) =>
          GetUserData(c.userid)?.mappedpartnerid === selectedPartner?.transid &&
          !selectedCustomers.includes(c.userid)
      )
      .map((c) => c.userid);

    if (newSelected.length > 0) {
      setSelectedCustomers((prev) => [...prev, ...newSelected]);
    }

    const existingDeliveryTypes = {};
    customers.forEach((customer) => {
      const deliveryType = normalizeDeliveryType(
        GetUserData(customer.userid)?.milkdeliverytype
      );
      if (deliveryType) {
        existingDeliveryTypes[customer.userid] = deliveryType;
      }
    });

    setDeliveryTypes((prev) => ({
      ...existingDeliveryTypes,
      ...prev,
    }));
  }, [customers, selectedPartner, selectedCustomers, userMap]);

  const renderProfileImage = (profile) => {
    if (!profile || profile === "No File Uploaded") {
      return (
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center border border-gray-200 mr-4">
          <Icon name="person" size={28} color="#6b7280" />
        </View>
      );
    }

    const profileurl =
      profile.startsWith("~/") || profile.startsWith("/")
        ? Config.BASE_URL + profile.slice(1)
        : profile;

    return (
      <Image
        source={{ uri: profileurl }}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={{
          width: 80,
          height: 80,
          borderRadius: 9999,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          marginRight: 16,
        }}
      />
    );
  };

  const CustomCheckbox = ({ value, onValueChange, disabled }) => (
    <Pressable
      disabled={disabled}
      onPress={!disabled ? onValueChange : null}
      className={`w-6 h-6 rounded-md border-2 items-center justify-center ${value ? "bg-blue-500 border-blue-500" : "border-gray-400"
        } ${disabled ? "opacity-50" : ""}`}
    >
      {value && <Icon name="check" size={16} color="white" />}
    </Pressable>
  );

  const DeliveryTypeSelector = ({ value, onChange, disabled }) => (
    <View className="mt-3">
      <Text className="text-[11px] text-gray-500 font-semibold mb-1.5">
        Delivery Type
      </Text>
      <View className="flex-row">
        {DELIVERY_TYPES.map((type) => {
          const isActive = value === type;

          return (
            <TouchableOpacity
              key={type}
              disabled={disabled}
              activeOpacity={0.85}
              onPress={() => onChange(type)}
              className={`flex-1 px-3 py-2 rounded-lg border mr-2 ${isActive
                ? "bg-blue-500 border-blue-500"
                : "bg-white border-gray-200"
                } ${disabled ? "opacity-50" : ""}`}
            >
              <Text
                className={`text-center text-xs font-semibold ${isActive ? "text-white" : "text-gray-700"
                  }`}
              >
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="px-4 pt-10">
        <Animated.View
          entering={FadeIn.duration(500)}
          exiting={FadeOut}
          layout={Layout.springify()}
          className="mb-6"
        >
          <Text className="text-2xl font-bold text-gray-800">
            Partner - Customer Mapping
          </Text>
          <Text className="text-gray-500 mt-1">
            Assign customers to partner users
          </Text>
        </Animated.View>

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
                            Customers:{" "}
                            {GetUsersForSelectedPartner(partner.transid)}
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

      {/* Modal */}
      <Modal
        visible={!!selectedPartner}
        animationType="slide"
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
                  No daily milk customers are available to assign
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {customers.map((customer) => {
                  const userData = GetUserData(customer.userid);
                  const isMappedToOther =
                    userData?.mappedpartnerid &&
                    userData.mappedpartnerid !== selectedPartner?.transid;
                  const isSelected = selectedCustomers.includes(customer.userid);

                  return (
                    <View
                      key={customer.transid}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="font-medium text-gray-800">
                            {customer.name}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {customer.mobile}
                          </Text>
                          <Text className="text-gray-600 text-sm mt-1">
                            {customer.address}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            <Icon name="people" size={14} color="#6b7280" />
                            <Text className="text-gray-600 text-sm ml-1">
                              Family: {customer.familymembers}
                            </Text>
                          </View>
                        </View>

                        <CustomCheckbox
                          value={selectedCustomers.includes(customer.userid)}
                          onValueChange={() =>
                            toggleCustomerSelect(customer.userid)
                          }
                          disabled={isMappedToOther ? true : false}
                        />
                      </View>

                      {isMappedToOther && (
                        <Text className="text-red-400">
                          Already Mapped To -{" "}
                          {GetUserData(userData?.mappedpartnerid)?.name}
                        </Text>
                      )}
                      {isSelected && !isMappedToOther && (
                        <DeliveryTypeSelector
                          value={getSelectedDeliveryType(customer.userid)}
                          onChange={(type) =>
                            setCustomerDeliveryType(customer.userid, type)
                          }
                          disabled={false}
                        />
                      )}

                      {customer.latitude && customer.longitude && (
                        <TouchableOpacity
                          className="flex-row items-center mt-2 bg-blue-50 p-2 rounded justify-center border border-blue-100"
                          onPress={() =>
                            openMaps(customer.latitude, customer.longitude)
                          }
                        >
                          <Icon name="map" size={16} color="#3b82f6" />
                          <Text className="text-blue-600 ml-2 font-medium">
                            View on Map
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View className="flex-row space-x-3 mt-4 pb-10">
            <TouchableOpacity
              className="flex-1 bg-gray-200 p-3 rounded-lg items-center justify-center m-2"
              onPress={() => setSelectedPartner(null)}
            >
              <Text className="text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-blue-500 p-3 rounded-lg items-center justify-center m-2"
              onPress={handleSaveCustomers}
            >
              <Text className="text-white font-medium">
                Save ({selectedCustomers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PartnerUserMappingScreen;
