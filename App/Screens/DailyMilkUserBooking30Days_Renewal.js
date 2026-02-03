import React, { useState, useEffect, use } from "react";
import { getImageUrl } from "../../config";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
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
    const { UserBooked } = route.params;
    console.log("UserBooked:", UserBooked);

    const navigation = useNavigation()

    // Product States
    const [products, setProducts] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
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
        var data = await Storage.getData("DATA");
        setUSER(data.transid);
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
        if (UserBooked && UserBooked.length > 0) {
            const booking = UserBooked[0];
            // Pre-fill data from existing booking
            if (booking.deliverytype) {
                setTimeSlot(booking.deliverytype);
            }
            // Set start date to the day after the previous booking ended
            if (booking.bookingenddate) {
                const endDate = new Date(booking.bookingenddate);
                const renewalStartDate = new Date(endDate);
                renewalStartDate.setDate(renewalStartDate.getDate() + 1);
                const yearStr = String(renewalStartDate.getFullYear());
                const monthNum = renewalStartDate.getMonth() + 1;
                const dayStr = String(renewalStartDate.getDate()).padStart(2, '0');

                setYear(yearStr);
                setMonth(monthNum);
                setDay(dayStr);
            }
            // Pre-fill quantity
            if (booking.productid && booking.quantity) {
                setQuantities((prev) => ({
                    ...prev,
                    [booking.productid]: booking.quantity
                }));
            }
        }
    }, [UserBooked, products]);

    const getDailyMilkProducts = async () => {
        if (USER) {
            setLoading(true, "Loading Products...");
            try {
                var { Response } = await API.GET("DailyMilkProducts");
                setProducts(Response);
                const initialQtys = Response.reduce((acc, prod) => {
                    acc[prod.transid] = 0;
                    return acc;
                }, {});
                setQuantities(initialQtys);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    // ──────────────────────────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────────────────────────
    const handleProductChange = (index) => {
        setActiveIndex(index);
        // Reset quantities so only the visible product is active
        const resetQtys = products.reduce((acc, prod) => {
            acc[prod.transid] = 0;
            return acc;
        }, {});
        setQuantities(resetQtys);
    };

    const changeQuantity = (productId, increment) => {
        setQuantities((prev) => {
            const current = prev[productId] || 0;
            const newQty = Math.max(0, current + increment);
            return { ...prev, [productId]: parseFloat(newQty.toFixed(2)) };
        });
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

    const handleSubmit = async () => {
        try {
            const currentProd = products[activeIndex];
            const qty = quantities[currentProd.transid];

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
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const startdate = new Date(dateString);
            const enddate = new Date(startdate);
            enddate.setDate(startdate.getDate() + 29);
            const BookingID = uuidv4();
            const totalAmount = qty * currentProd.price * 30;

            setLoading(true, "Confirming Booking...");

            console.warn("Preparing booking data...", UserBooked);

            const bookingdata = {
                transid: uuidv4(),
                bookingid: BookingID,
                dailymilkregistrationid: UserBooked[0].dailymilkregistrationid,
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


            navigation.navigate("Main");

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
            setLoading(false);
        }
    };

    const currentProduct = products[activeIndex];

    return (
        <View className="flex-1 px-4 py-5 pt-10  bg-gray-800 ">
            <Text className="text-white text-center text-2xl my-2">
                Renew Daily Milk Subscription
            </Text>
            {/* ──────────────── PRODUCT CAROUSEL ──────────────── */}
            <View className="items-center justify-center mb-4">
                <View className="flex-row items-center justify-center w-full relative">
                    {/* Left Navigation Button - Positioned absolutely */}
                    <TouchableOpacity
                        disabled={activeIndex === 0}
                        onPress={() => handleProductChange(activeIndex - 1)}
                        className={`absolute left-0 z-10 p-2 ${activeIndex === 0 ? 'opacity-30' : 'opacity-100'}`}
                        style={{ elevation: 5 }}
                    >
                        <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-lg border border-gray-200">
                            <Icon name="chevron-left" size={30} color="#3b82f6" />
                        </View>
                    </TouchableOpacity>

                    {/* Product Card */}
                    {currentProduct && (
                        <View className="w-[220px] rounded-3xl bg-white p-6 items-center shadow-2xl border border-gray-100 mx-2">
                            <Image
                                source={{ uri: getImageUrl(currentProduct.image) }}
                                className="w-[140px] h-[140px] rounded-xl"
                                resizeMode="contain"
                            />
                            <Text className="mt-3 text-lg font-bold text-gray-800 text-center">{currentProduct.name}</Text>
                            <Text className="text-sm text-gray-500 font-medium">₹ {currentProduct.price.toFixed(2)}</Text>

                            <View className="flex-row items-center mt-4">
                                <TouchableOpacity
                                    className="w-10 h-10 rounded-full bg-red-500 justify-center items-center shadow-sm"
                                    onPress={() => changeQuantity(currentProduct.transid, -currentProduct.increment)}
                                >
                                    <Text className="text-white text-xl font-bold">−</Text>
                                </TouchableOpacity>
                                <Text className="w-12 text-center text-xl font-bold text-gray-900">
                                    {(quantities[currentProduct.transid] || 0).toFixed(1)}
                                </Text>
                                <TouchableOpacity
                                    className="w-10 h-10 rounded-full bg-green-500 justify-center items-center shadow-sm"
                                    onPress={() => changeQuantity(currentProduct.transid, currentProduct.increment)}
                                >
                                    <Text className="text-white text-xl font-bold">＋</Text>
                                </TouchableOpacity>
                            </View>
                            <Text className="mt-3 text-[10px] text-blue-600 font-black tracking-widest uppercase">
                                Total: ₹ {((quantities[currentProduct.transid] || 0) * currentProduct.price).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {/* Right Navigation Button - Positioned absolutely */}
                    <TouchableOpacity
                        disabled={activeIndex === products.length - 1}
                        onPress={() => handleProductChange(activeIndex + 1)}
                        className={`absolute right-0 z-10 p-2 ${activeIndex === products.length - 1 ? 'opacity-30' : 'opacity-100'}`}
                        style={{ elevation: 5 }}
                    >
                        <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-lg border border-gray-200">
                            <Icon name="chevron-right" size={30} color="#3b82f6" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Dots Indicator */}
                {products.length > 0 && (
                    <View className="flex-row mt-6">
                        {products.map((_, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => handleProductChange(i)}
                                className="mx-1"
                            >
                                <View
                                    className={`h-2 rounded-full ${i === activeIndex ? 'bg-blue-600 w-6' : 'bg-gray-300 w-2'}`}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

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