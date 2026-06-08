import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import * as Location from "expo-location";
import { DearKitchenAPI } from "../../../App_Utils/Services/APIService";
import Storage from "../../../App_Utils/Services/StorageService";
import { clearCart, decrementQuantity, incrementQuantity, removeFromCart } from "../../Redux/CartReducer";
import {
  buildDearKitchenOrderItems,
  buildDearKitchenOrderId,
  buildDearKitchenOrderPayload,
  getDearKitchenCartItems,
  getDearKitchenOrderTotals,
} from "./data/checkoutAdapter";
import { fetchKitchenDetailBundle } from "./data/liveDearKitchen";

const Field = ({ label, value, onChangeText, placeholder, keyboardType = "default", editable = true }) => (
  <View className="mb-4">
    <Text className="mb-1 text-[12px] font-bold uppercase text-slate-500">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      editable={editable}
      keyboardType={keyboardType}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900"
    />
  </View>
);

const QuantityStepper = ({ quantity, onDecrement, onIncrement }) => (
  <View className="flex-row items-center overflow-hidden rounded-xl border border-orange-200 bg-white">
    <TouchableOpacity
      className={`h-9 w-9 items-center justify-center ${quantity <= 0 ? "bg-slate-50" : "bg-orange-50"}`}
      onPress={onDecrement}
      disabled={quantity <= 0}
    >
      <Ionicons name="remove" size={18} color={quantity <= 0 ? "#cbd5e1" : "#ea580c"} />
    </TouchableOpacity>
    <Text className="min-w-8 px-2 text-center text-[14px] font-black text-slate-900">{quantity}</Text>
    <TouchableOpacity className="h-9 w-9 items-center justify-center bg-orange-50" onPress={onIncrement}>
      <Ionicons name="add" size={18} color="#ea580c" />
    </TouchableOpacity>
  </View>
);

export default function DearKitchenCheckoutScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart.cart || []);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [userData, setUserData] = useState(null);
  const [kitchenDetail, setKitchenDetail] = useState(null);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const dearKitchenItems = useMemo(() => getDearKitchenCartItems(cart), [cart]);
  const totals = useMemo(() => getDearKitchenOrderTotals(cart), [cart]);
  const kitchenId = dearKitchenItems[0]?.kitchenid || null;

  const mealTypes = kitchenDetail?.mealTypes || [];
  const timeslots = kitchenDetail?.timeslots || [];
  const selectedMealType =
    mealTypes.find((meal) => String(meal.mealtypeid) === String(selectedMealTypeId)) ||
    mealTypes[0] ||
    null;
  const selectedSlot =
    timeslots.find((slot) => String(slot.slotid) === String(selectedSlotId)) ||
    timeslots.find((slot) => String(slot.mealtypeid) === String(selectedMealType?.mealtypeid)) ||
    timeslots[0] ||
    null;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Storage.getData("DATA");
      setUserData(data);
      setAddress(data?.deliveryaddress || "");
      setCity(data?.deliverycity || "");
      setState(data?.deliverystate || "");
      setPincode(data?.deliverypincode || "");
      setLatitude(data?.latitude ? String(data.latitude) : "");
      setLongitude(data?.longitude ? String(data.longitude) : "");
    } catch (error) {
      console.error("Dear Kitchen checkout profile error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadKitchenContext = useCallback(async () => {
    if (!kitchenId) return;

    try {
      const detail = await fetchKitchenDetailBundle(kitchenId);
      setKitchenDetail(detail);
      setSelectedMealTypeId((current) => current || dearKitchenItems[0]?.mealtypeid || detail?.mealTypes?.[0]?.mealtypeid || null);
      setSelectedSlotId((current) => current || detail?.timeslots?.[0]?.slotid || null);
    } catch (error) {
      console.error("Dear Kitchen context load error:", error);
    }
  }, [dearKitchenItems, kitchenId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useFocusEffect(
    useCallback(() => {
      loadKitchenContext();
    }, [loadKitchenContext])
  );

  const requestLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Location", "Location permission was denied.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLatitude(String(loc.coords.latitude));
    setLongitude(String(loc.coords.longitude));
  };

  const validate = () => {
    if (!userData?.transid && !userData?.userid && !userData?.id) return "User details are still loading.";
    if (!kitchenId) return "Kitchen details are missing.";
    if (!selectedMealType?.mealtypeid) return "Meal type is required.";
    if (!selectedSlot?.slotid) return "Delivery slot is required.";
    if (!address.trim()) return "Address is required.";
    if (!city.trim()) return "City is required.";
    if (!state.trim()) return "State is required.";
    if (!pincode.trim()) return "Pincode is required.";
    if (!latitude.trim() || !longitude.trim()) return "Location is required.";
    if (dearKitchenItems.length === 0) return "Your Dear Kitchen cart is empty.";
    return null;
  };

  const placeOrder = async () => {
    if (placingOrder) return;

    const validationError = validate();
    if (validationError) {
      Alert.alert("Checkout", validationError);
      return;
    }

    const orderId = buildDearKitchenOrderId();
    const deliveryDate = new Date().toISOString().slice(0, 10);
    const payload = buildDearKitchenOrderPayload({
      userData,
      kitchenId,
      slotId: selectedSlot?.slotid || null,
      mealTypeId: selectedMealType?.mealtypeid || null,
      deliveryDate,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      specialInstructions,
      cart,
    });

    console.log("Placing Dear Kitchen order with payload:", payload);
    const orderDetails = buildDearKitchenOrderItems({
      orderId,
      cart,
      userData,
    });

    try {
      setPlacingOrder(true);

      const orderRes = await DearKitchenAPI.POST("Orders", payload);
      const createdOrder = Array.isArray(orderRes) ? orderRes[0] : orderRes?.Response?.[0] || orderRes?.Response || null;
      const createdOrderId = createdOrder?.orderid || orderId;

      for (const detail of orderDetails.map((item) => ({ ...item, orderid: createdOrderId }))) {
        await DearKitchenAPI.POST("OrderItems", detail);
      }

      dispatch(clearCart());
      Alert.alert("Success", "Dear Kitchen order placed successfully.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("MyOrdersScreen"),
        },
      ]);
    } catch (error) {
      console.error("Dear Kitchen checkout error:", error);
      Alert.alert("Checkout", error?.message || "Failed to place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const updateQuantity = (item, delta) => {
    if (delta > 0) {
      dispatch(incrementQuantity({ variantid: item.variantid }));
      return;
    }
    if ((item.orderquantity || 0) <= 1) {
      dispatch(removeFromCart({ variantid: item.variantid }));
      return;
    }
    dispatch(decrementQuantity({ variantid: item.variantid }));
  };

  if (loading && dearKitchenItems.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-slate-50" behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
            <Text className="text-xs font-extrabold uppercase text-orange-600">Dear Kitchen</Text>
            <Text className="text-[20px] font-black text-gray-900">Checkout</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} />}
        contentContainerStyle={{ paddingBottom: 132 }}
      >
        <View className="px-4 py-4">
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-[16px] font-black text-slate-900">Cart Summary</Text>
            <Text className="mt-1 text-[12px] font-semibold text-slate-500">
              {totals.count} items • Rs. {totals.itemTotal}
            </Text>

            {mealTypes.length > 0 ? (
              <View className="mt-4">
                <Text className="text-[12px] font-bold uppercase text-slate-500">Meal Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                  {mealTypes.map((meal) => {
                    const active = String(meal.mealtypeid) === String(selectedMealType?.mealtypeid);
                    return (
                      <TouchableOpacity
                        key={meal.mealtypeid}
                        className={`mr-2 rounded-full border px-3 py-2 ${active ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                        onPress={() => {
                          setSelectedMealTypeId(meal.mealtypeid);
                          const nextSlot = timeslots.find((slot) => String(slot.mealtypeid) === String(meal.mealtypeid));
                          if (nextSlot) setSelectedSlotId(nextSlot.slotid);
                        }}
                      >
                        <Text className={`text-[12px] font-black ${active ? "text-orange-700" : "text-slate-600"}`}>
                          {meal.mealtypename}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {timeslots.length > 0 ? (
              <View className="mt-4">
                <Text className="text-[12px] font-bold uppercase text-slate-500">Delivery Slot</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                  {timeslots
                    .filter((slot) => !selectedMealType?.mealtypeid || String(slot.mealtypeid) === String(selectedMealType.mealtypeid))
                    .map((slot) => {
                      const active = String(slot.slotid) === String(selectedSlot?.slotid);
                      return (
                        <TouchableOpacity
                          key={slot.slotid}
                          className={`mr-2 rounded-full border px-3 py-2 ${active ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                          onPress={() => setSelectedSlotId(slot.slotid)}
                        >
                          <Text className={`text-[12px] font-black ${active ? "text-orange-700" : "text-slate-600"}`}>
                            {slot.slottime}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            ) : null}

            {dearKitchenItems.length === 0 ? (
              <View className="items-center py-10">
                <Ionicons name="fast-food-outline" size={28} color="#94a3b8" />
                <Text className="mt-2 text-center font-semibold text-slate-500">
                  Your Dear Kitchen cart is empty.
                </Text>
              </View>
            ) : (
              dearKitchenItems.map((item) => (
                <View key={item.variantid} className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[15px] font-black text-slate-900">
                        {item.variantname || item.name || item.productname}
                      </Text>
                      <Text className="mt-1 text-[12px] text-slate-600" numberOfLines={2}>
                        {item.product?.description || item.description || "Freshly prepared Dear Kitchen item."}
                      </Text>
                    </View>
                    <Text className="text-[14px] font-black text-orange-600">Rs. {Number(item.price || 0)}</Text>
                  </View>

                  <View className="mt-3 flex-row items-center justify-between">
                    <QuantityStepper
                      quantity={Number(item.orderquantity) || 0}
                      onDecrement={() => updateQuantity(item, -1)}
                      onIncrement={() => updateQuantity(item, 1)}
                    />
                    <Text className="text-[14px] font-black text-slate-900">
                      Rs. {(Number(item.price || 0) * Number(item.orderquantity || 0)).toFixed(0)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-[16px] font-black text-slate-900">Delivery Address</Text>
            <Text className="mt-1 text-[12px] font-semibold text-slate-500">
              Use your saved address or update it before placing the order.
            </Text>

            <Field label="Address" value={address} onChangeText={setAddress} placeholder="House / street / landmark" />
            <Field label="City" value={city} onChangeText={setCity} placeholder="City" />
            <Field label="State" value={state} onChangeText={setState} placeholder="State" />
            <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="Pincode" keyboardType="number-pad" />

            <Field
              label="Special Instructions"
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              placeholder="Leave a note for the kitchen"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Latitude" value={latitude} onChangeText={setLatitude} placeholder="Latitude" editable={false} />
              </View>
              <View className="flex-1">
                <Field label="Longitude" value={longitude} onChangeText={setLongitude} placeholder="Longitude" editable={false} />
              </View>
            </View>

            <TouchableOpacity
              className="mt-1 rounded-xl bg-slate-900 px-4 py-3"
              onPress={requestLocation}
            >
              <Text className="text-center text-[14px] font-black text-white">Refresh Location</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <Text className="text-[16px] font-black text-slate-900">Order Total</Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-[13px] text-slate-700">Item total</Text>
              <Text className="text-[13px] font-bold text-slate-900">Rs. {totals.itemTotal.toFixed(0)}</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[13px] text-slate-700">Delivery charge</Text>
              <Text className="text-[13px] font-bold text-slate-900">Rs. 0</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[13px] text-slate-700">Tax</Text>
              <Text className="text-[13px] font-bold text-slate-900">Rs. 0</Text>
            </View>
            <View className="mt-3 border-t border-orange-200 pt-3 flex-row items-center justify-between">
              <Text className="text-[15px] font-black text-slate-900">To Pay</Text>
              <Text className="text-[18px] font-black text-orange-600">Rs. {totals.itemTotal.toFixed(0)}</Text>
            </View>
          </View>

          {kitchenDetail?.kitchen ? (
            <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="text-[16px] font-black text-slate-900">Kitchen</Text>
              <Text className="mt-1 text-[14px] font-bold text-slate-700">{kitchenDetail.kitchen.name}</Text>
              <Text className="mt-1 text-[12px] text-slate-500">{kitchenDetail.kitchen.addressText || kitchenDetail.kitchen.location}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="pr-3">
            <Text className="text-[12px] font-bold uppercase text-slate-400">Payable</Text>
            <Text className="text-[20px] font-black text-slate-900">Rs. {totals.itemTotal.toFixed(0)}</Text>
          </View>
          <TouchableOpacity
            disabled={placingOrder || dearKitchenItems.length === 0}
            className={`rounded-xl px-5 py-3.5 ${placingOrder || dearKitchenItems.length === 0 ? "bg-slate-300" : "bg-orange-500"}`}
            onPress={placeOrder}
          >
            <Text className="text-[14px] font-black text-white">
              {placingOrder ? "Placing Order..." : "Place Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
