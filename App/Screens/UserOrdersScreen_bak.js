import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import Storage from '../../App_Utils/Services/StorageService';

const MyOrdersScreen = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const { setLoading: setGlobalLoading } = useLoading();
    const log = createLogger("MyOrdersScreen");

    const fetchOrders = async () => {
        try {
            const USERDATA = await Storage.getData("DATA");
            const USER = USERDATA.transid
            log("User ID:", USER);
            const res = await API.GET(`ProductOrder/user/${USER}`);
            const response = res.Response

            log(response, "Fetched Orders:");
            if (response && Array.isArray(response)) {
                setOrders(response);
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

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'packed':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'out for delivery':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'check-circle';
            case 'cancelled':
                return 'close-circle';
            case 'confirmed':
                return 'check-circle-outline';
            case 'packed':
                return 'package-variant';
            case 'out for delivery':
                return 'truck-delivery';
            default:
                return 'clock-outline';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getImageUri = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("file://")) return imagePath;
        if (imagePath.startsWith("http")) return imagePath;
        return "https://dev.dine360.ca/backend/" + imagePath.replace(/^\/+/, "").replace("~/", "");
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
                    <Text className="text-xl font-bold text-gray-900">My Orders</Text>
                    <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                        <Icon name="refresh" size={24} color={refreshing ? "#9CA3AF" : "#3B82F6"} />
                    </TouchableOpacity>
                </View>
            </View>

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
                        <OrderCard key={order.productorderid} order={order} />
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const OrderCard = ({ order }) => {
    const navigation = useNavigation();
    const [expanded, setExpanded] = useState(false);

    const getImageUri = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("file://")) return imagePath;
        if (imagePath.startsWith("http")) return imagePath;
        return "https://dev.dine360.ca/backend/" + imagePath.replace(/^\/+/, "").replace("~/", "");
    };

    const parseOrderData = () => {
        try {
            if (typeof order.orderdata === 'string') {
                return JSON.parse(order.orderdata);
            }
            return order.orderdata || [];
        } catch (error) {
            return [];
        }
    };

    const orderItems = parseOrderData();
    const totalItems = orderItems.length;

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'packed':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'out for delivery':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'check-circle';
            case 'cancelled':
                return 'close-circle';
            case 'confirmed':
                return 'check-circle-outline';
            case 'packed':
                return 'package-variant';
            case 'out for delivery':
                return 'truck-delivery';
            default:
                return 'clock-outline';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
            {/* Order Header */}
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                className="p-4 border-b border-gray-100"
            >
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                        <Text className="text-sm text-gray-500">Order ID</Text>
                        <Text className="text-base font-semibold text-gray-900">
                            #{order.productorderid?.slice(-8).toUpperCase()}
                        </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full border ${getStatusColor(order.orderstatus)}`}>
                        <Text className="text-xs font-medium capitalize">
                            {order.orderstatus}
                        </Text>
                    </View>
                </View>

                <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-gray-600">
                        {formatDate(order.ordertime)}
                    </Text>
                    <Text className="text-lg font-bold text-gray-900">
                        ₹{order.itemtotal}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Order Preview Images */}
            <View className="p-4 border-b border-gray-100">
                <View className="flex-row items-center mb-2">
                    <Icon name="package-variant" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-2">
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                    </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {orderItems.slice(0, 5).map((item, index) => (
                        <View key={index} className="relative mr-2">
                            <Image
                                source={{
                                    uri:
                                        getImageUri(item.imageurl) ||
                                        getImageUri(item.product?.imageurl),
                                }}
                                style={{ width: 64, height: 64, borderRadius: 8 }} // 16px -> 64dp
                                contentFit="cover"
                                transition={300}
                                cachePolicy="memory-disk"
                            />
                            {index === 4 && totalItems > 5 && (
                                <View className="absolute inset-0 bg-black/50 rounded-lg justify-center items-center">
                                    <Text className="text-white text-xs font-bold">+{totalItems - 5}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Expanded Details */}
            {expanded && (
                <View className="p-4 bg-gray-50">
                    {/* Delivery Address */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-2">Delivery Address</Text>
                        <View className="bg-white p-3 rounded-lg border border-gray-200">
                            <Text className="text-sm text-gray-700">{order.deliveryaddress}</Text>
                            <Text className="text-sm text-gray-700">
                                {order.deliverycity}, {order.deliverystate} - {order.deliverypincode}
                            </Text>
                        </View>
                    </View>

                    {/* Order Items */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-2">Order Items</Text>
                        {orderItems.map((item, index) => (
                            <View key={index} className="flex-row items-center bg-white p-3 rounded-lg border border-gray-200 mb-2">
                                <Image
                                    source={{
                                        uri:
                                            getImageUri(item.imageurl) ||
                                            getImageUri(item.product?.imageurl),
                                    }}
                                    style={{ width: 48, height: 48, borderRadius: 6, marginRight: 12 }} // w-12 h-12 rounded-md mr-3
                                    contentFit="cover"
                                    transition={300}
                                    cachePolicy="memory-disk"
                                />
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                                        {item.productname}
                                    </Text>
                                    {item.variantname && (
                                        <Text className="text-xs text-gray-500">Variant: {item.variantname}</Text>
                                    )}
                                    <Text className="text-xs text-gray-500">Qty: {item.orderquantity}</Text>
                                </View>
                                <Text className="text-sm font-semibold text-gray-900">₹{item.price}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Price Breakdown */}
                    <View className="bg-white p-3 rounded-lg border border-gray-200">
                        <Text className="text-sm font-semibold text-gray-800 mb-2">Price Details</Text>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm text-gray-600">Item Total</Text>
                            <Text className="text-sm text-gray-600">₹{order.itemtotal}</Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm text-gray-600">Delivery Charge</Text>
                            <Text className="text-sm text-gray-600">₹{order.deliverycharge}</Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm text-gray-600">Tax</Text>
                            <Text className="text-sm text-gray-600">₹{order.tax}</Text>
                        </View>
                        <View className="border-t border-gray-200 pt-2 mt-2">
                            <View className="flex-row justify-between">
                                <Text className="text-base font-semibold text-gray-900">Total Amount</Text>
                                <Text className="text-base font-semibold text-gray-900">
                                    ₹{order.itemtotal + order.deliverycharge + order.tax}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Order Timeline */}
                    <View className="mt-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-3">Order Timeline</Text>
                        <View className="space-y-3">
                            {order.orderplaced && (
                                <View className="flex-row items-center">
                                    <Icon name="check-circle" size={16} color="#10B981" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Order Placed - {formatDate(order.orderpalcedtime)}
                                    </Text>
                                </View>
                            )}

                            {order.orderconfirmed && (
                                <View className="flex-row items-center">
                                    <Icon name="check-circle" size={16} color="#10B981" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Confirmed - {formatDate(order.orderconfirmedtime)}
                                    </Text>
                                </View>
                            )}

                            {order.orderpacked && (
                                <View className="flex-row items-center">
                                    <Icon name="check-circle" size={16} color="#10B981" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Packed - {formatDate(order.orderpackedtime)}
                                    </Text>
                                </View>
                            )}

                            {order.orderoutofdelivery && (
                                <View className="flex-row items-center">
                                    <Icon name="truck" size={16} color="#3B82F6" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Out for Delivery - {formatDate(order.orderoutofdeliverytime)}
                                    </Text>
                                </View>
                            )}

                            {order.orderdelivered && (
                                <View className="flex-row items-center">
                                    <Icon name="check-circle" size={16} color="#10B981" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Delivered - {formatDate(order.orderdeliveredtime)}
                                    </Text>
                                </View>
                            )}

                            {order.ordercancelled && (
                                <View className="flex-row items-center">
                                    <Icon name="close-circle" size={16} color="#EF4444" />
                                    <Text className="text-sm text-gray-700 ml-2">
                                        Cancelled - {formatDate(order.ordercancelledtime)}
                                    </Text>
                                    {order.ordercancelledreason && (
                                        <Text className="text-sm text-gray-500 ml-2">
                                            ({order.ordercancelledreason})
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Footer Actions */}
            <View className="p-4 bg-gray-50 border-t border-gray-100">
                <TouchableOpacity
                    onPress={() => setExpanded(!expanded)}
                    className="flex-row items-center justify-center"
                >
                    <Text className="text-blue-600 font-medium mr-2">
                        {expanded ? 'Show Less' : 'View Details'}
                    </Text>
                    <Icon
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#3B82F6"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default MyOrdersScreen;