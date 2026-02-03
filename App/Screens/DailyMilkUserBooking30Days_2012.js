

// DailyMilkBookingScreen.js

import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    Button,
    Alert,
    Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DailyMilkStatus from "../Components/DailyMilkStatus";
import { Picker } from "@react-native-picker/picker";
import Storage from "../../App_Utils/Services/StorageService";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";


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

    const date = new Date(y, m, 0); // Day 0 of next month gives last day of current month
    const numDays = date.getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
};


const DailyMilkBooking = ({ DailyMilkRegistrationID, setupd, CheckAlreadyRegistered,isrenewal }) => {
    const { setLoading } = useLoading();
    const [products, setProducts] = useState([]);


    const [quantities, setQuantities] = useState(
        products.reduce((acc, prod) => {
            acc[prod.transid] = 0;
            return acc;
        }, {})
    );
    const [timeSlot, setTimeSlot] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [minDate, setMinDate] = useState("");
    const [maxDate, setMaxDate] = useState("");
    const [USER, setUSER] = useState(null);

    const getRole = async () => {
        var data = await Storage.getData("DATA");
        //console.log(data.transid);
        setUSER(data.transid);
    };

    useEffect(() => {
        getRole();
    }, []);

    useEffect(() => {
        getDailyMilkProducts();
    }, [USER]);

    const getDailyMilkProducts = async () => {
        if (USER) {
            setLoading(true, "Loading Daily Milk Products");

            try {
                //console.log("DailyMilkProducts");
                var { Response } = await API.GET("DailyMilkProducts");

                setProducts(Response);
                setQuantities(
                    Response.reduce((acc, prod) => {
                        acc[prod.transid] = 0;
                        return acc;
                    }, {})
                );
            } catch (err) {
                setLoading(false);
                // Alert.alert("Error", "Failed to save registration.");
            } finally {
                setLoading(false);
            }
            setLoading(false);
        } else {
            console.log("User ID Not Exists");
        }
    };

    useEffect(() => {
        const today = new Date();
        const future = new Date();
        future.setDate(future.getDate() + 29);

        setMinDate(formatDate(today));
        setMaxDate(formatDate(future));
    }, []);

    const changeQuantity = (productId, increment) => {
        setQuantities((prev) => {
            const current = prev[productId];
            const product = products.find((p) => p.transid === productId);

            if (!product) return prev;

            const newQty = Math.max(0, current + increment);
            return { ...prev, [productId]: parseFloat(newQty.toFixed(2)) };
        });
    };

    const handleSubmit = async () => {
        try {
            const totalQty = Object.values(quantities).reduce((sum, q) => sum + q, 0);
            if (totalQty <= 0) {
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
            // const chosenDateNum = new Date(`${year}-${month}-${day}`).getTime();
            // const todayNoon = new Date(
            //   `${CURRENT_YEAR_STR}-${CURRENT_MONTH_STR}-${CURRENT_DAY_STR}T00:00:00`
            // ).getTime();

            // console.log(todayNoon);
            // console.log(chosenDateNum);
            // if (chosenDateNum <= todayNoon) {
            //   Alert.alert("Validation Error", "Start date cannot be in the past.");
            //   return;
            // }

            const chosenDateNum = new Date(`${year}-${month}-${day}`).getTime();
            const todayMidnight = new Date(
                `${CURRENT_YEAR_STR}-${CURRENT_MONTH_STR}-${CURRENT_DAY_STR}T00:00:00`
            ).getTime();

            // Minimum allowed date: 3 days from today
            const threeDaysFromToday = todayMidnight + (3 * 24 * 60 * 60 * 1000);

            console.log("Today midnight:", todayMidnight);
            console.log("Three days from today:", threeDaysFromToday);
            console.log("Chosen date:", chosenDateNum);

            // Check if chosen date is at least 3 days in the future
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
            enddate.setDate(startdate.getDate() + 29); // Calculate 30th day (29 days after start)
            const BookingID = uuidv4();

            // Array to hold all promises from API calls
            const bookingPromises = [];

            // Set loading state once before all API calls
            setLoading(true, "Adding New Bookings");

            // Change map callback to async and collect promises
            products.forEach((prod) => {
                // Using forEach to push promises, or map if you need results
                const transid = uuidv4();
                const quantity = quantities[prod.transid];

                if (quantity > 0) {
                    const bookingdata = {
                        // Ensure this variable name is unique to the loop iteration
                        transid: transid,
                        bookingid: BookingID,
                        dailymilkregistrationid: DailyMilkRegistrationID, // Assuming DailyMilkRegistrationID is defined
                        userid: USERID,
                        productid: prod.transid,
                        productname: prod.name,
                        price: prod.price,
                        quantity: quantity,
                        deliverytype: timeSlot,
                        bookingstartdate: dateString,
                        bookingenddate: enddate.toISOString().split("T")[0],
                        rcu: USER,
                        renewal:isrenewal?1:0,
                    };

                    console.log("Booking Data for submission:", bookingdata);

                    // Push the promise returned by API.POST to the array
                    // Assuming API.POST is designed to hit your /dailymilkbooking endpoint
                    bookingPromises.push(API.POST("DailyMilkBooking", bookingdata)); // Corrected endpoint name if applicable
                }
            });

            // Wait for all booking API calls to complete
            const results = await Promise.all(bookingPromises);
            console.log("All booking submissions completed:", results);
            setupd((prev) => prev + 1);
            // Call GetTypeData() or similar function to refresh data after all bookings are done
            // GetTypeData(); // Uncomment if this function should refresh global data

            Alert.alert(
                "Success",
                `All selected products booked successfully for ${dateString}!`
            );
            CheckAlreadyRegistered()
        } catch (err) {
            console.error("Error during handleSubmit:", err);
            Alert.alert(
                "Submission Failed",
                "An error occurred while processing your booking."
            );
        } finally {
            setLoading(false); // Ensure loading state is turned off
        }
    };
    // ──────────────────────────────────────────────────────────
    //  Birthday fields: Month / Day / Year
    // ──────────────────────────────────────────────────────────
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");

    const TODAY = new Date();
    const CURRENT_YEAR_STR = String(TODAY.getFullYear());
    const CURRENT_MONTH_STR = String(TODAY.getMonth() + 1).padStart(2, "0"); // getMonth is 0-indexed
    const CURRENT_DAY_STR = String(TODAY.getDate()).padStart(2, "0");

    // Inside your React component function (or a custom hook)
    // Assuming `year` and `month` are state variables
    // Example: const [year, setYear] = useState(""); const [month, setMonth] = useState("");

    // Function to get available months based on selected year
    const getAvailableMonths = (selectedYear) => {
        if (!selectedYear) {
            return MONTHS; // Show all months if year is not selected yet
        }

        // If the selected year is the current year, filter out past months
        if (selectedYear === CURRENT_YEAR_STR) {
            return MONTHS.filter((m) => {
                // Keep "Month" placeholder, or months greater than/equal to current month
                return (
                    m.value === "" ||
                    parseInt(m.value, 10) >= parseInt(CURRENT_MONTH_STR, 10)
                );
            });
        }

        // If the selected year is a future year, all months are available
        return MONTHS;
    };

    // Function to get available days based on selected month and year
    const getAvailableDays = (selectedMonth, selectedYear) => {
        const daysInSelectedMonth = getDaysInMonth(selectedMonth, selectedYear); // Get all days for the month/year

        if (!selectedMonth || !selectedYear) {
            return daysInSelectedMonth; // Show all days if month/year not fully selected
        }

        // If the selected year AND month are the current year AND month, filter out past days
        if (
            selectedYear === CURRENT_YEAR_STR &&
            selectedMonth === CURRENT_MONTH_STR
        ) {
            return daysInSelectedMonth.filter((d) => {
                return d >= parseInt(CURRENT_DAY_STR, 10); // Keep days greater than/equal to current day
            });
        }

        // Otherwise (future month in current year, or any month in future year), all days are available
        return daysInSelectedMonth;
    };

    // Month options
    const MONTHS = [
        { label: "Month", value: "" }, // Keep this as is for a placeholder
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

    // Handler for the Next button (Birthday)
    const onNextPress = () => {
        console.log("Birthday submitted:", { month, day, year });
        Alert.alert(
            "Birthday Submitted",
            `Month: ${month || "–"}\nDay: ${day || "–"}\nYear: ${year || "–"}`
        );
    };

    return (
        <View className="flex-1  px-4 py-5 pt-10">
            {products.length === 1 ? (
                // Case: Only one product – center it
                <View className="items-center justify-center h-[220px] mb-4">
                    <View className="w-[130px] rounded-lg bg-gray-100 p-2 items-center shadow-md">
                        <Image
                            source={{
                                uri:
                                    "https://dev.dine360.ca/backend/" +
                                    products[0].image.slice(2),
                            }}
                            className="w-[100px] h-[100px] rounded"
                            resizeMode="cover"
                        />
                        <Text className="mt-2 text-sm font-semibold text-center">
                            {products[0].name}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                            ₹ {products[0].price.toFixed(2)}
                        </Text>

                        <View className="flex-row items-center mt-2">
                            <TouchableOpacity
                                className="w-8 h-8 rounded-full bg-red-500 justify-center items-center active:scale-90"
                                onPress={() =>
                                    changeQuantity(products[0]?.transid, -products[0].increment)
                                }
                            >
                                <Text className="text-white text-lg font-bold">−</Text>
                            </TouchableOpacity>
                            <Text className="w-10 text-center text-base mx-1 font-medium text-gray-800">
                                {/* Add safe checks here */}
                                {products[0]?.transid // Check if transid exists for the first product
                                    ? (quantities[products[0].transid] || 0).toFixed(2) // If exists, get quantity or default to 0, then format
                                    : "0.001"}{" "}
                                {/* Default display if product or transid is missing */}
                            </Text>
                            <TouchableOpacity
                                className="w-8 h-8 rounded-full bg-green-500 justify-center items-center active:scale-90"
                                onPress={() =>
                                    changeQuantity(products[0].transid, products[0].increment)
                                }
                            >
                                <Text className="text-white text-lg font-bold">＋</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="mt-2 text-xs text-blue-600 font-semibold">
                            ₹{" "}
                            {(quantities[products[0].transid] * products[0].price).toFixed(2)}{" "}
                            total
                        </Text>
                    </View>
                </View>
            ) : (
                // Case: Multiple products – horizontal scroll
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="max-h-[220px] mb-4"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        alignItems: "center",
                        flexDirection: "row",
                    }}
                >
                    {products.map((prod) => {
                        const qty = quantities[prod.transid];
                        return (
                            <View
                                key={prod.transid}
                                className="w-[130px] mr-3 rounded-lg bg-gray-100 p-2 items-center shadow-md"
                            >
                                <Image
                                    source={{
                                        uri:
                                            "https://dev.dine360.ca/backend/" +
                                            products[0].image.slice(2),
                                    }}
                                    className="w-[100px] h-[100px] rounded"
                                    resizeMode="cover"
                                />
                                <Text className="mt-2 text-sm font-semibold text-center">
                                    {prod.name}
                                </Text>
                                <Text className="text-xs text-gray-500 mt-1">
                                    ₹ {prod.price.toFixed(2)}
                                </Text>

                                <View className="flex-row items-center mt-2">
                                    <TouchableOpacity
                                        className="w-8 h-8 rounded-full bg-red-500 justify-center items-center"
                                        onPress={() =>
                                            changeQuantity(prod.transid, -prod.increment)
                                        }
                                    >
                                        <Text className="text-white text-lg font-bold">−</Text>
                                    </TouchableOpacity>
                                    <Text className="w-10 text-center text-base mx-1 font-medium text-gray-800">
                                        {qty.toFixed(2)}
                                    </Text>
                                    <TouchableOpacity
                                        className="w-8 h-8 rounded-full bg-green-500 justify-center items-center"
                                        onPress={() => changeQuantity(prod.transid, prod.increment)}
                                    >
                                        <Text className="text-white text-lg font-bold">＋</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text className="mt-2 text-xs text-blue-600 font-semibold">
                                    ₹ {(qty * prod.price).toFixed(2)} total
                                </Text>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* Morning / Evening Slot Toggle */}
            <View className="flex-row justify-center my-5">
                {["Morning", "Evening"].map((slot) => (
                    <TouchableOpacity
                        key={slot}
                        onPress={() => setTimeSlot(slot)}
                        className={`px-5 py-2 rounded-full border mx-2 ${timeSlot === slot
                            ? "bg-blue-500 border-blue-500"
                            : "border-blue-500"
                            }`}
                    >
                        <Text
                            className={`text-sm font-medium ${timeSlot === slot ? "text-white" : "text-blue-500"
                                }`}
                        >
                            {slot}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View className="flex-1  p-4 rounded-2xl mt-4 bg-gray-950  shadow-md mb-3">
                {/* Header / Title */}
                <View className="mb-6">
                    <Text className="text-white text-2xl font-semibold">
                        Booking date to start
                    </Text>
                </View>

                <View className="space-y-4 mb-4">
                    <View className=" flex-row items-center bg-gray-800 rounded-lg h-16 shadow-lg mb-2">
                        <Picker
                            selectedValue={year}
                            onValueChange={(val) => {
                                setYear(val);
                                // If the new year makes the current month/day combination invalid (e.g., going back in time)
                                // We'll reset month and day to avoid selection of past dates.
                                if (val === CURRENT_YEAR_STR) {
                                    // If month is already selected and it's a past month, reset it
                                    if (
                                        month &&
                                        parseInt(month, 10) < parseInt(CURRENT_MONTH_STR, 10)
                                    ) {
                                        setMonth("");
                                        setDay(""); // Also reset day if month is reset
                                    } else if (month === CURRENT_MONTH_STR) {
                                        // If month is current month, check if day is past day and reset
                                        if (
                                            day &&
                                            parseInt(day, 10) < parseInt(CURRENT_DAY_STR, 10)
                                        ) {
                                            setDay("");
                                        }
                                    }
                                }
                                // Always recompute possible days for the (new) selected month/year
                                const possibleDays = getDaysInMonth(month, val);
                                if (day && parseInt(day, 10) > possibleDays.length) {
                                    setDay("");
                                }
                            }}
                            mode="dropdown"
                            dropdownIconColor="#E8EAED"
                            style={{
                                flex: 1,
                                color: year ? "#E8EAED" : "#A8A8A8",
                                fontSize: 14,
                            }}
                            itemStyle={{ fontSize: 14, color: "#000000" }}
                        >
                            <Picker.Item label="Year" value="" color="#A8A8A8" />
                            <Picker.Item
                                label={CURRENT_YEAR_STR}
                                value={CURRENT_YEAR_STR}
                                color="#000000"
                            />
                            <Picker.Item
                                label={String(parseInt(CURRENT_YEAR_STR, 10) + 1)} // Next year
                                value={String(parseInt(CURRENT_YEAR_STR, 10) + 1)}
                                color="#000000"
                            />
                            {/* You can add more future years dynamically if needed */}
                        </Picker>
                    </View>

                    <View className="flex-row items-center space-x-4">
                        <View className="w-3/5 bg-gray-800 rounded-lg h-16 shadow-lg mr-1">
                            <Picker
                                selectedValue={month}
                                onValueChange={(val) => {
                                    setMonth(val);
                                    // If the new month makes the current day invalid (e.g., past day in current month)
                                    if (year === CURRENT_YEAR_STR && val === CURRENT_MONTH_STR) {
                                        if (
                                            day &&
                                            parseInt(day, 10) < parseInt(CURRENT_DAY_STR, 10)
                                        ) {
                                            setDay(""); // Reset day if it's now in the past
                                        }
                                    } else {
                                        // If month changes and it's no longer the current month, re-evaluate day
                                        const possibleDays = getDaysInMonth(val, year);
                                        if (day && parseInt(day, 10) > possibleDays.length) {
                                            setDay("");
                                        }
                                    }
                                }}
                                mode="dropdown"
                                dropdownIconColor="#E8EAED"
                                style={{
                                    flex: 1,
                                    color: month ? "#E8EAED" : "#A8A8A8",
                                    fontSize: 14,
                                }}
                                itemStyle={{
                                    fontSize: 14,
                                    color: "#000000",
                                    marginHorizontal: "12px",
                                }}
                            >
                                {getAvailableMonths(year).map(
                                    (
                                        m // Use the new helper here
                                    ) => (
                                        <Picker.Item
                                            key={m.value}
                                            label={m.label}
                                            value={m.value}
                                            color={m.value === "" ? "#A8A8A8" : "#000000"}
                                        />
                                    )
                                )}
                            </Picker>
                        </View>

                        <View className="flex-1 bg-gray-800 rounded-lg h-16 shadow-lg ml-1">
                            <Picker
                                selectedValue={day}
                                onValueChange={(val) => setDay(val)}
                                mode="dropdown"
                                dropdownIconColor="#E8EAED"
                                style={{
                                    flex: 1,
                                    color: day ? "#E8EAED" : "#A8A8A8",
                                    fontSize: 14,
                                }}
                                itemStyle={{ fontSize: 14, color: "#000000" }}
                            >
                                <Picker.Item label="Day" value="" color="#A8A8A8" />
                                {getAvailableDays(month, year).map((d) => {
                                    // Use the new helper here
                                    const twoDigit = d.toString().padStart(2, "0");
                                    return (
                                        <Picker.Item
                                            key={twoDigit}
                                            label={twoDigit}
                                            value={twoDigit}
                                            color="#000000"
                                        />
                                    );
                                })}
                            </Picker>
                        </View>
                    </View>
                </View>

                {/* Spacer pushes the button to the bottom */}
                <View className="flex-1" />
            </View>

            {/* Submit Button for Booking */}
            <TouchableOpacity
                className="bg-blue-600 rounded-lg py-3 items-center shadow-md"
                onPress={handleSubmit}
            >
                <Text className="text-white text-lg font-semibold">Submit</Text>
            </TouchableOpacity>
        </View>
    );
};

export default DailyMilkBooking;