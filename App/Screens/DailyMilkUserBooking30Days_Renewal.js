import React, { useState, useEffect, useRef } from "react";
import { getImageUrl } from "../../config";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
} from "react-native";
import { Image } from "expo-image";
import { Picker } from "@react-native-picker/picker";
import Storage from "../../App_Utils/Services/StorageService";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { useNavigation, useRoute } from "@react-navigation/native";

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────
const getDaysInMonth = (monthValue, yearValue) => {
    if (!monthValue || !yearValue) return [];
    const m = parseInt(monthValue, 10);
    const y = parseInt(yearValue, 10);
    if (isNaN(m) || isNaN(y)) return [];
    const date = new Date(y, m, 0);
    const numDays = date.getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
};

const DailyMilkBooking = () => {
    const { setLoading } = useLoading();
    const route = useRoute();
    const UserBooked = Array.isArray(route?.params?.UserBooked) ? route.params.UserBooked : [];
    console.log("UserBooked:", UserBooked);

    const navigation = useNavigation();
    const isSubmittingRef = useRef(false);

    // Product States
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [quantities, setQuantities] = useState({});

    // UI States
    const [timeSlot, setTimeSlot] = useState(null);
    const [USER, setUSER] = useState(null);

    // Date States
    const [month, setMonth] = useState(0);
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");

    // ──────────────────────────────────────────────────────────
    // T+2 CALCULATION LOGIC
    // ──────────────────────────────────────────────────────────
    const TODAY = new Date();
    // Safe date is Today + 2 days
    const SAFE_DATE = new Date();
    // SAFE_DATE.setDate(TODAY.getDate() + 3);

    const MIN_DAY = SAFE_DATE.getDate();
    const MIN_MONTH = SAFE_DATE.getMonth() + 1; // 1-12
    const MIN_YEAR = SAFE_DATE.getFullYear();

    const CURRENT_YEAR_STR = String(TODAY.getFullYear());

    const MONTHS = [
        { label: "Month", value: 0 },
        { label: "January", value: 1 }, { label: "February", value: 2 },
        { label: "March", value: 3 }, { label: "April", value: 4 },
        { label: "May", value: 5 }, { label: "June", value: 6 },
        { label: "July", value: 7 }, { label: "August", value: 8 },
        { label: "September", value: 9 }, { label: "October", value: 10 },
        { label: "November", value: 11 }, { label: "December", value: 12 },
    ];

    // ──────────────────────────────────────────────────────────
    // INITIALIZATION
    // ──────────────────────────────────────────────────────────
    const getRole = async () => {
        try {
            const data = await Storage.getData("DATA");
            if (data?.transid) {
                setUSER(data.transid);
            }
        } catch (error) {
            console.error("getRole error:", error);
        }
    };

    useEffect(() => {
        getRole();
    }, []);

    useEffect(() => {
        getDailyMilkProducts();
    }, [USER]);

    // ──────────────────────────────────────────────────────────
    // INITIALIZE FROM EXISTING BOOKING DATA (FOR RENEWAL)
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            if (!UserBooked || UserBooked.length === 0) return;

            const booking = UserBooked[0];
            // Pre-fill data from existing booking
            if (booking?.deliverytype) {
                setTimeSlot(booking.deliverytype);
            }
            // Set start date to the day after the previous booking ended
            if (booking?.bookingenddate) {
                const endDate = new Date(booking.bookingenddate);
                if (!isNaN(endDate.getTime())) {
                    const renewalStartDate = new Date(endDate);
                    renewalStartDate.setDate(renewalStartDate.getDate() + 1);
                    const yearStr = String(renewalStartDate.getFullYear());
                    const monthNum = renewalStartDate.getMonth() + 1;
                    const dayStr = String(renewalStartDate.getDate()).padStart(2, "0");

                    setYear(yearStr);
                    setMonth(monthNum);
                    setDay(dayStr);
                }
            }
            // Pre-fill quantity
            if (booking?.productid && booking?.quantity) {
                setSelectedProductId(booking.productid);
                setQuantities((prev) => ({
                    ...prev,
                    [booking.productid]: booking.quantity
                }));
            }
        } catch (error) {
            console.error("Prefill booking data error:", error);
        }
    }, [UserBooked, products]);

    const getDailyMilkProducts = async () => {
        if (!USER) return;

        setLoading(true, "Loading Products...");
        try {
            const { Response } = await API.GET("DailyMilkProducts");
            const safeProducts = Array.isArray(Response) ? Response : [];
            setProducts(safeProducts);
            setSelectedProductId((prev) =>
                safeProducts.some((prod) => prod?.transid === prev)
                    ? prev
                    : (safeProducts[0]?.transid || null)
            );
            const initialQtys = safeProducts.reduce((acc, prod) => {
                if (prod?.transid) {
                    acc[prod.transid] = 0;
                }
                return acc;
            }, {});
            setQuantities(initialQtys);
        } catch (err) {
            console.error("getDailyMilkProducts error:", err);
            setProducts([]);
            setQuantities({});
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────────────────────────
    const handleProductChange = (productId) => {
        try {
            if (!Array.isArray(products) || products.length === 0) return;
            if (!productId) return;

            setSelectedProductId(productId);
            // Reset quantities so only the selected product stays active
            const resetQtys = products.reduce((acc, prod) => {
                if (prod?.transid) {
                    acc[prod.transid] = 0;
                }
                return acc;
            }, {});
            setQuantities(resetQtys);
        } catch (error) {
            console.error("handleProductChange error:", error);
        }
    };

    const changeQuantity = (productId, increment) => {
        try {
            if (!productId || typeof increment !== "number") return;
            setQuantities((prev) => {
                const current = Number(prev?.[productId] || 0);
                const newQty = Math.max(0, current + increment);
                return { ...prev, [productId]: parseFloat(newQty.toFixed(2)) };
            });
        } catch (error) {
            console.error("changeQuantity error:", error);
        }
    };

    const getAvailableMonths = (selYear) => {
        if (!selYear) return MONTHS;
        const sYear = parseInt(selYear, 10);
        if (sYear === MIN_YEAR) {
            // Filter months to show only current month (if T+2 is in it) or future months
            return MONTHS.filter(m => m.value === 0 || m.value >= MIN_MONTH);
        }
        return MONTHS;
    };

    const getAvailableDays = (selMonth, selYear) => {
        const days = getDaysInMonth(selMonth, selYear);
        if (!selMonth || !selYear) return days;

        const sMonth = parseInt(selMonth, 10);
        const sYear = parseInt(selYear, 10);

        // Filter days to start from T+2 if the selected month/year match the T+2 date
        if (sYear === MIN_YEAR && sMonth === MIN_MONTH) {
            return days.filter(d => d >= MIN_DAY);
        }
        return days;
    };

    const safeNavigateAfterSubmit = () => {
        try {
            if (navigation?.canGoBack?.()) {
                navigation.goBack();
                return;
            }

            const navState = navigation?.getState?.();
            const currentRouteName = navState?.routes?.[navState.index]?.name;
            if (currentRouteName !== "Main") {
                navigation.navigate("Main");
            }
        } catch (error) {
            console.error("safeNavigateAfterSubmit error:", error);
        }
    };

    const handleSubmit = async () => {
        if (isSubmittingRef.current) return;

        try {
            isSubmittingRef.current = true;
            const currentProd = products.find((prod) => prod?.transid === selectedProductId);
            if (!currentProd?.transid) {
                Alert.alert("Error", "Please select a product.");
                return;
            }

            const qty = Number(quantities?.[currentProd.transid] || 0);

            if (qty <= 0) {
                Alert.alert("Error", "Please select a quantity.");
                return;
            }
            if (!timeSlot) {
                Alert.alert("Error", "Please select Morning or Evening.");
                return;
            }
            if (!year || !month || !day) {
                Alert.alert("Error", "Please select a valid start date.");
                return;
            }

            const USERID = await Storage.getData("USERID");
            const bookingSource = UserBooked?.[0];

            if (!bookingSource?.dailymilkregistrationid) {
                Alert.alert("Error", "Renewal data is missing. Please reopen the page.");
                return;
            }

            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const startdate = new Date(dateString);
            const enddate = new Date(startdate);
            enddate.setDate(startdate.getDate() + 29);

            if (isNaN(startdate.getTime()) || isNaN(enddate.getTime())) {
                Alert.alert("Error", "Invalid booking date selected.");
                return;
            }

            const BookingID = uuidv4();
            const totalAmount = qty * currentProd.price * 30;

            setLoading(true, "Confirming Booking...");

            console.warn("Preparing booking data...", UserBooked);

            const bookingdata = {
                transid: uuidv4(),
                bookingid: BookingID,
                dailymilkregistrationid: bookingSource.dailymilkregistrationid,
                userid: USERID,
                productid: currentProd.transid,
                productname: currentProd.name,
                price: currentProd.price,
                quantity: qty,
                totalamount: parseFloat(totalAmount.toFixed(2)),
                deliverytype: timeSlot,
                bookingstartdate: new Date(dateString).toISOString(),
                bookingenddate: enddate.toISOString(),
                rcu: USER,
                renewal: 1,
                status: 1,
                paid: null,
                paidamount: 0,
                payment_mode: null,
                payment_status: null,
                payment_time: null,
                pregnancy_status: 0,
            };

            console.warn("Booking Data:", JSON.stringify(bookingdata, null, 2));
            await API.POST("DailyMilkBooking", bookingdata);

            Alert.alert(
                "Success",
                `Booking renewed successfully from ${dateString}.`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            safeNavigateAfterSubmit();
                        },
                    },
                ]
            );

            // Alert.alert("Success", `Booking renewed for ${dateString}!`, [
            //     {
            //         text: "OK", onPress: () => {
            //             setTimeout(() => {
            //                 navigation.goBack();
            //             }, 500);
            //         }
            //     }
            // ]);
        } catch (err) {
            console.error("Submission error:", err);
            Alert.alert("Failed", "Could not complete booking renewal.");
        } finally {
            isSubmittingRef.current = false;
            setLoading(false);
        }
    };

    const currentProduct = products.find((prod) => prod?.transid === selectedProductId) || null;

    return (
        <View className="flex-1 px-4 py-5 pt-10  bg-gray-800 ">
            <Text className="text-white text-center text-2xl my-2">
                Renew Daily Milk Subscription
            </Text>
            {/* ──────────────── PRODUCT GRID ──────────────── */}
            <View className="mb-4">
                <Text className="text-white text-base font-bold mb-3">
                    Select Product
                </Text>

                <View className="flex-row flex-wrap justify-between">
                    {products.map((product) => {
                        const isSelected = product?.transid === selectedProductId;
                        return (
                            <TouchableOpacity
                                key={product.transid}
                                onPress={() => handleProductChange(product.transid)}
                                activeOpacity={0.9}
                                className={`w-[48%] rounded-2xl p-3 mb-3 border ${isSelected ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"}`}
                            >
                                <Image
                                    source={{ uri: getImageUrl(product.image) }}
                                    className="w-full h-[100px] rounded-xl bg-gray-50"
                                    contentFit="contain"
                                    cachePolicy="memory-disk"
                                />
                                <Text className={`mt-2 text-sm font-bold text-center ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                                    {product.name}
                                </Text>
                                <Text className="text-xs text-gray-500 text-center mt-1">
                                    ₹ {Number(product.price || 0).toFixed(2)}
                                </Text>
                                {isSelected && (
                                    <Text className="text-[11px] text-blue-600 font-semibold text-center mt-2">
                                        Selected
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {currentProduct && (
                <View className="rounded-3xl bg-white p-5 items-center shadow-2xl border border-gray-100 mb-4">
                    <Image
                        source={{ uri: getImageUrl(currentProduct.image) }}
                        className="w-[140px] h-[140px] rounded-xl"
                        contentFit="contain"
                        cachePolicy="memory-disk"
                    />
                    <Text className="mt-3 text-lg font-bold text-gray-800 text-center">
                        {currentProduct.name}
                    </Text>
                    <Text className="text-sm text-gray-500 font-medium">
                        ₹ {Number(currentProduct.price || 0).toFixed(2)}
                    </Text>
                    <Text className="mt-2 text-xs text-gray-500 text-center">
                        Adjust quantity for the selected product
                    </Text>

                    <View className="flex-row items-center mt-4">
                        <TouchableOpacity
                            className="w-10 h-10 rounded-full bg-red-500 justify-center items-center shadow-sm"
                            onPress={() => changeQuantity(currentProduct.transid, -Number(currentProduct.increment || 1))}
                        >
                            <Text className="text-white text-xl font-bold">−</Text>
                        </TouchableOpacity>
                        <Text className="w-12 text-center text-xl font-bold text-gray-900">
                            {(quantities[currentProduct.transid] || 0).toFixed(1)}
                        </Text>
                        <TouchableOpacity
                            className="w-10 h-10 rounded-full bg-green-500 justify-center items-center shadow-sm"
                            onPress={() => changeQuantity(currentProduct.transid, Number(currentProduct.increment || 1))}
                        >
                            <Text className="text-white text-xl font-bold">＋</Text>
                        </TouchableOpacity>
                    </View>
                    <Text className="mt-3 text-[12px] text-blue-600 font-black tracking-widest uppercase">
                        Total: ₹ {((quantities[currentProduct.transid] || 0) * Number(currentProduct.price || 0)).toFixed(2)}
                    </Text>
                </View>
            )}

            {!currentProduct && (
                <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
                    <Text className="text-gray-600 text-center">
                        No product available right now.
                    </Text>
                </View>
            )}

            {/* ──────────────── SLOT SELECTION ──────────────── */}
            <View className="flex-row justify-center my-4">
                {["Morning", "Evening"].map((slot) => (
                    <TouchableOpacity
                        key={slot}
                        onPress={() => setTimeSlot(slot)}
                        className={`px-10 py-3 rounded-full border-2 mx-2 shadow-sm ${timeSlot === slot ? "bg-blue-500 border-blue-500" : "bg-white border-blue-500"}`}
                    >
                        <Text className={`font-black uppercase text-xs ${timeSlot === slot ? "text-white" : "text-blue-500"}`}>{slot}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ──────────────── DATE SELECTION (T+2 RESTRICTED) ──────────────── */}
            <View className="p-5 rounded-3xl bg-gray-900 shadow-xl mb-6">
                <Text className="text-white text-base font-bold mb-4 tracking-tight">Renewal Booking Start Date </Text>

                <View className="bg-gray-800 rounded-xl mb-3 border border-gray-700">
                    <Picker
                        selectedValue={year}
                        onValueChange={(val) => { setYear(val); setMonth(""); setDay(""); }}
                        dropdownIconColor="#fff"
                        style={{ color: "#fff" }}
                    >
                        <Picker.Item label="Select Year" value="" />
                        <Picker.Item label={CURRENT_YEAR_STR} value={CURRENT_YEAR_STR} />
                        <Picker.Item label={String(parseInt(CURRENT_YEAR_STR) + 1)} value={String(parseInt(CURRENT_YEAR_STR) + 1)} />
                    </Picker>
                </View>

                <View className="flex-row">
                    <View className="flex-1 bg-gray-800 rounded-xl mr-2 border border-gray-700">
                        <Picker
                            selectedValue={month}
                            onValueChange={(val) => { setMonth(val); setDay(""); }}
                            dropdownIconColor="#fff"
                            style={{ color: "#fff" }}
                        >
                            {getAvailableMonths(year).map((m) => (
                                <Picker.Item key={m.value} label={m.label} value={m.value} />
                            ))}
                        </Picker>
                    </View>
                    <View className="flex-1 bg-gray-800 rounded-xl border border-gray-700">
                        <Picker
                            selectedValue={day}
                            onValueChange={(val) => setDay(val)}
                            dropdownIconColor="#fff"
                            style={{ color: "#fff" }}
                        >
                            <Picker.Item label="Day" value="" />
                            {getAvailableDays(month, year).map((d) => (
                                <Picker.Item key={d} label={d.toString().padStart(2, "0")} value={d.toString().padStart(2, "0")} />
                            ))}
                        </Picker>
                    </View>
                </View>
            </View>

            {/* ──────────────── SUBMIT ──────────────── */}
            <TouchableOpacity
                className="bg-blue-600 rounded-2xl py-5 items-center shadow-2xl active:bg-blue-700"
                onPress={handleSubmit}
            >
                <Text className="text-white text-lg font-black uppercase tracking-widest">Confirm Booking</Text>
            </TouchableOpacity>
        </View>
    );
};

export default DailyMilkBooking;
