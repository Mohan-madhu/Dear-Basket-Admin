import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FoodieCartBar from "./FoodieCartBar";
import FoodieProductRow from "./FoodieProductRow";
import { getKitchenGroupsForCategory } from "../data/foodieData";

export default function FoodieCategoryProductsScreen({
  category,
  query,
  cart,
  onBack,
  onQuantityChange,
}) {
  const normalizedQuery = query.trim().toLowerCase();

  const kitchenGroups = useMemo(() => {
    return getKitchenGroupsForCategory(category)
      .map((partner) => ({
        ...partner,
        products: partner.products.filter((product) => {
          if (!normalizedQuery) return true;
          return (
            product.name.toLowerCase().includes(normalizedQuery) ||
            product.description.toLowerCase().includes(normalizedQuery) ||
            partner.name.toLowerCase().includes(normalizedQuery) ||
            partner.location.toLowerCase().includes(normalizedQuery)
          );
        }),
      }))
      .filter((partner) => partner.products.length > 0);
  }, [category, normalizedQuery]);

  const cartSummary = useMemo(() => {
    return getKitchenGroupsForCategory(category)
      .flatMap((partner) => partner.products)
      .reduce(
        (summary, product) => {
          const qty = cart[product.id] || 0;
          return {
            count: summary.count + qty,
            total: summary.total + qty * product.price,
          };
        },
        { count: 0, total: 0 }
      );
  }, [cart, category]);

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
        contentContainerStyle={{ padding: 16, paddingBottom: 104 }}
      >
        {kitchenGroups.map((partner) => (
          <View key={partner.id} className="mb-5">
            <View className="mb-3 rounded-xl border border-slate-200 bg-white p-3.5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[16px] font-black text-slate-950">
                    {partner.name}
                  </Text>
                  <Text className="mt-1 text-[12px] font-semibold text-slate-500">
                    {partner.location} - {partner.distance}
                  </Text>
                </View>
                <View className="flex-row items-center rounded-full bg-orange-50 px-2.5 py-1">
                  <Ionicons name="star" size={13} color="#f97316" />
                  <Text className="ml-1 text-[12px] font-black text-orange-700">
                    {partner.rating}
                  </Text>
                </View>
              </View>
              <View className="mt-2 flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text className="ml-1.5 text-[12px] font-semibold text-slate-500">
                  {partner.timing}
                </Text>
              </View>
            </View>

            {partner.products.map((product) => (
              <FoodieProductRow
                key={product.id}
                product={product}
                quantity={cart[product.id] || 0}
                onDecrement={() => onQuantityChange(product.id, -1)}
                onIncrement={() => onQuantityChange(product.id, 1)}
              />
            ))}
          </View>
        ))}

        {kitchenGroups.length === 0 ? (
          <View className="items-center py-14">
            <Ionicons name="search" size={28} color="#94a3b8" />
            <Text className="mt-2.5 text-[17px] font-extrabold text-slate-700">
              No products found
            </Text>
            <Text className="mt-1 text-center text-slate-500">
              Try another item, shop, or location.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <FoodieCartBar count={cartSummary.count} total={cartSummary.total} />
    </View>
  );
}
