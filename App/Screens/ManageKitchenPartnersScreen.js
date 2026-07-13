import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { DearKitchenAPI, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Toaster from "../../App_Utils/Services/ToastService";

const getAdminId = async () => {
  const data = await Storage.getData("DATA");
  const userId = await Storage.getData("USERID");
  const user = await Storage.getData("USER");
  return data?.transid || userId || user || "ADMIN";
};

const getKitchenId = (item) => item?.kitchenid || item?.transid || item?.id;

const getKitchenListFromResponse = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.Response)) return res.Response;
  if (Array.isArray(res?.response)) return res.response;
  if (Array.isArray(res?.recordset)) return res.recordset;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.Kitchens)) return res.Kitchens;
  if (Array.isArray(res?.kitchens)) return res.kitchens;
  return [];
};

const boolLabel = (value, trueText, falseText) =>
  Number(value || 0) === 1 ? trueText : falseText;

const hasCoordinates = (item) => {
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
};

const StatusBadge = ({ value, activeText, inactiveText, activeTone = "green" }) => {
  const active = Number(value || 0) === 1;
  const activeClass =
    activeTone === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : "bg-green-50 border-green-200 text-green-700";

  return (
    <Text
      className={`text-[11px] px-2.5 py-1 rounded-full border font-bold ${
        active ? activeClass : "bg-red-50 border-red-200 text-red-700"
      }`}
    >
      {active ? activeText : inactiveText}
    </Text>
  );
};

const ActionButton = ({ label, icon, onPress, tone = "blue" }) => {
  const toneClass = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    red: "bg-red-50 border-red-100",
    amber: "bg-amber-50 border-amber-100",
    gray: "bg-gray-50 border-gray-200",
  }[tone];

  const textClass = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
    amber: "text-amber-700",
    gray: "text-gray-700",
  }[tone];

  const iconColor = {
    blue: "#2563eb",
    green: "#16a34a",
    red: "#dc2626",
    amber: "#d97706",
    gray: "#374151",
  }[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className={`flex-1 rounded-xl border px-3 py-2.5 mr-2 ${toneClass}`}
    >
      <View className="flex-row items-center justify-center">
        <Icon name={icon} size={17} color={iconColor} />
        <Text className={`font-bold text-xs ml-1.5 ${textClass}`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ManageKitchenPartnersScreen = () => {
  const navigation = useNavigation();
  const { setLoading } = useLoading();
  const [kitchens, setKitchens] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const fetchingRef = useRef(false);

  const fetchKitchens = useCallback(
    async (showLoader = true, force = false) => {
      if (fetchingRef.current && !force) return;
      try {
        fetchingRef.current = true;
        if (showLoader) setLoading(true, "Fetching kitchen partners...");
        const res = await DearKitchenAPI.GET("Kitchens");
        console.log("Kitchen partners response:", res);
        setKitchens(getKitchenListFromResponse(res));
      } catch (error) {
        console.error("ManageKitchenPartners fetch error:", error);
        Alert.alert("Error", "Failed to fetch kitchen partners.");
      } finally {
        fetchingRef.current = false;
        if (showLoader) setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      fetchKitchens(false);
    }, [fetchKitchens])
  );

  const filteredKitchens = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return kitchens;
    return kitchens.filter((item) =>
      [item?.kitchenname, item?.city, item?.cuisinetype, item?.partneruserid]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [kitchens, search]);

  const updateKitchenStatus = async (item, patch, message) => {
    const kitchenid = getKitchenId(item);
    if (!kitchenid) {
      Alert.alert("Error", "Kitchen id is missing.");
      return;
    }

    try {
      setLoading(true, message);
      const adminId = await getAdminId();
      await DearKitchenAPI.PUT("Kitchens", {
        kitchenid,
        ...patch,
        luu: adminId,
      });
      setKitchens((prev) =>
        prev.map((kitchen) =>
          getKitchenId(kitchen) === kitchenid ? { ...kitchen, ...patch, luu: adminId } : kitchen
        )
      );
      Toaster.successtop("Kitchen updated");
      await fetchKitchens(false, true);
    } catch (error) {
      console.error("ManageKitchenPartners update error:", error);
      Alert.alert("Error", getUserFacingErrorMessage(error, "Failed to update kitchen."));
    } finally {
      setLoading(false);
    }
  };

  const confirmToggleActive = (item) => {
    const nextValue = Number(item?.isactive || 0) === 1 ? 0 : 1;
    Alert.alert(
      nextValue ? "Activate Kitchen" : "Deactivate Kitchen",
      `Do you want to ${nextValue ? "activate" : "deactivate"} ${item?.kitchenname || "this kitchen"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () =>
            updateKitchenStatus(item, { isactive: nextValue }, "Updating active status..."),
        },
      ]
    );
  };

  const confirmToggleApproval = (item) => {
    const nextValue = Number(item?.isapproved || 0) === 1 ? 0 : 1;
    Alert.alert(
      nextValue ? "Approve Kitchen" : "Suspend Kitchen",
      `Do you want to ${nextValue ? "approve" : "suspend"} ${item?.kitchenname || "this kitchen"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () =>
            updateKitchenStatus(item, { isapproved: nextValue }, "Updating approval status..."),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchKitchens(false);
  };

  const openKitchenLocation = async (item) => {
    if (!hasCoordinates(item)) {
      Alert.alert("Location Missing", "This kitchen does not have valid coordinates.");
      return;
    }

    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Open kitchen location error:", error);
      Alert.alert("Error", "Unable to open Google Maps.");
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="mx-4 mt-5 mb-3 bg-white rounded-2xl border border-gray-200 p-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
          >
            <Icon name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Manage Kitchen Partners</Text>
            <Text className="text-sm text-gray-500 mt-1">
              Review, approve, suspend, and edit kitchen accounts.
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3">
          <Icon name="search" size={19} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search kitchen, city, cuisine"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-gray-900 py-3 px-2"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-bold text-gray-700">
            {filteredKitchens.length} kitchen partners
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("AddKitchenPartnerScreen")}
            className="bg-blue-600 rounded-full px-3 py-2 flex-row items-center"
          >
            <Icon name="add" size={16} color="white" />
            <Text className="text-white text-xs font-bold ml-1">Add</Text>
          </TouchableOpacity>
        </View>

        {filteredKitchens.length === 0 ? (
          <View className="bg-white border border-gray-200 rounded-2xl py-12 items-center">
            <Icon name="restaurant" size={44} color="#9ca3af" />
            <Text className="text-gray-700 font-bold text-base mt-3">No kitchens found</Text>
            <Text className="text-gray-500 text-sm mt-1">Pull to refresh or add a partner.</Text>
          </View>
        ) : (
          filteredKitchens.map((item, index) => {
            const kitchenid = getKitchenId(item) || `${item?.kitchenname}-${index}`;
            const active = Number(item?.isactive || 0) === 1;
            const approved = Number(item?.isapproved || 0) === 1;

            return (
              <View key={kitchenid} className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-extrabold text-gray-900">
                      {item?.kitchenname || "Unnamed Kitchen"}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      {item?.city || "City not set"}{item?.state ? `, ${item.state}` : ""} • Rating {item?.rating ?? "0"}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {Number(item?.isopen || 0) === 1 ? "Open" : "Closed"} • Prebooking {Number(item?.allowprebooking || 0) === 1 ? "On" : "Off"}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
                      ID: {getKitchenId(item) || "-"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <StatusBadge value={item?.isactive} activeText="Active" inactiveText="Inactive" />
                    <View className="mt-2">
                      <StatusBadge
                        value={item?.isapproved}
                        activeText="Approved"
                        inactiveText="Suspended"
                        activeTone="blue"
                      />
                    </View>
                  </View>
                </View>

                <View className="flex-row mt-4">
                  <ActionButton
                    label={boolLabel(active, "Deactivate", "Activate")}
                    icon={active ? "toggle-off" : "toggle-on"}
                    tone={active ? "red" : "green"}
                    onPress={() => confirmToggleActive(item)}
                  />
                  <ActionButton
                    label={boolLabel(approved, "Suspend", "Approve")}
                    icon={approved ? "block" : "verified"}
                    tone={approved ? "amber" : "blue"}
                    onPress={() => confirmToggleApproval(item)}
                  />
                  <ActionButton
                    label="Edit"
                    icon="edit"
                    tone="gray"
                    onPress={() => navigation.navigate("EditKitchenScreen", { kitchen: item })}
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => openKitchenLocation(item)}
                  className={`mt-3 rounded-xl border px-3 py-2.5 flex-row items-center justify-center ${
                    hasCoordinates(item)
                      ? "bg-blue-50 border-blue-100"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Icon
                    name="location-on"
                    size={17}
                    color={hasCoordinates(item) ? "#2563eb" : "#9ca3af"}
                  />
                  <Text
                    className={`font-bold text-xs ml-1.5 ${
                      hasCoordinates(item) ? "text-blue-700" : "text-gray-400"
                    }`}
                  >
                    Open in Google Maps
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default ManageKitchenPartnersScreen;
