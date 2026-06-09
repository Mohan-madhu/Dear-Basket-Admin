import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, View, Text, ScrollView } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import DearFoodieHeader from "./components/DearFoodieHeader";
import FoodieCartBar from "./components/FoodieCartBar";
import FoodieCategoryCard from "./components/FoodieCategoryCard";
import FoodieCategoryProductsScreen from "./components/FoodieCategoryProductsScreen";
import { FOODIE_GROUPS } from "./data/foodieData";
import {
  DEAR_KITCHEN_CATEGORY_ID,
  fetchVisibleKitchens,
} from "./data/liveDearKitchen";
import { getDearKitchenOrderTotals } from "./data/checkoutAdapter";

export default function DearFoodieScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState({});
  const reduxCart = useSelector((state) => state.cart.cart || []);
  const [kitchens, setKitchens] = useState([]);
  const [loadingKitchens, setLoadingKitchens] = useState(false);
  const [kitchenError, setKitchenError] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const cartSummary = useMemo(() => getDearKitchenOrderTotals(reduxCart), [reduxCart]);

  const loadKitchens = useCallback(async () => {
    try {
      setLoadingKitchens(true);
      setKitchenError("");
      const rows = await fetchVisibleKitchens();
      setKitchens(rows);
    } catch (error) {
      console.error("Dear Kitchen list error:", error);
      setKitchenError(error?.message || "Failed to load kitchens.");
      Alert.alert("Error", "Failed to load Dear Kitchen data.");
    } finally {
      setLoadingKitchens(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadKitchens();
    }, [loadKitchens])
  );

  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return FOODIE_GROUPS;

    return FOODIE_GROUPS.map((group) => ({
      ...group,
      data: group.data.filter((category) => {
        const categoryMatch = category.name
          .toLowerCase()
          .includes(normalizedQuery);
        const kitchenMatch =
          category.id === DEAR_KITCHEN_CATEGORY_ID &&
          kitchens.some((kitchen) =>
            [
              kitchen.name,
              kitchen.description,
              kitchen.cuisine,
              kitchen.location,
              kitchen.addressText,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(normalizedQuery)
              )
          );
        return categoryMatch || kitchenMatch;
      }),
    })).filter((group) => group.data.length > 0);
  }, [kitchens, normalizedQuery]);

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[productId] || 0) + delta);
      return { ...prev, [productId]: nextQty };
    });
  };

  if (selectedCategory) {
    return (
      <FoodieCategoryProductsScreen
        category={selectedCategory}
        query={query}
        cart={cart}
        kitchens={kitchens}
        loadingKitchens={loadingKitchens}
        kitchenError={kitchenError}
        onRefreshKitchens={loadKitchens}
        onBack={() => setSelectedCategory(null)}
        onQuantityChange={updateQuantity}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <DearFoodieHeader query={query} setQuery={setQuery} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loadingKitchens} onRefresh={loadKitchens} />
        }
      >
        <View className="p-4 pb-24">
          {visibleGroups.map((group) => (
            <View key={group.title} className="mb-[22px]">
              <Text className="mb-3 text-lg font-extrabold text-gray-900">
                {group.title}
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {group.data.map((category) => (
                  <FoodieCategoryCard
                    key={category.id}
                    category={category}
                    onPress={() => setSelectedCategory(category)}
                  />
                ))}
              </View>
            </View>
          ))}

          {visibleGroups.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="search" size={28} color="#94a3b8" />
              <Text className="mt-2.5 text-[17px] font-extrabold text-slate-700">
                No matches found
              </Text>
              <Text className="mt-1 text-slate-500">
                Try another kitchen, item, or category.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <FoodieCartBar
        count={cartSummary.count}
        total={cartSummary.itemTotal}
        onReview={() => navigation.navigate("DearKitchenCheckoutScreen")}
      />
    </View>
  );
}
