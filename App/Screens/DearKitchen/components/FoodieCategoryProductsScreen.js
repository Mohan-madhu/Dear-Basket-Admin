import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import FoodieCartBar from "./FoodieCartBar";
import { DEAR_KITCHEN_CATEGORY_ID } from "../data/liveDearKitchen";
import { getDearKitchenOrderTotals } from "../data/checkoutAdapter";

const normalizeText = (value) => String(value || "").trim();

const StatusPill = ({ label, tone = "slate" }) => {
  const styles = {
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
    red: "bg-red-50 border-red-100 text-red-700",
    slate: "bg-slate-50 border-slate-100 text-slate-600",
  };

  return (
    <View className={`mr-2 mt-2 rounded-full border px-2.5 py-1 ${styles[tone]}`}>
      <Text className={`text-[11px] font-extrabold ${styles[tone].split(" ").pop()}`}>
        {label}
      </Text>
    </View>
  );
};

const KitchenImage = ({ uri, className }) => {
  if (!uri) {
    return (
      <View className={`${className} items-center justify-center bg-orange-50`}>
        <Ionicons name="restaurant-outline" size={24} color="#f97316" />
      </View>
    );
  }

  return <Image source={{ uri }} className={className} contentFit="cover" cachePolicy="memory-disk" />;
};

export default function FoodieCategoryProductsScreen({
  category,
  query,
  kitchens,
  loadingKitchens,
  kitchenError,
  onRefreshKitchens,
  onBack,
}) {
  const navigation = useNavigation();
  const reduxCart = useSelector((state) => state.cart.cart || []);
  const normalizedQuery = query.trim().toLowerCase();
  const isDearKitchen = category?.id === DEAR_KITCHEN_CATEGORY_ID;
  const cartSummary = useMemo(() => getDearKitchenOrderTotals(reduxCart), [reduxCart]);

  const visibleKitchens = useMemo(() => {
    if (!isDearKitchen) return [];
    return (kitchens || []).filter((kitchen) => {
      if (!normalizedQuery) return true;
      return [
        kitchen.name,
        kitchen.description,
        kitchen.cuisine,
        kitchen.location,
        kitchen.addressText,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [isDearKitchen, kitchens, normalizedQuery]);

  const openMap = async (kitchen) => {
    const latitude = normalizeText(kitchen.latitude);
    const longitude = normalizeText(kitchen.longitude);
    if (!latitude || !longitude) {
      Alert.alert("Location", "Location is not available for this kitchen yet.");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("Error", "Could not open maps.");
    }
  };

  const openKitchen = (kitchen) => {
    navigation.navigate("DearKitchenDetailScreen", {
      kitchenid: kitchen.kitchenid,
      kitchen,
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="border-b border-orange-100 bg-white px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.85}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-orange-50"
            onPress={onBack}
          >
            <Ionicons name="chevron-back" size={22} color="#ea580c" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xs font-extrabold uppercase text-orange-600">
              {category?.section}
            </Text>
            <Text className="text-[20px] font-black text-gray-900" numberOfLines={1}>
              {category?.name}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!loadingKitchens}
            onRefresh={onRefreshKitchens}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 112 }}
      >
        {!isDearKitchen ? (
          <View className="items-center rounded-xl border border-slate-200 bg-white px-5 py-14">
            <Ionicons name="albums-outline" size={30} color="#94a3b8" />
            <Text className="mt-3 text-[17px] font-extrabold text-slate-800">
              Coming soon
            </Text>
            <Text className="mt-1 text-center text-slate-500">
              This category will be connected after backend category mapping is ready.
            </Text>
          </View>
        ) : null}

        {isDearKitchen && loadingKitchens && visibleKitchens.length === 0 ? (
          <View className="items-center py-14">
            <ActivityIndicator color="#f97316" />
            <Text className="mt-3 font-semibold text-slate-500">
              Loading kitchens...
            </Text>
          </View>
        ) : null}

        {isDearKitchen && !!kitchenError && visibleKitchens.length === 0 ? (
          <View className="items-center rounded-xl border border-red-100 bg-red-50 px-5 py-10">
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text className="mt-2 text-center font-semibold text-red-700">
              {kitchenError}
            </Text>
          </View>
        ) : null}

        {isDearKitchen &&
          visibleKitchens.map((kitchen) => (
            <View
              key={kitchen.kitchenid}
              className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <TouchableOpacity activeOpacity={0.9} onPress={() => openKitchen(kitchen)}>
                <KitchenImage
                  uri={kitchen.coverImageUrl || kitchen.profileImageUrl}
                  className="h-32 w-full bg-slate-100"
                />
                <View className="p-3.5">
                  <View className="flex-row items-start">
                    <KitchenImage
                      uri={kitchen.profileImageUrl}
                      className="-mt-10 h-16 w-16 rounded-xl border-2 border-white bg-slate-100"
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-[17px] font-black text-slate-950">
                            {kitchen.name}
                          </Text>
                          <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">
                            {kitchen.cuisine || "Home kitchen"} - {kitchen.location || "Nearby"}
                          </Text>
                        </View>
                        <View className="flex-row items-center rounded-full bg-orange-50 px-2.5 py-1">
                          <Ionicons name="star" size={13} color="#f97316" />
                          <Text className="ml-1 text-[12px] font-black text-orange-700">
                            {kitchen.ratingValue.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {kitchen.description ? (
                    <Text className="mt-3 text-[13px] leading-5 text-slate-600" numberOfLines={2}>
                      {kitchen.description}
                    </Text>
                  ) : null}

                  <View className="mt-2 flex-row flex-wrap">
                    <StatusPill
                      label={kitchen.isOpen ? "Open now" : "Closed"}
                      tone={kitchen.isOpen ? "green" : "red"}
                    />
                    {kitchen.allowsPrebooking ? (
                      <StatusPill label="Prebooking" tone="orange" />
                    ) : null}
                    {kitchen.isPureVeg ? <StatusPill label="Pure veg" tone="green" /> : null}
                    {kitchen.isHalal ? <StatusPill label="Halal" tone="slate" /> : null}
                  </View>

                  <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
                    <Text className="flex-1 pr-3 text-[12px] font-semibold text-slate-500" numberOfLines={1}>
                      {kitchen.addressText || "Address not updated"}
                    </Text>
                    <TouchableOpacity
                      className="mr-2 h-9 w-9 items-center justify-center rounded-lg bg-slate-100"
                      onPress={() => openMap(kitchen)}
                    >
                      <Ionicons name="navigate-outline" size={17} color="#0f172a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="rounded-lg bg-orange-500 px-3.5 py-2.5"
                      onPress={() => openKitchen(kitchen)}
                    >
                      <Text className="text-[12px] font-extrabold text-white">
                        View full menu
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}

        {isDearKitchen && !loadingKitchens && visibleKitchens.length === 0 ? (
          <View className="items-center py-14">
            <Ionicons name="search" size={28} color="#94a3b8" />
            <Text className="mt-2.5 text-[17px] font-extrabold text-slate-700">
              No kitchens found
            </Text>
            <Text className="mt-1 text-center text-slate-500">
              Approved Dear Kitchen partners will appear here.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <FoodieCartBar
        count={cartSummary.count}
        total={cartSummary.itemTotal}
        onReview={() => navigation.navigate("DearKitchenCheckoutScreen")}
      />
    </View>
  );
}
