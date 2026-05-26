import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DearFoodieHeader from "./components/DearFoodieHeader";
import FoodieCategoryCard from "./components/FoodieCategoryCard";
import FoodieCartBar from "./components/FoodieCartBar";
import FoodieCategoryProductsScreen from "./components/FoodieCategoryProductsScreen";
import { FOODIE_CATEGORIES, FOODIE_GROUPS, getKitchenGroupsForCategory } from "./data/foodieData";

export default function DearFoodieScreen() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState({});

  const normalizedQuery = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return FOODIE_GROUPS;

    return FOODIE_GROUPS.map((group) => ({
      ...group,
      data: group.data.filter((category) => {
        const categoryMatch = category.name
          .toLowerCase()
          .includes(normalizedQuery);
        const productMatch = category.products.some((product) =>
          product.name.toLowerCase().includes(normalizedQuery)
        );
        return categoryMatch || productMatch;
      }),
    })).filter((group) => group.data.length > 0);
  }, [normalizedQuery]);

  const cartSummary = useMemo(() => {
    const products = FOODIE_CATEGORIES.flatMap((category) =>
      getKitchenGroupsForCategory(category).flatMap((partner) => partner.products)
    );

    return products.reduce(
      (summary, product) => {
        const qty = cart[product.id] || 0;
        return {
          count: summary.count + qty,
          total: summary.total + qty * product.price,
        };
      },
      { count: 0, total: 0 }
    );
  }, [cart]);

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
        onBack={() => setSelectedCategory(null)}
        onQuantityChange={updateQuantity}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <DearFoodieHeader query={query} setQuery={setQuery} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                No foodie matches
              </Text>
              <Text className="mt-1 text-slate-500">
                Try another homemade item or category.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <FoodieCartBar count={cartSummary.count} total={cartSummary.total} />
    </View>
  );
}
