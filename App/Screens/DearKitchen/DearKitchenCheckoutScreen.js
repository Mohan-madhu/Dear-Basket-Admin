import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { DearKitchenAPI, getUserFacingErrorMessage } from "../../../App_Utils/Services/APIService";
import Storage from "../../../App_Utils/Services/StorageService";
import { useLoading } from "../../../App_Utils/Contexts/LoadingContext";
import { clearCartBySource, decrementQuantity, incrementQuantity, removeFromCart } from "../../Redux/CartReducer";
import {
  buildDearKitchenOrderItems,
  buildDearKitchenOrderId,
  buildDearKitchenOrderPayload,
  getDearKitchenCartItems,
  getDearKitchenOrderTotals,
} from "./data/checkoutAdapter";
import { fetchKitchenDetailBundle } from "./data/liveDearKitchen";

const DEAR_KITCHEN_ADDRESS_KEY_PREFIX = "DEAR_KITCHEN_CHECKOUT_ADDRESS";

const getDearKitchenAddressKey = (userData) => {
  const userId = userData?.transid || userData?.userid || userData?.id || "guest";
  return `${DEAR_KITCHEN_ADDRESS_KEY_PREFIX}_${userId}`;
};

const IST_OFFSET_MINUTES = 330;

const getISTNow = () => new Date(Date.now() + IST_OFFSET_MINUTES * 60 * 1000);

const getISTDateString = () => {
  const now = getISTNow();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseSlotTimeToMinutes = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toUpperCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
};

const getSlotStartMinutes = (slot) =>
  parseSlotTimeToMinutes(
    slot?.starttime ||
    slot?.startTime ||
    slot?.fromtime ||
    slot?.fromTime ||
    slot?.slottime ||
    slot?.slotTime
  );

const isEnabledValue = (value) => {
  if (value == null) return true;
  if (value === true) return true;
  if (value === false) return false;

  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "active", "available"].includes(text)) return true;
  if (["0", "false", "no", "inactive", "unavailable"].includes(text)) return false;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue === 1 : true;
};

const isSlotAvailableNow = (slot) => {
  if (!slot || !isEnabledValue(slot?.isactive) || !isEnabledValue(slot?.isavailable)) return false;

  const startMinutes = getSlotStartMinutes(slot);
  if (startMinutes == null) return true;

  const now = getISTNow();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return startMinutes >= nowMinutes;
};

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
  const { setLoading: setGlobalLoading } = useLoading();
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
  const cartMealTypeId = dearKitchenItems[0]?.mealtypeid || null;

  const mealTypes = kitchenDetail?.mealTypes || [];
  const timeslots = kitchenDetail?.timeslots || [];
  const hasKitchenContextLoaded = !!kitchenDetail;
  const isCartMealTypeAvailable =
    !cartMealTypeId ||
    !hasKitchenContextLoaded ||
    mealTypes.some((meal) => String(meal.mealtypeid) === String(cartMealTypeId));
  const cartMealType = useMemo(() => {
    if (!cartMealTypeId) return null;
    const item = dearKitchenItems[0] || {};
    return {
      mealtypeid: cartMealTypeId,
      mealtypename: item.mealtypename || item.mealtype || item.categoryname || "Selected meal",
    };
  }, [cartMealTypeId, dearKitchenItems]);

  const selectedMealType =
    mealTypes.find((meal) => String(meal.mealtypeid) === String(selectedMealTypeId)) ||
    cartMealType ||
    null;

  const mealSlots = useMemo(
    () =>
      timeslots.filter(
        (slot) => !selectedMealType?.mealtypeid || String(slot.mealtypeid) === String(selectedMealType.mealtypeid)
      ),
    [selectedMealType?.mealtypeid, timeslots]
  );

  const availableSlots = useMemo(() => mealSlots.filter(isSlotAvailableNow), [mealSlots]);
  const displayMealSlots = useMemo(
    () =>
      [...mealSlots].sort((a, b) => {
        const aAvailable = isSlotAvailableNow(a);
        const bAvailable = isSlotAvailableNow(b);
        if (aAvailable === bAvailable) {
          return (getSlotStartMinutes(a) ?? 0) - (getSlotStartMinutes(b) ?? 0);
        }
        return aAvailable ? -1 : 1;
      }),
    [mealSlots]
  );
  const selectedSlot =
    availableSlots.find((slot) => String(slot.slotid) === String(selectedSlotId)) ||
    null;
  const isCheckoutBlocked =
    placingOrder ||
    dearKitchenItems.length === 0 ||
    !isCartMealTypeAvailable ||
    mealSlots.length === 0 ||
    !selectedSlot?.slotid;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Storage.getData("DATA");
      const savedAddress = data ? await Storage.getData(getDearKitchenAddressKey(data)) : null;
      const checkoutAddress = savedAddress || {};
      setUserData(data);
      setAddress(checkoutAddress.address || data?.deliveryaddress || "");
      setCity(checkoutAddress.city || data?.deliverycity || "");
      setState(checkoutAddress.state || data?.deliverystate || "");
      setPincode(checkoutAddress.pincode || data?.deliverypincode || "");
      setLatitude(checkoutAddress.latitude || (data?.latitude ? String(data.latitude) : ""));
      setLongitude(checkoutAddress.longitude || (data?.longitude ? String(data.longitude) : ""));
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
      setSelectedMealTypeId(dearKitchenItems[0]?.mealtypeid || detail?.mealTypes?.[0]?.mealtypeid || null);
      setSelectedSlotId(null);
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

  useEffect(() => {
    if (!cartMealTypeId) return;
    setSelectedMealTypeId(cartMealTypeId);
  }, [cartMealTypeId]);

  useEffect(() => {
    if (availableSlots.length === 0) {
      if (selectedSlotId) setSelectedSlotId(null);
      return;
    }

    const currentSlotStillAvailable = availableSlots.some(
      (slot) => String(slot.slotid) === String(selectedSlotId)
    );
    if (!currentSlotStillAvailable) {
      setSelectedSlotId(availableSlots[0].slotid);
    }
  }, [availableSlots, selectedSlotId]);

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
    if (!isCartMealTypeAvailable) return "This meal type is not available right now. Please remove this item and choose an available meal.";
    if (!selectedMealType?.mealtypeid) return "Meal type is required.";
    if (mealSlots.length === 0) return "No delivery slots are configured for this meal.";
    if (!selectedSlot?.slotid) return "No delivery slots are available right now for this meal.";
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
    const deliveryDate = getISTDateString();
    const payload = buildDearKitchenOrderPayload({
      userData,
      kitchenId,
      slotId: selectedSlot?.slotid || null,
      slotName: selectedSlot?.slotname || selectedSlot?.name || selectedSlot?.slottime || null,
      slotTime: selectedSlot?.slottime || selectedSlot?.slotTime || null,
      slotStartTime: selectedSlot?.starttime || selectedSlot?.startTime || selectedSlot?.fromtime || null,
      slotEndTime: selectedSlot?.endtime || selectedSlot?.endTime || selectedSlot?.totime || null,
      mealTypeId: selectedMealType?.mealtypeid || null,
      mealTypeName: selectedMealType?.mealtypename || selectedMealType?.name || null,
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
      setGlobalLoading(true, "Placing Dear Kitchen order...");

      const orderRes = await DearKitchenAPI.POST("Orders", payload);
      const createdOrder = Array.isArray(orderRes) ? orderRes[0] : orderRes?.Response?.[0] || orderRes?.Response || null;
      const createdOrderId = createdOrder?.orderid || orderId;

      for (const detail of orderDetails.map((item) => ({ ...item, orderid: createdOrderId }))) {
        await DearKitchenAPI.POST("OrderItems", detail);
      }

      await Storage.storeData(getDearKitchenAddressKey(userData), {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: latitude.trim(),
        longitude: longitude.trim(),
        updatedAt: new Date().toISOString(),
      });

      dispatch(clearCartBySource({ source: "dearkitchen" }));
      Alert.alert("Success", "Dear Kitchen order placed successfully.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("MyOrdersScreen"),
        },
      ]);
    } catch (error) {
      console.error("Dear Kitchen checkout error:", error);
      Alert.alert("Checkout", getUserFacingErrorMessage(error, "Failed to place order."));
    } finally {
      setPlacingOrder(false);
      setGlobalLoading(false);
    }
  };

  const updateQuantity = (item, delta) => {
    if (delta > 0) {
      dispatch(incrementQuantity({ variantid: item.variantid, source: "dearkitchen" }));
      return;
    }
    if ((item.orderquantity || 0) <= 1) {
      dispatch(removeFromCart({ variantid: item.variantid, source: "dearkitchen" }));
      return;
    }
    dispatch(decrementQuantity({ variantid: item.variantid, source: "dearkitchen" }));
  };

  if (loading && dearKitchenItems.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  if (dearKitchenItems.length === 0) {
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
              <Text className="text-xs font-extrabold uppercase text-orange-600">Dear Kitchen</Text>
              <Text className="text-[20px] font-black text-gray-900">Cart</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="h-28 w-28 items-center justify-center rounded-full bg-orange-50 border border-orange-100">
            <Ionicons name="basket-outline" size={48} color="#f97316" />
          </View>
          <Text className="mt-6 text-center text-[24px] font-black text-slate-900">
            Your kitchen cart is empty
          </Text>
          <Text className="mt-2 text-center text-[14px] leading-6 text-slate-500">
            Fresh meals you add from Dear Kitchen will appear here before checkout.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            className="mt-7 w-full rounded-2xl bg-orange-500 px-5 py-4"
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Main")}
          >
            <Text className="text-center text-[15px] font-black text-white">Continue Browsing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4"
            onPress={() => navigation.navigate("MyOrdersScreen")}
          >
            <Text className="text-center text-[15px] font-black text-slate-800">View My Orders</Text>
          </TouchableOpacity>
        </View>
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
                <View className="mt-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                      <Ionicons name="restaurant-outline" size={20} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-black text-slate-900">
                        {selectedMealType?.mealtypename || "Selected meal"}
                      </Text>
                      <Text className="mt-0.5 text-[11px] font-semibold text-orange-700">
                        Fixed from the food items in this cart
                      </Text>
                    </View>
                    <Ionicons name="lock-closed-outline" size={18} color="#ea580c" />
                  </View>
                </View>
                {!isCartMealTypeAvailable ? (
                  <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <Text className="text-[12px] font-bold text-red-700">
                      This meal type is not available right now. Please remove this item and choose an available meal.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {mealSlots.length > 0 ? (
              <View className="mt-4">
                <Text className="text-[12px] font-bold uppercase text-slate-500">Delivery Slot</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                  {displayMealSlots.map((slot) => {
                    const available = isSlotAvailableNow(slot);
                    const active = available && String(slot.slotid) === String(selectedSlot?.slotid);
                    return (
                      <TouchableOpacity
                        key={slot.slotid}
                        disabled={!available}
                        activeOpacity={available ? 0.85 : 1}
                        className={`mr-2 rounded-2xl border px-3 py-2 ${
                          active
                            ? "border-orange-500 bg-orange-50"
                            : available
                              ? "border-slate-200 bg-white"
                              : "border-slate-200 bg-slate-100"
                        }`}
                        onPress={() => setSelectedSlotId(slot.slotid)}
                      >
                        <Text className={`text-[12px] font-black ${active ? "text-orange-700" : available ? "text-slate-700" : "text-slate-400"}`}>
                          {slot.slottime}
                        </Text>
                        {!available ? (
                          <Text className="mt-0.5 text-[10px] font-bold text-slate-400">Not available</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {availableSlots.length === 0 ? (
                  <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <Text className="text-[12px] font-bold text-amber-700">
                      No active slots are available right now for this meal.
                    </Text>
                  </View>
                ) : null}
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
              <Text className="text-[13px] font-bold text-slate-900">Rs. {totals.deliveryCharge.toFixed(0)}</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[13px] text-slate-700">Tax ({totals.taxPercentage}%)</Text>
              <Text className="text-[13px] font-bold text-slate-900">Rs. {totals.tax.toFixed(0)}</Text>
            </View>
            <View className="mt-3 border-t border-orange-200 pt-3 flex-row items-center justify-between">
              <Text className="text-[15px] font-black text-slate-900">To Pay</Text>
              <Text className="text-[18px] font-black text-orange-600">Rs. {totals.totalAmount.toFixed(0)}</Text>
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
            <Text className="text-[20px] font-black text-slate-900">Rs. {totals.totalAmount.toFixed(0)}</Text>
          </View>
          <TouchableOpacity
            disabled={isCheckoutBlocked}
            className={`rounded-xl px-5 py-3.5 ${isCheckoutBlocked ? "bg-slate-300" : "bg-orange-500"}`}
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
