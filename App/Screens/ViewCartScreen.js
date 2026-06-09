import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    incrementQuantity,
    decrementQuantity,
    clearNormalCart,
    removeFromCart,
} from "../Redux/CartReducer";
import { FontAwesome } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Toaster from "../../App_Utils/Services/ToastService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import * as Location from "expo-location";
import { Image } from 'expo-image';
import CartScreen from "../Components/CartItems";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../../App_Utils/Utils/logger";
import { set } from "date-fns";
import { fi, ms } from "date-fns/locale";

// Add these imports
import Animated from "react-native-reanimated";
import { addToFavorites, removeFromFavorites } from "../Redux/FavouriteReducer";
import NowInIST from "../../App_Utils/Services/DateService";

const DELIVERY_TYPE = {
    MORNING: "Morning",
    EVENING: "Evening",
};

const DAILY_MILK_DELIVERY_SCHEDULE = {
    [DELIVERY_TYPE.MORNING]: {
        startHour: 7,
        endHour: 9,
        cutoffHour: 6,
    },
    [DELIVERY_TYPE.EVENING]: {
        startHour: 17,
        endHour: 19,
        cutoffHour: 16,
    },
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatDateForApi = (date) => {
    const year = date.getUTCFullYear();
    const month = pad2(date.getUTCMonth() + 1);
    const day = pad2(date.getUTCDate());
    return `${year}-${month}-${day}`;
};

const formatDateKey = (date) => formatDateForApi(date).replace(/-/g, "");

const normalizeDeliveryType = (deliveryType) => {
    const normalized = String(deliveryType || "").trim().toLowerCase();

    if (normalized === "evening") return DELIVERY_TYPE.EVENING;
    return DELIVERY_TYPE.MORNING;
};

const getDailyMilkOrderDate = (deliveryType) => {
    const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
    const schedule = DAILY_MILK_DELIVERY_SCHEDULE[normalizedDeliveryType];
    const date = NowInIST();
    const hour = date.getUTCHours();

    if (hour >= schedule.cutoffHour) {
        date.setUTCDate(date.getUTCDate() + 1);
    }

    return {
        date,
        hour,
        orderdate: formatDateForApi(date),
        orderDateKey: formatDateKey(date),
        deliveryType: normalizedDeliveryType,
        schedule,
    };
};

const getPartnerLetter = (mappedpartnerid) => {
    if (!mappedpartnerid || typeof mappedpartnerid !== "string") return null;

    const parts = mappedpartnerid.split("-").filter(Boolean);
    return parts[1] || parts[0] || null;
};

const ViewCartScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const data = route.params;
    const log = createLogger("ViewCartScreen");

    const { favorites } = useSelector((state) => state.favorites);

    const toggleFavorite = (item) => {
        const isFavorite = favorites.some(fav => fav.variantid === item.variantid);

        if (!isFavorite) {
            const favoriteItem = {
                ...item,
                product: item.product || item
            };
            dispatch(addToFavorites(favoriteItem));
        } else {
            dispatch(removeFromFavorites({ variantid: item.variantid }));
        }
    };

    const CartItemWithFavorite = ({ item }) => {
        const dispatch = useDispatch();
        const heartScale = useSharedValue(1);
        const isFavorite = favorites.some(fav => fav.variantid === item.variantid);

        const heartStyle = useAnimatedStyle(() => ({
            transform: [{ scale: heartScale.value }],
        }));

        const toggleFavorite = () => {
            heartScale.value = withSpring(1.3, { damping: 2 }, () => {
                heartScale.value = withSpring(1, { damping: 10 });
            });

            if (!isFavorite) {
                const favoriteItem = {
                    ...item,
                    product: item.product || item
                };
                dispatch(addToFavorites(favoriteItem));
            } else {
                dispatch(removeFromFavorites({ variantid: item.variantid }));
            }
        };

        return (
            <View className="bg-white p-4 rounded-lg my-1 flex-row justify-between items-center">
                {/* Product Info */}
                <View className="flex-1">
                    <Text className="text-lg font-bold">{item.productname}</Text>
                    <Text className="text-sm text-gray-500">{item.variantname}</Text>
                    <Text className="text-lg font-bold mt-1">
                        ₹{item.price} x {item.orderquantity}
                    </Text>
                </View>

                {/* Favorite and Delete Buttons */}
                <View className="flex-row items-center">
                    {/* Favorite Heart Icon */}
                    <TouchableOpacity
                        onPress={toggleFavorite}
                        className="p-2 mr-2 bg-gray-50 rounded-full"
                    >
                        <Animated.View style={heartStyle}>
                            <Ionicons
                                name={isFavorite ? "heart" : "heart-outline"}
                                size={20}
                                color={isFavorite ? "#ef4444" : "#4b5563"}
                            />
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity
                        onPress={() => dispatch(removeFromCart(item))}
                        className="p-2 bg-red-50 rounded-full"
                    >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // State variables
    const [isdailymilkuser, setisdailymilkuser] = useState(false);
    const [deliveryfee, setdeliveryfee] = useState(50);
    const [taxpercentage, settaxpercentage] = useState(3);
    const [currentSection, setCurrentSection] = useState(1); // 1: Products, 2: Order Details, 3: Location
    const [deliveryOption, setDeliveryOption] = useState(1); // 1 for Fast Delivery, 2 for With Daily Milk
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const allCart = useSelector((state) => state.cart.cart || []);
    const cart = useMemo(
        () => allCart.filter((item) => item?.source !== "dearkitchen"),
        [allCart]
    );
    const { setLoading } = useLoading();

    const total = cart
        .map((item) => item.price * item.orderquantity)
        .reduce((cur, prev) => cur + prev, 0);



    const [address, setAddress] = useState("1");
    const [city, setCity] = useState("2");
    const [state, setState] = useState("TAMILNADU");
    const [postalcode, setPostalcode] = useState("606935");
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);

    const addressRef = useRef(null);
    const cityRef = useRef(null);
    const stateRef = useRef(null);
    const postalCodeRef = useRef(null);

    const [userData, setUserData] = useState(null);
    const [USERTYPE, SETUSERTYPE] = useState();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log("Fetching user data from storage...");
                const userData = await Storage.getData("DATA");

                setUserData(userData);
                setAddress(userData?.deliveryaddress);
                setCity(userData?.deliverycity);
                setState(userData?.deliverystate || "TAMIL NADU");
                setPostalcode(userData?.deliverypincode);
                setLatitude(userData?.latitude);
                setLongitude(userData?.longitude);

                console.log("User data retrieved:", userData);
            } catch (error) {
                console.log("Error getting user data:", error);
            }
        };

        fetchUserData();
    }, []);


    // useEffect(() => {
    //     if (total === 0) {
    //         console.log("Cart is empty, navigating back...");
    //         navigation.navigate("Main");
    //     }
    // }, [total]);


    useEffect(() => {
        getLocation();
    }, []);

    const [location, setLocation] = useState(null);

    const getLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Toaster.errortop(
                "Location Error",
                "Permission to access location was denied"
            );
            return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        Toaster.infotop("Location Updated Successfully...");
    };

    const ForceGetLocation = () => {
        setLoading(true, "Fetching Currect Location");
        getLocation();
        setLoading(false);
    };

    // Function to handle Next button
    const handleNext = () => {
        if (currentSection < 3) {
            setCurrentSection(currentSection + 1);
        } else {
            if (total === 0) {
                Toaster.errortop("Your cart is empty. Please add items to proceed.");
                navigation.navigate("Main");
                return;
            }
            ProceeedToPay();
        }
    };

    // Function to handle Previous button
    const handlePrevious = () => {
        if (currentSection > 1) {
            setCurrentSection(currentSection - 1);
        }
    };

    const CheckAlreadyRegistered = async () => {



        if (!userData?.transid) return;


        setLoading(true, "Checking User Registration Status and Fetching Location…");

        try {


            console.log("User TransID:", userData.transid);
            const res = await API.GET("user/dailymilk-active-check/" + userData.transid);
            console.log("API Response for CheckAlreadyRegistered:", res);
            console.log("CheckAlreadyRegistered Response:", res);
            if (res.Response.length === 0) {
                setisdailymilkuser(false)
                setDeliveryOption(1);
                setdeliveryfee(50);
                console.log("Not a Daily Milk User")
            } else if (res.Response[0].status === 1) {
                setisdailymilkuser(true)
                console.log("Daily Milk User")
            }
        } catch {
            setLoading(false);
            // handle error if needed
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        //  console.log("User Data Changed:", userData);
        const checkUser = async () => {
            console.log("Checking if user is a Daily Milk user...");
            await CheckAlreadyRegistered();
        };
        checkUser();
    }, [userData, isdailymilkuser]);

    useEffect(() => {
        if (!isdailymilkuser && deliveryOption !== 1) {
            setDeliveryOption(1);
            setdeliveryfee(50);
        }
    }, [isdailymilkuser, deliveryOption]);



    const ProceeedToPay = async () => {
        if (isPlacingOrder) {
            console.log("Already placing order, ignoring duplicate click");
            return;
        }

        try {
            setIsPlacingOrder(true);
            log("Proceeding to Payment");

            if (!userData?.transid || !userData?.name) {
                Toaster.errortop("User details are still loading. Please try again.");
                return;
            }
            if (!address) {
                Toaster.errortop("Address is missing");
                return;
            }
            if (!city) {
                Toaster.errortop("City is missing");
                return;
            }
            if (!state) {
                Toaster.errortop("State is missing");
                return;
            }
            if (!postalcode) {
                Toaster.errortop("Postal Code is missing");
                return;
            }
            if (!latitude) {
                Toaster.errortop("Latitude is missing. Please turn on the Location.");
                return;
            }
            if (!longitude) {
                Toaster.errortop("Longitude is missing. Please turn on the Location.");
                return;
            }

            log("All Requirements Met");

            let ProductOrderid = uuidv4();
            let selectedDeliveryType = null;
            let selectedOrderDate = null;

            console.log("Delivery Option Selected:", deliveryOption === 1 ? "Fast Delivery" : "With Daily Milk");
            if (deliveryOption === 2) {
                console.log("Daily Milk User - Generating Order ID with Partner Letter...");

                const mappedpartnerid = userData?.mappedpartnerid;
                const partnerLetter = getPartnerLetter(mappedpartnerid);

                if (!mappedpartnerid || !partnerLetter) {
                    Toaster.errortop("Daily Milk partner mapping is missing. Please contact support.");
                    log("Missing or invalid mappedpartnerid for Daily Milk order", "ERROR");
                    return;
                }

                selectedDeliveryType = normalizeDeliveryType(
                    userData?.milkdeliverytype || userData?.deliverytype
                );
                const { date, hour, orderdate, orderDateKey, schedule } = getDailyMilkOrderDate(selectedDeliveryType);
                selectedOrderDate = orderdate;
                console.log("Current Date (IST):", date);
                console.log("Current IST Hour:", pad2(hour));
                console.log(
                    "Daily Milk Delivery Type:",
                    `${selectedDeliveryType} (${pad2(schedule.startHour)}:00-${pad2(schedule.endHour)}:00, cutoff ${pad2(schedule.cutoffHour)}:00)`
                );

                const orderidnumberres = await API.POST(
                    "ProductOrder/get_orderid_partner_date",
                    { mappedpartnerid, orderdate, deliverytype: selectedDeliveryType }
                );

                const newOrderNumber = orderidnumberres?.Response?.[0]?.newordernumber;
                if (!newOrderNumber) {
                    Toaster.errortop("Unable to generate order number. Please try again.");
                    log("Missing newordernumber from get_orderid_partner_date", "ERROR");
                    return;
                }

                const formattedOrderNumber = String(newOrderNumber).padStart(2, "0");
                ProductOrderid = `369DO-${partnerLetter}-${orderDateKey}-${formattedOrderNumber}`;
            }

            console.log("Final Product Order ID:", ProductOrderid);

            const deliveryfeeValue = deliveryfee === "FREE" ? 0 : 50;
            const data = {
                "productorderid": ProductOrderid,
                "userid": userData?.transid,
                "name": userData?.name,
                "isdailymilkuser": deliveryOption === 2 ? 1 : 0,
                "mappedpartnerid": deliveryOption === 2 ? userData?.mappedpartnerid : null,
                "deliverytype": selectedDeliveryType,
                "orderdate": selectedOrderDate,
                "itemtotal": total,
                "deliverycharge": deliveryfeeValue,
                "tax": (taxpercentage * total) / 100,
                "deliveryaddress": address,
                "deliverycity": city,
                "deliverystate": state || "TAMIL NADU",
                "deliverypincode": postalcode,
                "latitude": latitude.toString(),
                "longitude": longitude.toString(),
                "orderstatus": "Order Placed by " + userData.name,
                "orderplaced": 1,
                "orderplacedby": userData.name,
                "rcu": userData.name,
                "orderdata": JSON.stringify(cart)
            }

            log("Creating Order ...")
            const orderRes = await API.POST("ProductOrder", data);
            const orderMsg = orderRes.message || orderRes.Response;
            log("Product Order Response :", orderMsg);

            if (orderMsg !== "Product order created successfully.") {
                Toaster.infotop(orderMsg);
                log(orderMsg, "ERROR");
                return;
            }

            setLoading(true, "Adding up the Cart Items to an Order...");
            log("Adding up the Cart Items to an Order...");

            for (let index = 0; index < cart.length; index++) {
                const cartitem = cart[index];
                setLoading(true, `Adding ${index + 1}. ${cartitem.productname + "(" + cartitem?.variantname + ")"} of ${cart.length} items to order...`);

                const orderdetailsdata = {
                    productorderdetailsid: uuidv4(),
                    productorderid: ProductOrderid,
                    productid: cartitem?.productid,
                    productname: cartitem?.productname,
                    productcode: cartitem?.productcode,
                    shortdescription: cartitem?.shortdescription,
                    fulldescription: cartitem?.fulldescription,
                    isfeatured: cartitem?.isfeatured,
                    isactive: cartitem?.isactive,
                    typename: cartitem?.typename,
                    typeid: cartitem?.typeid,
                    categoryname: cartitem?.categoryname,
                    categoryid: cartitem?.categoryid,
                    sectionname: cartitem?.sectionname,
                    sectionid: cartitem?.sectionid,
                    menuname: cartitem?.menuname,
                    menuid: cartitem?.menuid,
                    imageurl: cartitem?.imageurl,
                    variantid: cartitem?.variantid,
                    variantname: cartitem?.variantname,
                    price: cartitem?.price,
                    baseprice: cartitem?.baseprice,
                    discount: cartitem?.discount,
                    quantity: cartitem?.quantity,
                    orderquantity: cartitem?.orderquantity,
                    rcu: userData.name
                }

                const res = await API.POST("ProductOrderDetails", orderdetailsdata);
                var msg = res.message || res.Response;
                log("Product Order Details Response :", msg);
            }

            Toaster.successtop("Order Created Successfully");
            dispatch(clearNormalCart());
            navigation.navigate("MyOrdersScreen");
        } catch (error) {
            log(error.message, "ERROR");
            Toaster.errortop("Error creating order");
        } finally {
            setLoading(false);
            setIsPlacingOrder(false); // ✅ IMPORTANT

        }
    };

    // Progress Indicator Component
    const ProgressIndicator = () => (
        <View className="flex-row items-center justify-center mb-6 px-4">
            <View className="flex-1 items-center">
                <View className={`w-8 h-8 rounded-full flex items-center justify-center ${currentSection >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <Text className={`font-bold ${currentSection >= 1 ? 'text-white' : 'text-gray-600'}`}>1</Text>
                </View>
                <Text className="mt-2 text-xs font-medium">Products</Text>
            </View>

            <View className="flex-1 h-1 mx-2">
                <View className={`h-1 ${currentSection >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></View>
            </View>

            <View className="flex-1 items-center">
                <View className={`w-8 h-8 rounded-full flex items-center justify-center ${currentSection >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <Text className={`font-bold ${currentSection >= 2 ? 'text-white' : 'text-gray-600'}`}>2</Text>
                </View>
                <Text className="mt-2 text-xs font-medium">Order Details</Text>
            </View>

            <View className="flex-1 h-1 mx-2">
                <View className={`h-1 ${currentSection >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></View>
            </View>

            <View className="flex-1 items-center">
                <View className={`w-8 h-8 rounded-full flex items-center justify-center ${currentSection >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <Text className={`font-bold ${currentSection >= 3 ? 'text-white' : 'text-gray-600'}`}>3</Text>
                </View>
                <Text className="mt-2 text-xs font-medium">Location</Text>
            </View>
        </View>
    );

    return (
        <>
            {/* Progress Bar */}


            {/* Section 1: Ordered Product Details */}
            {( currentSection === 1) && (
                <ScrollView className="flex-1">
                    <View className="p-3 flex-row items-center">
                        <Ionicons
                            onPress={() => navigation.goBack()}
                            name="arrow-back"
                            size={30}
                            color="black"
                        />
                        <Text className="text-lg font-semibold ml-1">
                            Review Your Order
                        </Text>
                    </View>

                    <View className="mt-4 px-3">
                        <Text className="text-lg font-bold">Ordered Products</Text>
                        <View className="mt-3">
                            <CartScreen
                                cart={cart}
                                favorites={favorites}
                                onToggleFavorite={toggleFavorite}
                            />
                        </View>
                    </View>

                    <View className="h-20"></View>
                </ScrollView>
            )}

            {/* Section 2: Order Details with Delivery Options */}
            {currentSection === 2 && (
                <ScrollView className="flex-1">
                    <View className="p-3 flex-row items-center">
                        <Ionicons
                            onPress={() => setCurrentSection(1)}
                            name="arrow-back"
                            size={30}
                            color="black"
                        />
                        <Text className="text-lg font-semibold ml-1">
                            Order Summary
                        </Text>
                    </View>

                    <View className="mt-5 mx-3">
                        <Text className="text-lg font-bold">Order Summary</Text>
                        <View className="bg-white rounded-lg p-3 mt-4">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-base font-normal">
                                    Item Total
                                </Text>
                                <Text className="text-base font-normal">
                                    ₹{total}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between mt-3">
                                <Text className="text-base font-normal">
                                    Delivery Fee
                                </Text>
                                <Text className="text-base font-bold text-orange-500">
                                    {deliveryfee === "FREE" ? "FREE" : `₹${deliveryfee}`}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between mt-3">
                                <Text className="text-base font-normal">
                                    Taxes & Charges
                                </Text>
                                <Text className="text-base font-bold text-orange-500">
                                    {`${taxpercentage}% - ₹${(total * taxpercentage) / 100}`}
                                </Text>
                            </View>

                            <View className="border-t border-gray-300 h-px mt-3"></View>

                            <View className="flex-row items-center justify-between mt-2">
                                <Text className="text-lg font-bold text-black">
                                    To Pay
                                </Text>
                                <Text className="text-lg font-bold">
                                    ₹{total + (total * taxpercentage) / 100 + (deliveryfee === "FREE" ? 0 : 50)}
                                </Text>
                            </View>

                            {/* Delivery Options Section */}
                            <View className="mt-6">
                                <Text className="text-lg font-bold mb-1">
                                    Select Delivery Option
                                </Text>
                                <Text className="text-xs text-gray-500 mb-3">
                                    Choose how this cart should reach you.
                                </Text>

                                <View className="mb-3">
                                        {deliveryOption === 1 ? (
                                            <>
                                                <TouchableOpacity
                                                    className="rounded-xl p-4 mb-3 border-2 bg-blue-50 border-blue-500"
                                                    activeOpacity={0.88}
                                                    onPress={() => {
                                                        setDeliveryOption(1);
                                                        setdeliveryfee(50);
                                                    }}
                                                >
                                                    <View className="flex-row items-center">
                                                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-blue-600">
                                                            <Ionicons name="flash-outline" size={24} color="#ffffff" />
                                                        </View>

                                                        <View className="flex-1">
                                                            <View className="flex-row items-center justify-between">
                                                                <Text className="text-base font-bold text-gray-900">
                                                                    Fast Delivery
                                                                </Text>
                                                                <Text className="text-sm font-bold text-blue-600">
                                                                    ₹50
                                                                </Text>
                                                            </View>
                                                            <Text className="text-xs text-gray-500 mt-1">
                                                                Send this order separately with faster delivery.
                                                            </Text>
                                                        </View>

                                                        <View className="w-6 h-6 rounded-full ml-3 items-center justify-center border bg-blue-600 border-blue-600">
                                                            <Ionicons name="checkmark" size={15} color="#ffffff" />
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                {isdailymilkuser && (
                                                    <TouchableOpacity
                                                        className="rounded-xl px-4 py-3 border border-green-200 bg-green-50 flex-row items-center justify-between"
                                                        activeOpacity={0.88}
                                                        onPress={() => {
                                                            setDeliveryOption(2);
                                                            setdeliveryfee("FREE");
                                                        }}
                                                    >
                                                        <View className="flex-row items-center flex-1">
                                                            <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-green-100">
                                                                <Ionicons name="leaf-outline" size={20} color="#16a34a" />
                                                            </View>
                                                            <View className="flex-1">
                                                                <Text className="text-sm font-bold text-gray-900">
                                                                    Show Daily Milk Option
                                                                </Text>
                                                                <Text className="text-xs text-green-700 mt-0.5">
                                                                    Combine with daily milk delivery for FREE
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Ionicons name="chevron-forward" size={18} color="#16a34a" />
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    className="rounded-xl p-4 mb-3 border-2 bg-green-50 border-green-500"
                                                    activeOpacity={0.88}
                                                    onPress={() => {
                                                        setDeliveryOption(2);
                                                        setdeliveryfee("FREE");
                                                    }}
                                                >
                                                    <View className="flex-row items-center">
                                                        <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-green-600">
                                                            <Ionicons name="leaf-outline" size={24} color="#ffffff" />
                                                        </View>

                                                        <View className="flex-1">
                                                            <View className="flex-row items-center justify-between">
                                                                <Text className="text-base font-bold text-gray-900">
                                                                    With Daily Milk
                                                                </Text>
                                                                <Text className="text-sm font-bold text-green-600">
                                                                    FREE
                                                                </Text>
                                                            </View>
                                                            <Text className="text-xs text-gray-500 mt-1">
                                                                Combine this order with your daily milk delivery route.
                                                            </Text>
                                                        </View>

                                                        <View className="w-6 h-6 rounded-full ml-3 items-center justify-center border bg-green-600 border-green-600">
                                                            <Ionicons name="checkmark" size={15} color="#ffffff" />
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    className="rounded-xl px-4 py-3 border border-blue-200 bg-blue-50 flex-row items-center justify-between"
                                                    activeOpacity={0.88}
                                                    onPress={() => {
                                                        setDeliveryOption(1);
                                                        setdeliveryfee(50);
                                                    }}
                                                >
                                                    <View className="flex-row items-center flex-1">
                                                        <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-blue-100">
                                                            <Ionicons name="flash-outline" size={20} color="#2563eb" />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-sm font-bold text-gray-900">
                                                                Switch to Fast Delivery
                                                            </Text>
                                                            <Text className="text-xs text-blue-700 mt-0.5">
                                                                Send separately for ₹50
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={18} color="#2563eb" />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="h-20"></View>
                </ScrollView>
            )}

            {/* Section 3: Location Details */}
            {currentSection === 3 && (
                <ScrollView className="flex-1">
                    <View className="p-3 flex-row items-center">
                        <Ionicons
                            onPress={() => setCurrentSection(2)}
                            name="arrow-back"
                            size={30}
                            color="black"
                        />
                        <Text className="text-lg font-semibold ml-1">
                            Delivery Details
                        </Text>
                    </View>

                    <View className="mt-5 mx-3">
                        <Text className="text-lg font-bold">
                            Delivery Information
                        </Text>
                        <View className="bg-white rounded-lg p-3 mt-4">
                            {/* Address */}
                            <View className="mb-4">
                                <Text className="font-semibold text-gray-700">Address</Text>
                                <TextInput
                                    ref={addressRef}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder="Enter your address"
                                    className="border border-gray-300 rounded-lg p-3 mt-2 text-lg"
                                    returnKeyType="next"
                                    onSubmitEditing={() => cityRef.current?.focus()}
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="font-semibold text-gray-700">City</Text>
                                <TextInput
                                    ref={cityRef}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="Enter your city"
                                    className="border border-gray-300 rounded-lg p-3 mt-2 text-lg"
                                    returnKeyType="next"
                                    onSubmitEditing={() => stateRef.current?.focus()}
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="font-semibold text-gray-700">State</Text>
                                <TextInput
                                    ref={stateRef}
                                    value={state}
                                    onChangeText={setState}
                                    placeholder="Enter your state"
                                    className="border border-gray-300 rounded-lg p-3 mt-2 text-lg"
                                    returnKeyType="next"
                                    onSubmitEditing={() => postalCodeRef.current?.focus()}
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="font-semibold text-gray-700">
                                    Postal Code
                                </Text>
                                <TextInput
                                    ref={postalCodeRef}
                                    value={postalcode}
                                    onChangeText={setPostalcode}
                                    placeholder="Enter your postal code"
                                    keyboardType="number-pad"
                                    className="border border-gray-300 rounded-lg p-3 mt-2 text-lg"
                                    returnKeyType="next"
                                />
                            </View>

                            {latitude && longitude ? (
                                <>
                                    <View className="mb-4">
                                        <Text className="font-semibold text-gray-700">
                                            Latitude
                                        </Text>
                                        <TextInput
                                            editable={false}
                                            value={latitude ? latitude.toString() : ""}
                                            onChangeText={setLatitude}
                                            placeholder="Enter your Latitude"
                                            className="border border-gray-300 rounded-lg p-3 mt-2 text-lg"
                                        />
                                    </View>

                                    <View className="mb-4">
                                        <Text className="font-semibold text-gray-700">
                                            Longitude
                                        </Text>
                                        <TextInput
                                            editable={false}
                                            value={longitude ? longitude.toString() : ""}
                                            onChangeText={setLongitude}
                                            placeholder="Enter your Longitude"
                                            className="border border-gray-300 rounded-lg p-3 mt-2 text-lg"
                                        />
                                    </View>
                                </>
                            ) : (
                                <View className="mb-6">
                                    <TouchableOpacity
                                        onPress={ForceGetLocation}
                                        className="bg-orange-400 py-3 rounded-lg"
                                    >
                                        <Text className="text-white text-center text-xl font-semibold">
                                            Fetch Current Location
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    <View className="h-20"></View>
                </ScrollView>
            )}

            {/* Bottom Navigation Buttons */}
            <View className="flex-row items-center justify-between bg-white p-5 border-t border-gray-200">
                {currentSection > 1 && (
                    <TouchableOpacity
                        onPress={handlePrevious}
                        className="border border-gray-300 rounded-lg px-6 py-3"
                    >
                        <Text className="text-gray-600 font-medium">Previous</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={handleNext}
                    disabled={isPlacingOrder}
                    className={`flex-1 ml-4 py-3 rounded-lg ${currentSection === 3 ? 'bg-green-600' : 'bg-blue-600'}`}
                >
                    <Text className="text-white text-center font-medium text-lg">


                        {isPlacingOrder
                            ? "Placing Order..."
                            : currentSection === 3
                                ? "Place Order"
                                : "Next"}
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
};

export default ViewCartScreen;

const styles = StyleSheet.create({});
