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
            <View style={{
                backgroundColor: 'white',
                padding: 15,
                borderRadius: 8,
                marginVertical: 5,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {/* Product Info */}
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.productname}</Text>
                    <Text style={{ fontSize: 14, color: 'gray' }}>{item.variantname}</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>
                        ₹{item.price} x {item.orderquantity}
                    </Text>
                </View>

                {/* Favorite and Delete Buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Favorite Heart Icon */}
                    <TouchableOpacity
                        onPress={toggleFavorite}
                        style={{
                            padding: 10,
                            marginRight: 8,
                            backgroundColor: '#f8f9fa',
                            borderRadius: 20
                        }}
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
                        style={{
                            padding: 10,
                            backgroundColor: '#fee2e2',
                            borderRadius: 20
                        }}
                    >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };


    const [isdailymilkuser, setisdailymilkuser] = useState(true);
    const [deliveryfee, setdeliveryfee] = useState(0);
    const [taxpercentage, settaxpercentage] = useState(3);

    const cart = useSelector((state) => state.cart.cart);

    const total = cart
        .map((item) => item.price * item.orderquantity)
        .reduce((cur, prev) => cur + prev, 0);


    const CheckAlreadyRegistered = async () => {
        console.log("Checking user registration status for USER:", userData.transid);
        if (!userData.transid) return;

        setLoading(true, "Checking User Registration Status and Fetching Location…");

        try {

            const res = await API.GET("DailyMilkRegistration/CheckUserForRegistration/" + userData.transid);
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
        const checkUser = async () => {
            await CheckAlreadyRegistered();
        };
        checkUser();
    }, [userData, isdailymilkuser]);





    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("TAMILNADU");
    ;
    const [postalcode, setPostalcode] = useState("");
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const { setLoading } = useLoading();
    const addressRef = useRef(null);
    const cityRef = useRef(null);
    const stateRef = useRef(null);
    const postalCodeRef = useRef(null);
    const [deliveryOption, setDeliveryOption] = useState(1); // 1 for Fast Delivery, 2 for With Daily Milk

    {
        /* USER SESSION */
    }

    const [userData, setUserData] = useState(null);
    const [USERTYPE, SETUSERTYPE] = useState();



    const getUserData = async () => {
        try {
            var userData = await Storage.getData("DATA");
            setUserData(userData);
            setAddress(userData?.deliveryaddress)
            setCity(userData?.deliverycity)
            setState(userData?.deliverystate || "TAMIL NADU")
            setPostalcode(userData?.deliverypincode)
            setLatitude(userData?.latitude);
            setLongitude(userData?.longitude);
            // log(userData, "User Data in View Cart");
        } catch (error) {
            log("Error getting user data:", error);
        }
    };

    useEffect(() => {
        getUserData();
    }, []);

    // const GETSESSIONDATA = async () => {
    //     var result = await Storage.getData("userdata");

    //     setUserData(result);
    //     SETUSERTYPE(result?.accounttype);
    //     setAddress(result?.address);
    //     setCity(result?.city);
    //     setState(result?.state);
    //     setCountry(result?.country);
    //     setPostalcode(result?.postalcode);
    //     setLatitude(result?.latitude);
    //     setLongitude(result?.longtitude);
    // };

    useEffect(() => {
        // GETSESSIONDATA();
        getLocation();
    }, []);

    {
        /* USER SESSION */
    }

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

    const ProceeedToPay = async () => {

        log("Proceeding to Payment");
        if (!address) {
            log("Address is missing");
            Toaster.errortop("Address is missing");
            return;
        }
        if (!city) {
            log("City is missing");
            Toaster.errortop("City is missing");
            return;
        }

        if (!state) {
            log("State is missing");
            Toaster.errortop("State is missing");
            return;
        }

        if (!postalcode) {
            log("Postal Code is missing");
            Toaster.errortop("Postal Code is missing");
            return;
        }

        if (!latitude) {
            log("Latitude is missing");
            Toaster.errortop("Latitude is missing. Please turn on the Location.");
            return;
        }

        if (!longitude) {
            log("Longitude is missing");
            Toaster.errortop("Longitude is missing. Please turn on the Location.");
            return;
        }
        log("All RRequirements Met");
        const ProductOrderid = uuidv4();

        try {
            setLoading(true, "Adding up the Cart Items to an Order...");
            log("Adding up the Cart Items to an Order...");
            cart.map(async (cartitem, index) => {
                //    log(cartitem, "Cart Item to be added to Order");
                setLoading(true, `Adding ${index + 1}. ${cartitem.productname + "(" + cartitem?.variantname + ")"} of ${cart.length} items to order...`);
                log(`Adding ${index + 1}. ${cartitem.productname + "(" + cartitem?.variantname + ")"} of ${cart.length} items to order...`);
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
                //  log(res, "Product Order Details Response");
                var msg = res.message || res.Response;
                log("Product Order Details Response :", msg)
                if (msg === "Product order created successfully.") {
                    Toaster.successtop("Order Created Successfully.");

                } else {
                    Toaster.infotop(msg)
                }

            });

const deliveryfeeValue = deliveryfee === "FREE" ? 0 : 50;
            const data = {
                "productorderid": ProductOrderid,
                "userid": userData?.transid,
                "name": userData?.name,
                // "isdailymilkuser": userData?.mappedpartnerid ? 1 : 0,
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
            log("Product Order Response :", msg)
            if (msg === "Product order created successfully.") {
                Toaster.successtop("Order Created Successfully for ");
                log("Order Created Successfully ",);
                dispatch(clearCart())
                navigation.navigate("MyOrdersScreen");
            } else {
                Toaster.infotop(msg)
                log(msg, "ERROR");
                return
            }

        } catch (error) {
            log(error.message, "ERROR");
        } finally {
            setLoading(false);
        }


        // try {
        //     setLoading(true, "Creating an Order...");
        //     const ProductOrderid = uuidv4();

        //     const data = {
        //         "productorderid": ProductOrderid,
        //         "userid": userData?.transid,
        //         "name": userData?.name,
        //         "isdailymilkuser": userData?.mappedpartnerid ? 1 : 0,
        //         "mappedpartnerid": userData?.mappedpartnerid,
        //         "itemtotal": total,
        //         "deliverycharge": "",
        //         "tax": "",
        //         "deliveryaddress": address,
        //         "deliverycity": city,
        //         "deliverystate": state || "TAMIL NADU",
        //         "deliverypincode": postalcode,
        //         "latitude": latitude.toString(),
        //         "longitude": longitude.toString(),

        //         "orderstatus": "Order Placed by " + userData.name,
        //         "orderplaced": 1,
        //         "orderplacedby": userData.name,

        //         "rcu": userData.name,

        //         "orderdata": JSON.stringify(cart)
        //     }

        //     //  log(data, "Product Order Payload");
        //     const res = await API.POST("ProductOrder", data);
        //     // log(res, "Product Order Response");
        //     var msg = res.message || res.Response;
        //     log("mdg", msg)
        //     if (msg === "Order detail created successfully.") {
        //         log("Order Created...")
        //         Toaster.successtop("Order Created Successfully.");
        //         dispatch(clearCart())
        //     } else {
        //         Toaster.infotop(msg)
        //     }

        // } catch (error) {
        //     log(error.message, "ERROR");
        // } finally {
        //     setLoading(false);
        // }
    };


    return (
        <>
            <ScrollView style={{ marginTop: 20 }}>
                {total > 0 ? (
                    <>
                        <View
                            style={{
                                padding: 10,
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >
                            <Ionicons
                                onPress={() => navigation.goBack()}
                                name="arrow-back"
                                size={30}
                                color="black"
                            />
                            <Text style={{ fontSize: 17, fontWeight: 600, marginLeft: 3 }}>
                                Order Details
                            </Text>
                        </View>


                        <View className="mt-5" style={{}}>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "bold",
                                    marginHorizontal: 10,
                                }}
                            >
                                Ordered Product Details
                            </Text>
                            <View
                                style={{
                                    marginTop: 16,
                                    backgroundColor: "white",
                                    marginHorizontal: 10,
                                    padding: 1,
                                    borderRadius: 12,
                                }}
                            >

                            </View>

                        </View>



                        <CartScreen
                            cart={cart}
                            favorites={favorites}
                            onToggleFavorite={toggleFavorite}
                        />


                        <View className="mt-5" style={{ marginHorizontal: 10 }}>
                            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                                Order Details
                            </Text>
                            <View
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: 7,
                                    padding: 10,
                                    marginTop: 15,
                                }}
                            >
                                <View
                                    style={{
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexDirection: "row",
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: 400 }}>
                                        Item Total
                                    </Text>
                                    <Text style={{ fontSize: 16, fontWeight: 400 }}>
                                        ₹{total}
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexDirection: "row",
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: 400 }}>
                                        Delivery Fee
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "bold",
                                            color: "#FF4500",
                                        }}
                                    >
                                        {deliveryfee}
                                    </Text>
                                </View>



                                <Text
                                    style={{
                                        borderColor: "gray",
                                        borderWidth: 0.5,
                                        height: 1,
                                        marginTop: 10,
                                    }}
                                ></Text>

                                <View
                                    style={{
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexDirection: "row",
                                        marginTop: 10,
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: 400 }}>
                                        Delivey Tip
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 500,
                                            color: "#FF4500",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        ADD TIP
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexDirection: "row",
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: 400 }}>
                                        Taxex & Charges
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "bold",
                                            color: "#FF4500",
                                        }}
                                    >
                                        {`${taxpercentage}% - ₹${(total * taxpercentage)/100}`}
                                    </Text>
                                </View>

                                <Text
                                    style={{
                                        borderColor: "gray",
                                        borderWidth: 0.5,
                                        height: 1,
                                        marginTop: 10,
                                    }}
                                ></Text>

                                <View
                                    style={{
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexDirection: "row",
                                        marginTop: 8,
                                    }}
                                >
                                    <Text
                                        style={{ fontSize: 18, fontWeight: "bold", color: "black" }}
                                    >
                                        To Pay
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                                        ₹{total + (total * taxpercentage)/100 + (deliveryfee === "FREE" ? 0 : 50)}
                                    </Text>
                                </View>
                                {/* <View
                                    className="text-center mt-3"
                                >
                                    <Text
                                        className={`text-center underline ${isdailymilkuser ? "text-green-600" : "text-blue-600"} font-semibold`}
                                    >
                                        {isdailymilkuser ? "You'll Receive Your Products With the Daily Milk Soon" : "Your Order Will be Delivered Soon"}
                                    </Text>

                                </View> */}

                                <View className="mt-3">
                                    {/* Delivery Options */}

                                    {isdailymilkuser && (
                                        <View className="flex-row justify-center mb-3">
                                            <View className="flex-row bg-gray-100 rounded-lg p-1">
                                                <TouchableOpacity
                                                    className={`px-6 py-2 rounded-lg mx-1 bg-white shadow-sm `}

                                                    onPress={() => {
                                                        console.log("Fast Delivery selected");
                                                        setDeliveryOption(1);
                                                        setdeliveryfee(50);
                                                    }}
                                                >
                                                    <Text className={`font-medium ${deliveryOption === 1 ? "text-blue-600" : "text-gray-600"
                                                        }`}>
                                                        Fast Delivery
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    className={`px-6 py-2 rounded-lg mx-1 bg-white shadow-sm `}


                                                    onPress={() => {
                                                        console.log("Standard Delivery selected");
                                                        setDeliveryOption(2);
                                                        setdeliveryfee("FREE");
                                                    }}
                                                >
                                                    <Text className={`font-medium ${deliveryOption === 2 ? "text-green-600" : "text-gray-600"
                                                        }`}>
                                                        With Daily Milk
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>)}

                                    {/* Status Message */}
                                    <View className="text-center">
                                        <Text className={`text-center underline ${deliveryOption === 2 ? "text-green-600" : "text-blue-600"
                                            } font-semibold`}>
                                            {deliveryOption === 2
                                                ? "You'll Receive Your Products With the Daily Milk Soon"
                                                : "Your Order Will be Delivered Soon"
                                            }
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>



                        <View className="mt-5" style={{ marginHorizontal: 10 }}>
                            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                                Delivery Details
                            </Text>
                            <View
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: 7,
                                    padding: 10,
                                    marginTop: 15,
                                }}
                            >
                                <Text className="text-xl underline text-center font-bold  text-red-500 mb-6 mt-5">
                                    Location Details
                                </Text>

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
                                    // onSubmitEditing={() => usernameRef.current?.focus()}
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
                                ) : null}
                                {latitude && longitude ? null : (
                                    <View className="mb-6">
                                        <TouchableOpacity
                                            onPress={ForceGetLocation}
                                            //className="flex-row items-center justify-center space-x-2"
                                            className="bg-orange-400 py-3 rounded-lg "
                                        >
                                            <Text className="text-white text-center text-xl font-semibold">
                                                Fetch Current Location
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </>
                ) : (
                    <View
                        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                    >
                        <Text
                            style={{ textAlign: "center", fontSize: 16, fontWeight: 600 }}
                        >
                            Your Cart is Empty!
                        </Text>
                    </View>
                )}

                <View className="h-11"></View>
            </ScrollView>

            {total === 0 ? null : (
                <View>
                    <Pressable
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: "white",
                            marginBottom: 0,
                            padding: 20,
                        }}
                    >
                        <View style={{}}>
                            <Text style={{ fontSize: 15, fontWeight: 600 }}>₹{total}</Text>
                            <Text style={{ fontSize: 14, color: "#00A877" }}>
                                View Detailed Bill
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => {
                                ProceeedToPay();
                            }}
                            style={{
                                backgroundColor: "#00A877",
                                borderRadius: 6,
                                padding: 14,
                                width: 160,
                            }}
                        >
                            <Text
                                style={{
                                    textAlign: "center",
                                    color: "white",
                                    fontWeight: 400,
                                    fontSize: 16,
                                }}
                            >
                                Proceed To Pay
                            </Text>
                        </Pressable>
                    </Pressable>
                </View>
            )}
        </>
    );
};

export default ViewCartScreen;

const styles = StyleSheet.create({});
