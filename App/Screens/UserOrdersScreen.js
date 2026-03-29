import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import Storage from '../../App_Utils/Services/StorageService';
import OrderCard from '../Components_New/OrdersCard';
import Animated, { FadeIn } from 'react-native-reanimated';

const MyOrdersScreen = () => {

    const route = useRoute();

    const allorder = route.params?.allorder ?? false;
    const ordertype = route.params?.ordertype ?? "all";

    const [isallorders, setisallorders] = useState(allorder);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [Title, setTitle] = useState("My Orders");
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const { setLoading: setGlobalLoading } = useLoading();
    const log = createLogger("MyOrdersScreen");
    // log("All Orders:", isallorders);
    const fetchOrders = async () => {
        try {
            const USERDATA = await Storage.getData("DATA");
            const USER = USERDATA.transid
            log("User ID:", USER);



            const endpoint = isallorders
                ? "ProductOrder"
                : `ProductOrder/user_orders_history/${USER}`;

            if (isallorders) {
                setTitle("All Orders");
            }
            const res = await API.GET(endpoint);
            const response = res.Response;

            // log(response, "Fetched Orders:");
            if (response && Array.isArray(response)) {
                var filteredresponse = []
                if (ordertype === "fast") {
                    setTitle("Fast Delivery Orders");
                    filteredresponse = response.filter(order => !order.isdailymilkuser);
                } else if (ordertype === "dailymilk") {
                    setTitle("Daily Milk Orders");
                    filteredresponse = response.filter(order => order.isdailymilkuser);
                } else {
                    filteredresponse = response;
                }
                setOrders(filteredresponse);
            } else {
                setOrders([]);
            }
        } catch (error) {
            log("Error fetching orders:", error);
            Alert.alert("Error", "Failed to load orders");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };



    const [refreshCounter, setRefreshCounter] = useState(0);

    const handleOrderUpdate = () => {
        setRefreshCounter(prev => prev + 1);
        fetchOrders();
    };

    const handleStartShopping = () => {
        try {
            navigation.navigate("Main", { screen: "Home" });
        } catch (error) {
            console.error("Start shopping navigation error:", error);
            try {
                navigation.navigate("Main");
            } catch (fallbackError) {
                console.error("Start shopping fallback navigation error:", fallbackError);
                Alert.alert("Navigation Error", "Unable to open Home right now.");
            }
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-600 mt-4">Loading your orders...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white p-4 shadow-sm border-b border-gray-200">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">{Title}</Text>
                    {/* <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                        <Icon name="refresh" size={24} color={refreshing ? "#9CA3AF" : "#3B82F6"} />
                    </TouchableOpacity> */}
                    <View>
                        
                    </View>
                </View>
            </View>



            {/* <ScrollView
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#3B82F6']}
                    />
                }
            >
                {orders.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <Icon name="package-variant-closed" size={64} color="#9CA3AF" />
                        <Text className="text-gray-500 text-lg font-medium mt-4">No orders yet</Text>
                        <Text className="text-gray-400 text-center mt-2">
                            Your orders will appear here once you place them
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Home')}
                            className="bg-blue-600 px-6 py-3 rounded-full mt-6"
                        >
                            <Text className="text-white font-semibold">Start Shopping</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    orders.map((order) => (
                        <OrderCard
                            key={order.productorderid}
                            order={order}
                            onOrderUpdate={handleOrderUpdate}
                        />
                    ))
                )}
            </ScrollView> */}

            <ScrollView
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#3B82F6']}
                    />
                }
            >
                {orders.length === 0 ? (
                    <>
                        {ordertype === "fast" ? (
                            <View className="flex-1 justify-center items-center bg-white p-6">
                                <Animated.View
                                    entering={FadeIn.duration(600)}
                                    className="flex items-center justify-center"
                                >
                                    <Text className="text-xl font-bold text-gray-700 mb-4">
                                        No Fast Delivery Orders
                                    </Text>
                                    <Text className="text-center text-gray-500">
                                        It looks like you don’t have any orders at the moment.
                                        {'\n'}Please check back later or create a new order.
                                    </Text>
                                </Animated.View>
                            </View>
                        ) : ordertype === "dailymilk" ? (
                            <View className="flex-1 justify-center items-center bg-white p-6">
                                <Animated.View
                                    entering={FadeIn.duration(600)}
                                    className="flex items-center justify-center"
                                >
                                    <Text className="text-xl font-bold text-gray-700 mb-4">
                                        No Daily Milk Delivery Orders
                                    </Text>
                                    <Text className="text-center text-gray-500">
                                        It looks like you don’t have any orders at the moment.
                                        {'\n'}Please check back later or create a new order.
                                    </Text>
                                </Animated.View>
                            </View>
                        ) : (
                            <View className="flex-1 justify-center items-center py-20">
                                <Icon name="package-variant-closed" size={64} color="#9CA3AF" />
                                <Text className="text-gray-500 text-lg font-medium mt-4">No orders yet</Text>
                                <Text className="text-gray-400 text-center mt-2">
                                    Your orders will appear here once you place them
                                </Text>
                                <TouchableOpacity
                                    onPress={handleStartShopping}
                                    className="bg-blue-600 px-6 py-3 rounded-full mt-6"
                                >
                                    <Text className="text-white font-semibold">Start Shopping</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    orders.map((order) => (
                        <OrderCard
                            key={order.productorderid}
                            order={order}
                            onOrderUpdate={handleOrderUpdate}
                        />
                    ))
                )}
            </ScrollView>


        </View>
    );
};



export default MyOrdersScreen;
