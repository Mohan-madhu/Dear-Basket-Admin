// DailyMilkBookingScreen.js

import React, { useState, useEffect, useRef } from "react";
import { getImageUrl } from "../../config";
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Picker } from "@react-native-picker/picker";
import Storage from "../../App_Utils/Services/StorageService";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const getDaysInMonth = (monthValue, yearValue) => {
    if (!monthValue || !yearValue) return [];
    const m = parseInt(monthValue, 10);
    const y = parseInt(yearValue, 10);
    if (isNaN(m) || isNaN(y)) return [];

    const date = new Date(y, m, 0);
    const numDays = date.getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
};

const DailyMilkBooking = ({ DailyMilkRegistrationID, setupd, CheckAlreadyRegistered, isrenewal }) => {
    const { setLoading } = useLoading();
    const [products, setProducts] = useState([]);
    const [currentProductIndex, setCurrentProductIndex] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState(null);
    
    // Slide animation for product carousel
    const slideAnim = useRef(new Animated.Value(0)).current;

    const [quantities, setQuantities] = useState({});
    const [timeSlot, setTimeSlot] = useState(null);
    const [USER, setUSER] = useState(null);

    // Date picker states
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");

    const TODAY = new Date();
    const CURRENT_YEAR_STR = String(TODAY.getFullYear());
    const CURRENT_MONTH_STR = String(TODAY.getMonth() + 1).padStart(2, "0");
    const CURRENT_DAY_STR = String(TODAY.getDate()).padStart(2, "0");

    const getRole = async () => {
        var data = await Storage.getData("DATA");
        setUSER(data.transid);
    };

    useEffect(() => {
        getRole();
    }, []);

    useEffect(() => {
        if (USER) {
            getDailyMilkProducts();
        }
    }, [USER]);

    const getDailyMilkProducts = async () => {
        setLoading(true, "Loading Daily Milk Products");
        try {
            var { Response } = await API.GET("DailyMilkProducts");
            setProducts(Response);
            
            // Initialize quantities for all products
            const initialQuantities = {};
            Response.forEach(prod => {
                initialQuantities[prod.transid] = 0;
            });
            setQuantities(initialQuantities);
            
            // Auto-select first product if available
            if (Response.length > 0) {
                setSelectedProductId(Response[0].transid);
                setCurrentProductIndex(0);
            }
        } catch (err) {
            console.error("Error loading products:", err);
            Alert.alert("Error", "Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const changeQuantity = (productId, increment) => {
        // If trying to add quantity to a non-selected product, first select it
        if (increment > 0 && productId !== selectedProductId) {
            // Set all other products to 0
            const resetQuantities = {};
            products.forEach(prod => {
                resetQuantities[prod.transid] = 0;
            });
            setQuantities(resetQuantities);
            
            // Select the new product
            setSelectedProductId(productId);
            const productIndex = products.findIndex(p => p.transid === productId);
            if (productIndex !== -1) {
                navigateToProduct(productIndex);
            }
        }

        setQuantities((prev) => {
            const current = prev[productId];
            const product = products.find((p) => p.transid === productId);

            if (!product) return prev;

            let newQty = Math.max(0, current + increment);
            newQty = parseFloat(newQty.toFixed(2));
            
            return { ...prev, [productId]: newQty };
        });
    };

    const navigateToProduct = (index) => {
        if (index < 0 || index >= products.length) return;
        
        Animated.spring(slideAnim, {
            toValue: index * -SCREEN_WIDTH,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
        }).start();
        
        setCurrentProductIndex(index);
        const productId = products[index].transid;
        setSelectedProductId(productId);
    };

    const handleSelectProduct = (productId) => {
        // Reset all quantities to 0
        const resetQuantities = {};
        products.forEach(prod => {
            resetQuantities[prod.transid] = 0;
        });
        setQuantities(resetQuantities);
        
        // Select the new product
        setSelectedProductId(productId);
        const productIndex = products.findIndex(p => p.transid === productId);
        if (productIndex !== -1) {
            navigateToProduct(productIndex);
        }
    };

    const getAvailableMonths = (selectedYear) => {
        if (!selectedYear) {
            return MONTHS;
        }

        if (selectedYear === CURRENT_YEAR_STR) {
            return MONTHS.filter((m) => {
                return (
                    m.value === "" ||
                    parseInt(m.value, 10) >= parseInt(CURRENT_MONTH_STR, 10)
                );
            });
        }

        return MONTHS;
    };

    const getAvailableDays = (selectedMonth, selectedYear) => {
        const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear);

        if (!selectedMonth || !selectedYear) {
            return daysInSelectedMonth;
        }

        if (
            selectedYear === CURRENT_YEAR_STR &&
            selectedMonth === CURRENT_MONTH_STR
        ) {
            return daysInSelectedMonth.filter((d) => {
                return d >= parseInt(CURRENT_DAY_STR, 10);
            });
        }

        return daysInSelectedMonth;
    };

    const handleSubmit = async () => {
        try {
            // Check if any product has quantity > 0
            const hasQuantity = Object.values(quantities).some(qty => qty > 0);
            if (!hasQuantity) {
                Alert.alert(
                    "Validation Error",
                    "Please select at least one item quantity."
                );
                return;
            }

            if (!timeSlot) {
                Alert.alert("Validation Error", "Please choose Morning or Evening.");
                return;
            }

            if (!year || !month || !day) {
                Alert.alert("Validation Error", "Please select a valid start date.");
                return;
            }

            const chosenDateNum = new Date(`${year}-${month}-${day}`).getTime();
            const todayMidnight = new Date(
                `${CURRENT_YEAR_STR}-${CURRENT_MONTH_STR}-${CURRENT_DAY_STR}T00:00:00`
            ).getTime();

            const threeDaysFromToday = todayMidnight + (3 * 24 * 60 * 60 * 1000);

            if (chosenDateNum <= threeDaysFromToday && !isrenewal) {
                Alert.alert(
                    "Validation Error",
                    "Please select a date that is at least 3 days in the future."
                );
                return;
            }

            const USER = await Storage.getData("USER");
            const USERID = await Storage.getData("USERID");

            const dateString = `${year}-${month}-${day}`;
            const startdate = new Date(dateString);
            const enddate = new Date(startdate);
            enddate.setDate(startdate.getDate() + 29);
            const BookingID = uuidv4();

            setLoading(true, "Adding New Bookings");

            const bookingPromises = [];

            // Only submit products with quantity > 0
            products.forEach((prod) => {
                const transid = uuidv4();
                const quantity = quantities[prod.transid];

                if (quantity > 0) {
                    const bookingdata = {
                        transid: transid,
                        bookingid: BookingID,
                        dailymilkregistrationid: DailyMilkRegistrationID,
                        userid: USERID,
                        productid: prod.transid,
                        productname: prod.name,
                        price: prod.price,
                        quantity: quantity,
                        deliverytype: timeSlot,
                        bookingstartdate: dateString,
                        bookingenddate: enddate.toISOString().split("T")[0],
                        rcu: USER,
                        renewal: isrenewal ? 1 : 0,
                    };

                    bookingPromises.push(API.POST("DailyMilkBooking", bookingdata));
                }
            });

            await Promise.all(bookingPromises);
            setupd((prev) => prev + 1);
            
            Alert.alert(
                "Success 🎉",
                `Your ${products.find(p => p.transid === selectedProductId)?.name || 'milk'} booking has been submitted successfully!\n\nStart Date: ${dateString}\nDelivery Time: ${timeSlot}\nQuantity: ${quantities[selectedProductId]}L`,
                [
                    {
                        text: "OK",
                        onPress: () => CheckAlreadyRegistered()
                    }
                ]
            );
            
        } catch (err) {
            console.error("Error during handleSubmit:", err);
            Alert.alert(
                "Submission Failed",
                "An error occurred while processing your booking. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const MONTHS = [
        { label: "Month", value: "" },
        { label: "January", value: 1 },
        { label: "February", value: 2 },
        { label: "March", value: 3 },
        { label: "April", value: 4 },
        { label: "May", value: 5 },
        { label: "June", value: 6 },
        { label: "July", value: 7 },
        { label: "August", value: 8 },
        { label: "September", value: 9 },
        { label: "October", value: 10 },
        { label: "November", value: 11 },
        { label: "December", value: 12 },
    ];

    const currentProduct = products[currentProductIndex];

    return (
        <ScrollView className="flex-1 bg-gradient-to-b from-gray-50 to-white">
            <View className="px-4 py-6">
                {/* Header Section */}
                <View className="mb-8">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">
                        Daily Milk Booking
                    </Text>
                    <Text className="text-gray-600 text-base">
                        Select your preferred product, quantity, and delivery schedule
                    </Text>
                </View>

                {/* Product Section */}
                <View className="mb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <View>
                            <Text className="text-xl font-bold text-gray-900">
                                Select Product
                            </Text>
                            {products.length > 1 && (
                                <Text className="text-gray-500 text-sm mt-1">
                                    {currentProductIndex + 1} of {products.length}
                                </Text>
                            )}
                        </View>
                        
                        {/* Navigation Arrows - Only show if more than 1 product */}
                        {products.length > 1 && (
                            <View className="flex-row bg-gray-100 rounded-2xl p-1">
                                <TouchableOpacity
                                    onPress={() => navigateToProduct(currentProductIndex - 1)}
                                    disabled={currentProductIndex === 0}
                                    className={`p-2 rounded-xl ${currentProductIndex === 0 ? 'opacity-30' : 'active:bg-gray-200'}`}
                                >
                                    <Icon 
                                        name="chevron-left" 
                                        size={24} 
                                        color={currentProductIndex === 0 ? "#9ca3af" : "#4f46e5"} 
                                    />
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    onPress={() => navigateToProduct(currentProductIndex + 1)}
                                    disabled={currentProductIndex === products.length - 1}
                                    className={`p-2 rounded-xl ${currentProductIndex === products.length - 1 ? 'opacity-30' : 'active:bg-gray-200'}`}
                                >
                                    <Icon 
                                        name="chevron-right" 
                                        size={24} 
                                        color={currentProductIndex === products.length - 1 ? "#9ca3af" : "#4f46e5"} 
                                    />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Product Indicator Dots - Only show if more than 1 product */}
                    {products.length > 1 && (
                        <View className="flex-row justify-center mb-6">
                            {products.map((_, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => navigateToProduct(index)}
                                    className={`h-2 rounded-full mx-1 transition-all duration-300 ${index === currentProductIndex ? 'w-8 bg-indigo-600' : 'w-2 bg-gray-300'}`}
                                />
                            ))}
                        </View>
                    )}

                    {/* Product Carousel */}
                    <View className="overflow-hidden h-[280px] mb-4">
                        <Animated.View 
                            style={{
                                flexDirection: 'row',
                                transform: [{ translateX: slideAnim }],
                            }}
                        >
                            {products.map((prod, index) => {
                                const qty = quantities[prod.transid];
                                const isSelected = selectedProductId === prod.transid;
                                
                                return (
                                    <View 
                                        key={prod.transid} 
                                        style={{ width: SCREEN_WIDTH - 32 }}
                                        className="items-center justify-center"
                                    >
                                        <View 
                                            className={`w-full max-w-md rounded-3xl p-6 items-center shadow-2xl ${isSelected ? 'bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-500' : 'bg-white border border-gray-200'}`}
                                            style={{
                                                shadowColor: isSelected ? '#4f46e5' : '#000',
                                                shadowOffset: { width: 0, height: 8 },
                                                shadowOpacity: isSelected ? 0.15 : 0.05,
                                                shadowRadius: isSelected ? 16 : 12,
                                                elevation: isSelected ? 8 : 4,
                                            }}
                                        >
                                            <View className="mb-4">
                                                <Image
                                                    source={{
                                                        uri: getImageUrl(prod.image),
                                                    }}
                                                    className="w-[140px] h-[140px] rounded-2xl"
                                                    resizeMode="cover"
                                                />
                                            </View>
                                            
                                            <View className="items-center mb-4">
                                                <Text className="text-2xl font-bold text-gray-900 mb-1">
                                                    {prod.name}
                                                </Text>
                                                <View className="bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-1.5 rounded-full">
                                                    <Text className="text-indigo-700 font-semibold text-base">
                                                        ₹ {prod.price.toFixed(2)} / litre
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="flex-row items-center mb-4">
                                                <TouchableOpacity
                                                    className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 justify-center items-center active:scale-90"
                                                    onPress={() => changeQuantity(prod.transid, -prod.increment)}
                                                    style={{
                                                        shadowColor: '#ef4444',
                                                        shadowOffset: { width: 0, height: 4 },
                                                        shadowOpacity: 0.3,
                                                        shadowRadius: 8,
                                                    }}
                                                >
                                                    <Text className="text-white text-2xl font-bold">−</Text>
                                                </TouchableOpacity>
                                                
                                                <View className="mx-5 items-center min-w-[80px]">
                                                    <Text className="text-3xl font-bold text-gray-900">
                                                        {qty.toFixed(2)}
                                                    </Text>
                                                    <Text className="text-gray-500 text-sm uppercase tracking-wider mt-1">
                                                        Litres
                                                    </Text>
                                                </View>
                                                
                                                <TouchableOpacity
                                                    className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 justify-center items-center active:scale-90"
                                                    onPress={() => changeQuantity(prod.transid, prod.increment)}
                                                    style={{
                                                        shadowColor: '#10b981',
                                                        shadowOffset: { width: 0, height: 4 },
                                                        shadowOpacity: 0.3,
                                                        shadowRadius: 8,
                                                    }}
                                                >
                                                    <Text className="text-white text-2xl font-bold">＋</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View className="w-full items-center">
                                                <View className="bg-gray-50 rounded-xl p-3 mb-3 w-full">
                                                    <View className="flex-row justify-between items-center">
                                                        <Text className="text-gray-600 font-medium">Total Amount:</Text>
                                                        <Text className="text-2xl font-bold text-indigo-700">
                                                            ₹ {(qty * prod.price).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {!isSelected && qty === 0 ? (
                                                    <TouchableOpacity
                                                        onPress={() => handleSelectProduct(prod.transid)}
                                                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl py-3 px-6 active:scale-95 w-full"
                                                        style={{
                                                            shadowColor: '#4f46e5',
                                                            shadowOffset: { width: 0, height: 4 },
                                                            shadowOpacity: 0.3,
                                                            shadowRadius: 8,
                                                        }}
                                                    >
                                                        <Text className="text-white text-center font-bold text-base">
                                                            Select This Product
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : isSelected && qty > 0 ? (
                                                    <View className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl py-3 px-6 border border-green-200 w-full">
                                                        <View className="flex-row items-center justify-center">
                                                            <Icon name="check-circle" size={20} color="#10b981" />
                                                            <Text className="text-green-700 font-bold text-base ml-2">
                                                                Selected • {qty} Litres
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View className="bg-gray-100 rounded-xl py-3 px-6 w-full">
                                                        <Text className="text-gray-500 text-center font-medium">
                                                            Add quantity to select
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </Animated.View>
                    </View>
                </View>

                {/* Delivery Time Section */}
                <View className="mb-8">
                    <Text className="text-xl font-bold text-gray-900 mb-4">
                        Preferred Delivery Time
                    </Text>
                    <View className="flex-row justify-center space-x-6">
                        {["Morning", "Evening"].map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                onPress={() => setTimeSlot(slot)}
                                className={`flex-1 max-w-[160px] rounded-2xl py-4 px-2 items-center ${timeSlot === slot
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                                    : "bg-white border-2 border-gray-200"
                                    }`}
                                style={{
                                    shadowColor: timeSlot === slot ? '#4f46e5' : '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: timeSlot === slot ? 0.2 : 0.05,
                                    shadowRadius: timeSlot === slot ? 12 : 8,
                                    elevation: timeSlot === slot ? 6 : 2,
                                }}
                            >
                                <Icon 
                                    name={slot === "Morning" ? "weather-sunny" : "weather-night"} 
                                    size={32} 
                                    color={timeSlot === slot ? "white" : "#6b7280"} 
                                />
                                <Text 
                                    className={`text-lg font-bold mt-2 ${timeSlot === slot ? "text-white" : "text-gray-800"
                                        }`}
                                >
                                    {slot}
                                </Text>
                                {timeSlot === slot && (
                                    <Icon name="check-circle" size={20} color="white" style={{ marginTop: 8 }} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Date Selection Section */}
                <View className="mb-8 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl">
                    <View className="mb-6">
                        <Text className="text-2xl font-bold text-white mb-2">
                            📅 Start Date
                        </Text>
                        <Text className="text-gray-300 text-base">
                            Choose when you want deliveries to begin
                        </Text>
                    </View>

                    <View className="space-y-5">
                        <View className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                            <Picker
                                selectedValue={year}
                                onValueChange={(val) => {
                                    setYear(val);
                                    if (val === CURRENT_YEAR_STR) {
                                        if (
                                            month &&
                                            parseInt(month, 10) < parseInt(CURRENT_MONTH_STR, 10)
                                        ) {
                                            setMonth("");
                                            setDay("");
                                        } else if (month === CURRENT_MONTH_STR) {
                                            if (
                                                day &&
                                                parseInt(day, 10) < parseInt(CURRENT_DAY_STR, 10)
                                            ) {
                                                setDay("");
                                            }
                                        }
                                    }
                                    const possibleDays = getDaysInMonth(month, val);
                                    if (day && parseInt(day, 10) > possibleDays.length) {
                                        setDay("");
                                    }
                                }}
                                mode="dropdown"
                                dropdownIconColor="#fff"
                                style={{
                                    color: year ? "#ffffff" : "#9ca3af",
                                    fontSize: 16,
                                    height: 60,
                                }}
                            >
                                <Picker.Item 
                                    label="🎯 Select Year" 
                                    value="" 
                                    style={{ fontSize: 16, color: '#9ca3af' }} 
                                />
                                <Picker.Item
                                    label={CURRENT_YEAR_STR}
                                    value={CURRENT_YEAR_STR}
                                    style={{ fontSize: 16, color: '#ffffff' }}
                                />
                                <Picker.Item
                                    label={String(parseInt(CURRENT_YEAR_STR, 10) + 1)}
                                    value={String(parseInt(CURRENT_YEAR_STR, 10) + 1)}
                                    style={{ fontSize: 16, color: '#ffffff' }}
                                />
                            </Picker>
                        </View>

                        <View className="flex-row space-x-4">
                            <View className="flex-1 bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                                <Picker
                                    selectedValue={month}
                                    onValueChange={(val) => {
                                        setMonth(val);
                                        if (year === CURRENT_YEAR_STR && val === CURRENT_MONTH_STR) {
                                            if (
                                                day &&
                                                parseInt(day, 10) < parseInt(CURRENT_DAY_STR, 10)
                                            ) {
                                                setDay("");
                                            }
                                        } else {
                                            const possibleDays = getDaysInMonth(val, year);
                                            if (day && parseInt(day, 10) > possibleDays.length) {
                                                setDay("");
                                            }
                                        }
                                    }}
                                    mode="dropdown"
                                    dropdownIconColor="#fff"
                                    style={{
                                        color: month ? "#ffffff" : "#9ca3af",
                                        fontSize: 16,
                                        height: 60,
                                    }}
                                >
                                    {getAvailableMonths(year).map((m) => (
                                        <Picker.Item
                                            key={m.value}
                                            label={m.value === "" ? "📅 Month" : m.label}
                                            value={m.value}
                                            style={{ 
                                                fontSize: 16, 
                                                color: m.value === "" ? "#9ca3af" : "#ffffff" 
                                            }}
                                        />
                                    ))}
                                </Picker>
                            </View>

                            <View className="flex-1 bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                                <Picker
                                    selectedValue={day}
                                    onValueChange={(val) => setDay(val)}
                                    mode="dropdown"
                                    dropdownIconColor="#fff"
                                    style={{
                                        color: day ? "#ffffff" : "#9ca3af",
                                        fontSize: 16,
                                        height: 60,
                                    }}
                                >
                                    <Picker.Item 
                                        label="📆 Day" 
                                        value="" 
                                        style={{ fontSize: 16, color: '#9ca3af' }} 
                                    />
                                    {getAvailableDays(month, year).map((d) => {
                                        const twoDigit = d.toString().padStart(2, "0");
                                        return (
                                            <Picker.Item
                                                key={twoDigit}
                                                label={twoDigit}
                                                value={twoDigit}
                                                style={{ fontSize: 16, color: '#ffffff' }}
                                            />
                                        );
                                    })}
                                </Picker>
                            </View>
                        </View>
                    </View>

                    {/* Selected Date Preview */}
                    {year && month && day && (
                        <View className="mt-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-2xl p-4 border border-indigo-800/30">
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="text-gray-300 text-sm">Selected Start Date</Text>
                                    <Text className="text-white text-xl font-bold">
                                        {new Date(`${year}-${month}-${day}`).toLocaleDateString('en-IN', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </Text>
                                </View>
                                <Icon name="calendar-check" size={32} color="#8b5cf6" />
                            </View>
                        </View>
                    )}
                </View>

                {/* Booking Summary */}
                {currentProduct && quantities[currentProduct.transid] > 0 && (
                    <View className="mb-8 rounded-3xl bg-gradient-to-br from-white to-gray-50 p-6 border-2 border-indigo-100 shadow-lg">
                        <Text className="text-2xl font-bold text-gray-900 mb-4">
                            📋 Booking Summary
                        </Text>
                        
                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                <Text className="text-gray-600 font-medium">Product:</Text>
                                <Text className="text-gray-900 font-bold text-lg">{currentProduct.name}</Text>
                            </View>
                            
                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                <Text className="text-gray-600 font-medium">Quantity:</Text>
                                <Text className="text-gray-900 font-bold text-lg">{quantities[currentProduct.transid]} Litres</Text>
                            </View>
                            
                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                <Text className="text-gray-600 font-medium">Delivery Time:</Text>
                                <Text className="text-gray-900 font-bold text-lg">{timeSlot || "Not selected"}</Text>
                            </View>
                            
                            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                                <Text className="text-gray-600 font-medium">Start Date:</Text>
                                <Text className="text-gray-900 font-bold text-lg">
                                    {year && month && day ? `${day}/${month}/${year}` : "Not selected"}
                                </Text>
                            </View>
                            
                            <View className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mt-4">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-gray-900 font-bold text-lg">Total Amount</Text>
                                    <Text className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        ₹ {(quantities[currentProduct.transid] * currentProduct.price).toFixed(2)}
                                    </Text>
                                </View>
                                <Text className="text-gray-500 text-sm mt-2">
                                    For 30 days • Price includes all taxes
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!selectedProductId || !quantities[selectedProductId] || !timeSlot || !year || !month || !day}
                    className={`rounded-2xl py-5 items-center mb-8 ${!selectedProductId || !quantities[selectedProductId] || !timeSlot || !year || !month || !day
                        ? "bg-gray-200"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600"
                        }`}
                    style={{
                        shadowColor: !selectedProductId || !quantities[selectedProductId] || !timeSlot || !year || !month || !day ? '#9ca3af' : '#4f46e5',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: !selectedProductId || !quantities[selectedProductId] || !timeSlot || !year || !month || !day ? 0.1 : 0.3,
                        shadowRadius: !selectedProductId || !quantities[selectedProductId] || !timeSlot || !year || !month || !day ? 8 : 12,
                        elevation: !selectedProductId || !quantities[selectedProductId] || !timeSlot || !year || !month || !day ? 2 : 8,
                    }}
                >
                    <Text className="text-white text-xl font-bold mb-1">
                        {!selectedProductId || !quantities[selectedProductId] 
                            ? "Select a Product" 
                            : !timeSlot 
                            ? "Choose Delivery Time"
                            : !year || !month || !day
                            ? "Select Start Date"
                            : "Confirm Booking"
                        }
                    </Text>
                    {selectedProductId && quantities[selectedProductId] && currentProduct && (
                        <Text className="text-indigo-100 text-base">
                            Total: ₹ {(quantities[selectedProductId] * currentProduct.price).toFixed(2)} • 30 Days
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default DailyMilkBooking;