import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  SectionList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import FoodieCartBar from "./components/FoodieCartBar";
import FoodieProductRow from "./components/FoodieProductRow";
import {
  fetchKitchenDetailBundle,
  fetchMenuCategories,
  normalizeKitchen,
} from "./data/liveDearKitchen";
import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  incrementQuantity,
  decrementQuantity,
} from "../../Redux/CartReducer";

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
        <Ionicons name="restaurant-outline" size={28} color="#f97316" />
      </View>
    );
  }

  return <Image source={{ uri }} className={className} resizeMode="cover" />;
};

export default function DearKitchenDetailScreen({ navigation, route }) {
  const initialKitchen = route?.params?.kitchen
    ? normalizeKitchen(route.params.kitchen)
    : null;
  const kitchenid = route?.params?.kitchenid || initialKitchen?.kitchenid;

  const [detail, setDetail] = useState(
    initialKitchen
      ? {
          kitchen: initialKitchen,
          images: [],
          mealTypes: [],
          timeslots: [],
          menuItems: [],
        }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState(null);
  const [categoriesByMeal, setCategoriesByMeal] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(false);
  const dispatch = useDispatch();
  const reduxCart = useSelector((state) => state.cart.cart || []);
  const dearKitchenCartItems = useMemo(
    () => reduxCart.filter((item) => item?.source === "dearkitchen"),
    [reduxCart]
  );

  const kitchen = detail?.kitchen || initialKitchen;
  const mealTypes = detail?.mealTypes || [];
  const selectedMeal =
    mealTypes.find((meal) => String(meal.mealtypeid) === String(selectedMealTypeId)) ||
    mealTypes[0] ||
    null;
  const activeMealTypeId = selectedMeal?.mealtypeid || null;
  const activeMealCategories = activeMealTypeId
    ? categoriesByMeal[`${kitchenid}_${activeMealTypeId}`] || []
    : [];
  const activeMealCategoryLabel = selectedMeal?.mealtypename || "Menu";

  const loadDetail = useCallback(async () => {
    if (!kitchenid) return;

    try {
      setLoading(true);
      const nextDetail = await fetchKitchenDetailBundle(kitchenid);
      setDetail(nextDetail);
      setSelectedMealTypeId((current) => current || nextDetail.mealTypes?.[0]?.mealtypeid || null);
    } catch (error) {
      console.error("Dear Kitchen detail page error:", error);
      Alert.alert("Error", "Failed to load kitchen details.");
    } finally {
      setLoading(false);
    }
  }, [kitchenid]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  useEffect(() => {
    const loadCategories = async () => {
      if (!kitchenid || !activeMealTypeId) return;
      const key = `${kitchenid}_${activeMealTypeId}`;
      if (categoriesByMeal[key]) return;

      try {
        setLoadingCategories(true);
        const rows = await fetchMenuCategories(kitchenid, activeMealTypeId);
        console.warn("Categories for meal type", rows);
        setCategoriesByMeal((prev) => ({ ...prev, [key]: rows }));
      } catch (error) {
        console.error("Dear Kitchen detail category error:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [activeMealTypeId, categoriesByMeal, kitchenid]);

  const visibleItems = useMemo(() => {
    return detail?.menuItems || [];
  }, [detail]);

  const cartQuantityByItemId = useMemo(() => {
    return dearKitchenCartItems.reduce((acc, item) => {
      acc[String(item.variantid)] = Number(item.orderquantity) || 0;
      return acc;
    }, {});
  }, [dearKitchenCartItems]);

  const groupedItems = useMemo(() => {
    const categoryMap = activeMealCategories.reduce((acc, item) => {
      acc[String(item.categoryid)] = item.categoryname || "Menu";
      return acc;
    }, {});

    const groupsByCategory = visibleItems.reduce((acc, item) => {
      const key = item.categoryid ? String(item.categoryid) : "uncategorized";
      const title = categoryMap[key] || item.categoryname || "Menu";
      const existing = acc.find((group) => group.key === key);
      if (existing) {
        existing.items.push(item);
      } else {
        acc.push({ key, title, items: [item] });
      }
      return acc;
    }, []);

    const orderedGroups = [];
    activeMealCategories.forEach((category) => {
      const categoryKey = String(category.categoryid);
      const existing = groupsByCategory.find((group) => group.key === categoryKey);
      if (existing) {
        orderedGroups.push(existing);
      }
    });

    groupsByCategory.forEach((group) => {
      if (!orderedGroups.some((existing) => existing.key === group.key)) {
        orderedGroups.push(group);
      }
    });

    return orderedGroups;
  }, [activeMealCategories, visibleItems]);

  const cartSummary = useMemo(() => {
    return dearKitchenCartItems.reduce(
      (summary, item) => ({
        count: summary.count + (Number(item.orderquantity) || 0),
        total: summary.total + (Number(item.price) || 0) * (Number(item.orderquantity) || 0),
      }),
      { count: 0, total: 0 }
    );
  }, [dearKitchenCartItems]);

  const menuSections = useMemo(() => {
    if (!groupedItems.length) return [];

    return groupedItems.map((group) => ({
      title: group.title,
      data: group.items,
      key: group.key,
    }));
  }, [groupedItems]);

  const updateQuantity = (product, delta) => {
    const productId = product.id || product.itemid;
    const existing = dearKitchenCartItems.find((i) => String(i.variantid) === String(productId));

    if (delta > 0) {
      if (existing) {
        dispatch(incrementQuantity({ variantid: productId, source: "dearkitchen" }));
      } else {
        // Map menu item to cart product shape expected by reducers
        const cartProduct = {
          source: "dearkitchen",
          itemid: product.id,
          productid: productId,
          productname: kitchen?.name || "Dear Kitchen",
          variantid: productId,
          variantname: product.name || product.itemname || "Menu item",
          kitchenid,
          mealtypeid: activeMealTypeId,
          mealtypename: selectedMeal?.mealtypename || null,
          price: product.price || 0,
          baseprice: product.price || 0,
          discount: 0,
          quantity: 9999,
          imageurl: product.image || product.imageurl,
          orderquantity: 1,
          product: product,
        };
        dispatch(addToCart(cartProduct));
      }
    } else {
      if (existing) {
        dispatch(decrementQuantity({ variantid: productId, source: "dearkitchen" }));
      }
    }
  };

  const openMap = async () => {
    const latitude = normalizeText(kitchen?.latitude);
    const longitude = normalizeText(kitchen?.longitude);
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

  const orderLabel = kitchen?.isOpen
    ? "Order Now"
    : kitchen?.allowsPrebooking
      ? "Prebook"
      : "Closed";

  if (!kitchen && loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="border-b border-orange-100 bg-white px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.85}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-orange-50"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#ea580c" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xs font-extrabold uppercase text-orange-600">
              Dear Kitchen
            </Text>
            <Text className="text-[20px] font-black text-gray-900" numberOfLines={1}>
              {kitchen?.name || "Kitchen"}
            </Text>
          </View>
        </View>
      </View>

      <SectionList
        className="flex-1"
        sections={menuSections}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDetail} />}
        contentContainerStyle={{ paddingBottom: 112 }}
        stickySectionHeadersEnabled={false}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <KitchenImage
              uri={kitchen?.coverImageUrl || kitchen?.profileImageUrl}
              className="h-52 w-full bg-slate-100"
            />

            <View className="bg-white px-4 pb-4">
              <View className="flex-row items-start">
                <KitchenImage
                  uri={kitchen?.profileImageUrl}
                  className="-mt-10 h-20 w-20 rounded-xl border-2 border-white bg-slate-100"
                />
                <View className="ml-3 mt-3 flex-1">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-[21px] font-black text-slate-950">
                        {kitchen?.name}
                      </Text>
                      <Text className="mt-1 text-[13px] font-semibold text-slate-500">
                        {kitchen?.cuisine || "Home kitchen"}
                      </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-orange-50 px-2.5 py-1">
                      <Ionicons name="star" size={13} color="#f97316" />
                      <Text className="ml-1 text-[12px] font-black text-orange-700">
                        {(kitchen?.ratingValue || 0).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {kitchen?.description ? (
                <Text className="mt-3 text-[13px] leading-5 text-slate-600">
                  {kitchen.description}
                </Text>
              ) : null}

              <View className="mt-2 flex-row flex-wrap">
                <StatusPill
                  label={kitchen?.isOpen ? "Open now" : "Closed"}
                  tone={kitchen?.isOpen ? "green" : "red"}
                />
                {kitchen?.allowsPrebooking ? <StatusPill label="Prebooking" tone="orange" /> : null}
                {kitchen?.isPureVeg ? <StatusPill label="Pure veg" tone="green" /> : null}
                {kitchen?.isHalal ? <StatusPill label="Halal" tone="slate" /> : null}
                {kitchen?.cookgender ? <StatusPill label={`${kitchen.cookgender} cook`} /> : null}
              </View>

              <View className="mt-4 flex-row items-center rounded-xl bg-slate-50 p-3">
                <Ionicons name="location-outline" size={18} color="#64748b" />
                <Text className="ml-2 flex-1 text-[13px] font-semibold text-slate-600">
                  {kitchen?.addressText || "Address not updated"}
                </Text>
                <TouchableOpacity
                  className="ml-2 h-9 w-9 items-center justify-center rounded-lg bg-white"
                  onPress={openMap}
                >
                  <Ionicons name="navigate-outline" size={17} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <View className="mt-3 flex-row">
                <View className="mr-2 flex-1 rounded-xl bg-slate-50 p-3">
                  <Text className="text-[11px] font-extrabold uppercase text-slate-400">
                    Orders
                  </Text>
                  <Text className="mt-1 text-[17px] font-black text-slate-900">
                    {kitchen?.totalOrdersValue || 0}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-slate-50 p-3">
                  <Text className="text-[11px] font-extrabold uppercase text-slate-400">
                    Status
                  </Text>
                  <Text className="mt-1 text-[17px] font-black text-slate-900">
                    {orderLabel}
                  </Text>
                </View>
              </View>
            </View>

            {detail?.images?.length > 0 ? (
              <View className="mt-3 bg-white px-4 py-4">
                <Text className="mb-3 text-[16px] font-black text-slate-900">
                  Gallery
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {detail.images.map((image) => (
                    <Image
                      key={image.imageid || image.url}
                      source={{ uri: image.url }}
                      className="mr-2 h-24 w-28 rounded-lg bg-slate-100"
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View className="mt-3 bg-white px-4 py-4">
              <Text className="text-[16px] font-black text-slate-900">
                Menu
              </Text>

              {mealTypes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                  {mealTypes.map((meal) => {
                    const active = String(meal.mealtypeid) === String(activeMealTypeId);
                    return (
                      <TouchableOpacity
                        key={meal.mealtypeid}
                        className={`mr-2 rounded-lg border px-3 py-2 ${
                          active ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"
                        }`}
                        onPress={() => setSelectedMealTypeId(meal.mealtypeid)}
                      >
                        <Text className={`text-[12px] font-extrabold ${active ? "text-orange-700" : "text-slate-600"}`}>
                          {meal.mealtypename}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}

              {detail?.timeslots?.length > 0 ? (
                <View className="mt-3 rounded-lg bg-slate-50 p-3">
                  <Text className="mb-1 text-[12px] font-black uppercase text-slate-500">
                    Timeslots
                  </Text>
                  <Text className="text-[13px] font-semibold text-slate-700">
                    {detail.timeslots
                      .filter(
                        (slot) =>
                          !activeMealTypeId ||
                          String(slot.mealtypeid) === String(activeMealTypeId)
                      )
                      .map((slot) => slot.slottime)
                      .filter(Boolean)
                      .join("  |  ") || "No slots for this meal"}
                  </Text>
                </View>
              ) : null}

              {activeMealCategories.length > 0 ? (
                <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <Text className="text-[12px] font-black uppercase text-slate-500">
                    Categories for {activeMealCategoryLabel}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                    {activeMealCategories.map((category) => (
                      <View
                        key={category.categoryid}
                        className="mr-2 rounded-full border border-orange-100 bg-white px-3 py-2"
                      >
                        <Text className="text-[12px] font-black text-slate-700">
                          {category.categoryname || "Menu"}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {loadingCategories ? (
                <Text className="mt-3 text-[12px] font-semibold text-slate-500">
                  Loading menu categories...
                </Text>
              ) : null}

              {!loading && groupedItems.length === 0 ? (
                <View className="items-center py-10">
                  <Ionicons name="fast-food-outline" size={26} color="#94a3b8" />
                  <Text className="mt-2 text-center font-semibold text-slate-500">
                    Menu items are not available yet.
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <View className="mt-4 px-4">
            <Text className="mb-2 text-[15px] font-black text-slate-900">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="px-4">
            <FoodieProductRow
              product={item}
              quantity={cartQuantityByItemId[String(item.id)] || 0}
              onDecrement={() => updateQuantity(item, -1)}
              onIncrement={() => updateQuantity(item, 1)}
            />
          </View>
        )}
        ListFooterComponent={<View className="h-4" />}
      />

      <FoodieCartBar
        count={cartSummary.count}
        total={cartSummary.total}
        onReview={() => navigation.navigate("DearKitchenCheckoutScreen")}
      />
    </View>
  );
}
