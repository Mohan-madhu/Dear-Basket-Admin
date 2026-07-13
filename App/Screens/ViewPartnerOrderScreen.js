import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from "react-native";
import { Config } from "../../config";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Image } from "expo-image";
import Storage from "../../App_Utils/Services/StorageService";
import { useNavigation } from "@react-navigation/native";

const formatNumber = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const isPendingOrder = (order) => Number(order?.ordercancelled) !== 1 && Number(order?.orderdelivered) !== 1;

const getOrderType = (order) => {
  switch (Number(order?.isdailymilkuser)) {
    case 1:
      return "Daily Milk Grocery";
    case 0:
      return "Fast Delivery";
    case 2:
      return "Demo Daily Milk";
    case 3:
      return "Milk";
    case 4:
      return "Kitchen Order";
    default:
      return "Unknown";
  }
};

const isOrderMappedToPartner = (order, partnerId) => {
  const mappedPartner = String(order?.mappedpartnerid || "");
  const outBy = String(order?.orderoutofdeliveryby || order?.outofdeliveryby || "");
  return mappedPartner === String(partnerId) || outBy === String(partnerId);
};

const ViewPartnerOrderScreen = () => {
  const [allusers, setAllUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { setLoading } = useLoading();
  const loadingRef = useRef(setLoading);
  const hasFetchedOrdersRef = useRef(false);
  const inFlightRef = useRef(false);
  const nav = useNavigation();

  useEffect(() => {
    loadingRef.current = setLoading;
  }, [setLoading]);

  const partners = useMemo(
    () => (allusers || []).filter((user) => String(user?.usertype || "").toLowerCase() === "partner"),
    [allusers]
  );

  const partnerStatsMap = useMemo(() => {
    const map = new Map();

    partners.forEach((partner) => {
      map.set(partner.transid, {
        total: 0,
        fast: 0,
        daily: 0,
      });
    });

    orders.forEach((order) => {
      if (!isPendingOrder(order)) return;
      const type = getOrderType(order);

      partners.forEach((partner) => {
        if (!isOrderMappedToPartner(order, partner.transid)) return;

        const stats = map.get(partner.transid) || { total: 0, fast: 0, daily: 0 };
        stats.total += 1;

        if (type === "Fast Delivery") stats.fast += 1;
        if (type === "Daily Milk Grocery" || type === "Milk" || type === "Demo Daily Milk") stats.daily += 1;

        map.set(partner.transid, stats);
      });
    });

    return map;
  }, [orders, partners]);

  const visiblePartners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = partners.map((partner) => {
      const stats = partnerStatsMap.get(partner.transid) || { total: 0, fast: 0, daily: 0 };
      return { ...partner, stats };
    });

    const filtered = q
      ? base.filter((partner) => {
          const name = String(partner?.name || "").toLowerCase();
          const pid = String(partner?.transid || "").toLowerCase();
          const mobile = String(partner?.mobile || "").toLowerCase();
          return name.includes(q) || pid.includes(q) || mobile.includes(q);
        })
      : base;

    return filtered.sort((a, b) => b.stats.total - a.stats.total);
  }, [partners, partnerStatsMap, searchQuery]);

  const totalPendingOrders = useMemo(
    () => orders.filter((order) => isPendingOrder(order)).length,
    [orders]
  );

  const fetchPartners = useCallback(async () => {
    const res = await API.GET("User");
    setAllUsers(Array.isArray(res?.Response) ? res.Response : []);
  }, []);

  const fetchOrders = useCallback(
    async (force = false) => {
      if (hasFetchedOrdersRef.current && !force) return;

      hasFetchedOrdersRef.current = true;
      const USERDATA = await Storage.getData("DATA");
      const USER = USERDATA?.transid;
      const userType = String(USERDATA?.usertype || "").toUpperCase();

      const res = await API.GET("ProductOrder/pending_orders_with_dailymilk");
      const response = Array.isArray(res?.Response) ? res.Response : [];

      const apiresponse = userType === "ADMIN"
        ? response.filter((order) => Number(order?.orderdelivered) !== 1)
        : response.filter(
            (order) => String(order?.mappedpartnerid || "") === String(USER) && Number(order?.orderdelivered) !== 1
          );

      setOrders(apiresponse);
    },
    []
  );

  const loadData = useCallback(
    async (showLoader = true, forceOrders = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        if (showLoader) loadingRef.current?.(true, "Fetching partner orders...");
        await Promise.all([fetchPartners(), fetchOrders(forceOrders)]);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch partner order data");
        console.error(err);
      } finally {
        inFlightRef.current = false;
        if (showLoader) loadingRef.current?.(false);
      }
    },
    [fetchPartners, fetchOrders]
  );

  useEffect(() => {
    // run once on mount; avoids re-trigger from unstable context callback identities
    loadData(true, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData(false, true);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePartnerSelect = (partner) => {
    nav.navigate("PartnerLandingScreen", {
      partnerid: partner.transid,
      partnername: partner.name,
    });
  };

  const renderProfileImage = (profile) => {
    if (!profile || profile === "No File Uploaded") {
      return (
        <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center border border-gray-200">
          <Icon name="person" size={20} color="#6b7280" />
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
        className="w-12 h-12 rounded-xl border border-gray-200"
        style={{ width: 48, height: 48, borderRadius: 12 }}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar backgroundColor="#F3F4F6" barStyle="dark-content" />

      <View className="bg-white px-3 pt-2 pb-2 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => nav.goBack()}
            className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center"
          >
            <Icon name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">Partner Orders</Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center"
          >
            <Icon name="refresh" size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-3 pt-2 bg-gray-100">
        <View className="bg-white rounded-2xl p-2.5 border border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-2.5 py-1.5 border border-gray-200">
            <Icon name="search" size={16} color="#6B7280" />
            <TextInput
              placeholder="Search partner by name, id, mobile..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-gray-900 ml-1.5 text-xs"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Icon name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-1.5 px-0.5">
            <Text className="text-[11px] text-gray-600">
              {visiblePartners.length} partners • {totalPendingOrders} pending orders
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-3 pt-2 bg-gray-100"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
        }
      >
        {visiblePartners.length === 0 ? (
          <Animated.View entering={FadeIn.duration(180)} className="items-center justify-center mt-10 py-10">
            <View className="bg-white p-6 rounded-full border border-gray-200">
              <Icon name="group" size={42} color="#9CA3AF" />
            </View>
            <Text className="text-gray-800 text-base mt-4 font-bold">
              {searchQuery ? "No Matching Partners" : "No Partners Found"}
            </Text>
            <Text className="text-gray-500 mt-1 text-center px-6 text-xs">
              {searchQuery ? "Try searching with another name, id, or mobile number." : "There are no partner users in the system."}
            </Text>
          </Animated.View>
        ) : (
          <View className="pb-4">
            {visiblePartners.map((partner, index) => {
              const isActive = Number(partner?.status) === 1;
              const total = formatNumber(partner?.stats?.total);
              const fast = formatNumber(partner?.stats?.fast);
              const daily = formatNumber(partner?.stats?.daily);

              return (
                <Animated.View
                  key={partner.transid || `partner-${index}`}
                  entering={FadeIn.delay(index * 50)}
                  exiting={FadeOut}
                  layout={Layout.springify()}
                  className="mb-2"
                >
                  <TouchableOpacity
                    onPress={() => handlePartnerSelect(partner)}
                    activeOpacity={0.85}
                    className="bg-white rounded-2xl border border-gray-200 p-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 pr-2">
                        {renderProfileImage(partner.profile)}
                        <View className="ml-2.5 flex-1">
                          <Text className="text-sm font-bold text-gray-900">{partner.name || "Unknown Partner"}</Text>
                          <Text className="text-[11px] text-gray-500 mt-0.5">{partner.transid || "N/A"}</Text>
                          <Text className="text-[11px] text-gray-500 mt-0.5">{partner.mobile || "No mobile"}</Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <View className={`px-2 py-0.5 rounded-full border ${isActive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                          <Text className={`text-[10px] font-bold ${isActive ? "text-green-700" : "text-red-700"}`}>
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </Text>
                        </View>
                        <View className="mt-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
                          <Text className="text-[11px] font-bold text-blue-700">{total} pending</Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center mt-2.5">
                      <View className="bg-purple-50 px-2 py-1 rounded-full mr-1.5">
                        <Text className="text-[10px] font-semibold text-purple-700">Fast {fast}</Text>
                      </View>
                      <View className="bg-emerald-50 px-2 py-1 rounded-full mr-1.5">
                        <Text className="text-[10px] font-semibold text-emerald-700">Daily Grocery {daily}</Text>
                      </View>
                      <View className="flex-1 items-end">
                        <Text className="text-[10px] text-blue-700 font-semibold">Open Partner Orders</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ViewPartnerOrderScreen;
