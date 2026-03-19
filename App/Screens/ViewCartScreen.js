import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    incrementQuantity,
    decrementQuantity,
    clearCart,
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
    const [deliveryfee, setdeliveryfee] = useState(0);
    const [taxpercentage, settaxpercentage] = useState(3);
    const [currentSection, setCurrentSection] = useState(1); // 1: Products, 2: Order Details, 3: Location
    const [deliveryOption, setDeliveryOption] = useState(1); // 1 for Fast Delivery, 2 for With Daily Milk
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const cart = useSelector((state) => state.cart.cart);
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



        if (!userData.transid) return;


        setLoading(true, "Checking User Registration Status and Fetching Location…");

        try {


            console.log("User TransID:", userData.transid);
            const res = await API.GET("DailyMilkRegistration/CheckUserForRegistration/" + userData.transid);
            console.log("API Response for CheckAlreadyRegistered:", res);
            console.log("CheckAlreadyRegistered Response:", res);
            if (res.Response.length === 0) {
                setisdailymilkuser(false)
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



    const ProceeedToPay = async () => {
        if (isPlacingOrder) {
            console.log("Already placing order, ignoring duplicate click");
            return;
        }

        setIsPlacingOrder(true);
        log("Proceeding to Payment");


        // Validate all fields before proceeding
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




        // const ProductOrderid = uuidv4();

        let ProductOrderid = uuidv4();


        // if (deliveryOption === 2) {
        //     const date = NowInIST()
        //     console.log("Current Date (IST):", date);

        //     date.setDate(date.getDate() + 1);
        //     const mappedpartnerid = userData?.mappedpartnerid;
        //     const orderdate = date.toISOString().split('T')[0];
        //     const orderidnumberres = await API.POST("ProductOrder/get_orderid_partner_date", { mappedpartnerid, orderdate })
        //     const newOrderNumber = orderidnumberres.Response[0].newordernumber;

        //     const partnerLetter = mappedpartnerid.split("-")[1];
        //     const formattedOrderNumber = String(newOrderNumber).padStart(2, "0");


        //     const orderdatestringfororderid = date.toISOString().split('T')[0].replace(/-/g, "");
        //     console.log("Order Date String for Order ID:", orderdatestringfororderid);
        //     const orderId = `369DO-${partnerLetter}-${orderdatestringfororderid}-${formattedOrderNumber}`;
        //     ProductOrderid = orderId
        // } else {
        //     ProductOrderid = uuidv4();
        // }

        // console.log("Generated Product Order ID:", ProductOrderid);


        console.log("Delivery Option Selected:", deliveryOption === 1 ? "Fast Delivery" : "With Daily Milk");
        if (deliveryOption === 2) {
            console.log("Daily Milk User - Generating Order ID with Partner Letter...");
            // Get IST time correctly
            const now = new Date();

            // Convert current UTC time → IST
            const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // IST is UTC+5:30



            // If AFTER 3PM IST → use tomorrow
            // If BEFORE 3PM IST → use today
            const date = new Date(istTime);

            console.log("Current Date (IST):", date);
            const hourString = date.toISOString().slice(11, 13);
            const hour = parseInt(hourString);

            console.log("Current IST Hour:", hourString);
            if (hour >= 16) {
                console.log("It's after 3PM IST, using tomorrow's date for order ID");
                date.setDate(date.getDate() + 1);
            }



            const mappedpartnerid = userData?.mappedpartnerid;
            const orderdate = date.toISOString().split("T")[0];

            const orderidnumberres = await API.POST(
                "ProductOrder/get_orderid_partner_date",
                { mappedpartnerid, orderdate }
            );

            const newOrderNumber = orderidnumberres.Response[0].newordernumber;
            const partnerLetter = mappedpartnerid.split("-")[1];
            const formattedOrderNumber = String(newOrderNumber).padStart(2, "0");

            const orderdatestringfororderid = orderdate.replace(/-/g, "");
            const orderId = `369DO-${partnerLetter}-${orderdatestringfororderid}-${formattedOrderNumber}`;

            ProductOrderid = orderId;
        } else {
            ProductOrderid = uuidv4();
        }

        console.log("Final Product Order ID:", ProductOrderid);

        try {
            setLoading(true, "Adding up the Cart Items to an Order...");
            log("Adding up the Cart Items to an Order...");

            // Create all order details
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

            const deliveryfeeValue = deliveryfee === "FREE" ? 0 : 50;
            const data = {
                "productorderid": ProductOrderid,
                "userid": userData?.transid,
                "name": userData?.name,
                "isdailymilkuser": deliveryOption === 2 ? 1 : 0,
                "mappedpartnerid": userData?.mappedpartnerid,
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
            const res = await API.POST("ProductOrder", data);
            var msg = res.message || res.Response;
            log("Product Order Response :", msg);

            if (msg === "Product order created successfully.") {
                Toaster.successtop("Order Created Successfully");
                dispatch(clearCart());
                navigation.navigate("MyOrdersScreen");
            } else {
                Toaster.infotop(msg);
                log(msg, "ERROR");
                return;
            }
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
            {currentSection === 1 && (
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
                                <Text className="text-lg font-bold mb-3">
                                    Select Delivery Option
                                </Text>

                                {isdailymilkuser && (
                                    <View className="flex-row justify-center mb-3">
                                        <View className="flex-row bg-gray-100 rounded-lg p-1">
                                            <TouchableOpacity
                                                className={`px-6 py-2 rounded-lg mx-1 bg-white shadow-sm ${deliveryOption === 1 ? 'shadow-md' : ''}`}
                                                onPress={() => {

                                                    setDeliveryOption(1);
                                                    setdeliveryfee(50);
                                                }}
                                            >
                                                <Text className={`font-medium ${deliveryOption === 1 ? "text-blue-600" : "text-gray-600"}`}>
                                                    Fast Delivery
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                className={`px-6 py-2 rounded-lg mx-1 bg-white shadow-sm ${deliveryOption === 2 ? 'shadow-md' : ''}`}
                                                onPress={() => {

                                                    setDeliveryOption(2);
                                                    setdeliveryfee("FREE");
                                                }}
                                            >
                                                <Text className={`font-medium ${deliveryOption === 2 ? "text-green-600" : "text-gray-600"}`}>
                                                    With Daily Milk
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Status Message */}
                                <View className="text-center mt-3">
                                    <Text className={`text-center font-semibold ${deliveryOption === 2 ? "text-green-600" : "text-blue-600"}`}>
                                        {deliveryOption === 2
                                            ? "✓ You'll Receive Your Products With the Daily Milk Soon"
                                            : "✓ Your Order Will be Delivered Soon"
                                        }
                                    </Text>
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