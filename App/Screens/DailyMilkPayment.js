import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { createLogger } from '../../App_Utils/Utils/logger';
import { Ionicons } from '@expo/vector-icons';

const DailyMilkPayment = () => {
    const navigation = useNavigation();
    const { setLoading } = useLoading();
    const log = createLogger("DailyMilkPayment");

    const [userData, setUserData] = useState(null);
    const [paymentData, setPaymentData] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [expandedPaymentKey, setExpandedPaymentKey] = useState(null);

    const toAmount = (value) => {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount : 0;
    };

    const isPaidStatus = (value) => {
        const normalized = String(value ?? "").trim().toLowerCase();
        return normalized === "1" || normalized === "paid" || normalized === "completed";
    };

    const getPaymentState = (item) => {
        const bookedAmount = toAmount(item?.totalamount);
        const receivedAmount = item?.received_fullamount !== undefined && item?.received_fullamount !== null && item?.received_fullamount !== ""
            ? toAmount(item.received_fullamount)
            : toAmount(item?.received_baseamount) + toAmount(item?.received_extraamount);
        const paidAmount = toAmount(item?.paidamount);
        const payableAmount = receivedAmount;
        const balanceAmount = Math.max(payableAmount - paidAmount, 0);
        const hasDue = balanceAmount > 0.009;
        const hasReceivedMilk = payableAmount > 0.009;
        const paymentStatusPaid = isPaidStatus(item?.payment_status1 ?? item?.payment_status ?? item?.paid);
        const isPaid = hasReceivedMilk && (paymentStatusPaid || paidAmount >= payableAmount - 0.009);

        return {
            bookedAmount,
            payableAmount,
            balanceAmount,
            receivedAmount,
            paidAmount,
            hasDue,
            hasReceivedMilk,
            isPaid,
        };
    };

    const formatAmount = (value) => toAmount(value).toFixed(2);
    const formatQty = (value) => toAmount(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    const getPaymentKey = (item, index) =>
        String(
            item?.dailymilkstatusid ||
            item?.bookingid ||
            item?.transid ||
            `${item?.productname || "milk"}-${item?.bookingstartdate || ""}-${index}`
        );
    const firstNumber = (...values) => {
        for (const value of values) {
            if (value === null || value === undefined || value === "") continue;
            const number = Number(value);
            if (Number.isFinite(number)) return number;
        }
        return 0;
    };
    const getPaymentSortTime = (item) => {
        const candidates = [
            item?.bookingstartdate,
            item?.bookingenddate,
            item?.payment_time,
            item?.receivedtime,
            item?.rcm,
            item?.lum,
        ];

        for (const value of candidates) {
            if (!value) continue;
            const time = new Date(value).getTime();
            if (Number.isFinite(time)) return time;
        }

        return 0;
    };

    const sortedPaymentData = useMemo(
        () => [...paymentData].sort((a, b) => getPaymentSortTime(b) - getPaymentSortTime(a)),
        [paymentData]
    );

    // Get user data
    const getUserData = async () => {
        try {
            const userData = await Storage.getData("DATA");
            setUserData(userData);
            fetchPaymentData(userData?.transid);
            console.log("User Data:", userData);
        } catch (error) {
            log("Error getting user data:", error);
        }
    };

    // Fetch payment data for the user
    const fetchPaymentData = async (userId) => {
        try {
            setLoading(true, "Fetching your payment details...");
            const response = await API.GET(`DailyMilkBooking/GetUserPaymentDetails/${userId}`);
            console.log(`DailyMilkBooking/GetUserPaymentDetails/${userId}`)
            log("Payment data response:", response);

            if (response.Response && Array.isArray(response.Response)) {
                setPaymentData(response.Response);
            } else {
                setPaymentData([]);
            }
        } catch (error) {
            log("Error fetching payment data:", error);
            Alert.alert("Error", "Failed to fetch payment details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUserData();
    }, []);

    const handlePay = (item) => {
        const { balanceAmount } = getPaymentState(item);

        setSelectedPayment(item);
        setPaymentAmount(balanceAmount.toFixed(2));
        setPaymentModalVisible(true);
    };

    const handlePaymentMethodSelect = (method) => {
        setPaymentMethod(method);
        setConfirmationModalVisible(true);
    };

    const processPayment = async () => {

        console.log("Processing payment for:", selectedPayment);
        if (!selectedPayment) return;

        try {
            setLoading(true, "Processing payment...");

            const paymentPayload = {
                transid: selectedPayment.dailymilkstatusid,     // booking transid
                payment_mode: paymentMethod,          // e.g., CASH / ONLINE
                totalamount: parseFloat(paymentAmount),
                paidamount: parseFloat(paymentAmount)
            };

            log("Payment payload:", paymentPayload);

            const response = await API.PUT("DailyMilkBooking/DailyMilkMarkPaid", paymentPayload);

            if (response.message === "Daily milk booking marked as paid successfully.") {
                Alert.alert("Success", "Payment processed successfully!");
                setPaymentModalVisible(false);
                setConfirmationModalVisible(false);
                fetchPaymentData(userData?.transid);
            } else {
                Alert.alert("Error", response.message || "Payment failed");
            }
        } catch (error) {
            log("Payment error:", error);
            Alert.alert("Error", "Payment processing failed");
        } finally {
            setLoading(false);
        }
    };


    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en', {
            day: 'numeric',
            month: 'short',
            year: 'numeric', timeZone: 'UTC'
        });
    };

    const renderPaymentCard = (item, index) => {
        const paymentKey = getPaymentKey(item, index);
        const expanded = expandedPaymentKey === paymentKey;
        const {
            bookedAmount,
            payableAmount,
            balanceAmount,
            receivedAmount,
            paidAmount,
            hasDue,
            hasReceivedMilk,
            isPaid,
        } = getPaymentState(item);
        const displayDailyQuantity = firstNumber(item?.adjustedquantity, item?.adjusted_quantity, item?.quantity);
        const selectedQuantityAmount = toAmount(item?.price) * displayDailyQuantity;
        const bookedQuantity = firstNumber(
            item?.adjusted_total_quantity,
            item?.total_adjusted_quantity,
            item?.total_booked_quantity,
            item?.booked_quantity,
            item?.total_qty
        );
        const extraQuantity = firstNumber(item?.total_extra, item?.extra_quantity, item?.total_extra_quantity);
        const receivedQuantity = firstNumber(item?.received_quantity, item?.delivered_quantity, item?.total_received_quantity);
        const cancelledQuantity = firstNumber(
            item?.cancelled_quantity,
            item?.cancelled_qty,
            item?.total_cancelled_quantity,
            Math.max(bookedQuantity + extraQuantity - receivedQuantity, 0)
        );
        const cancelledAmount = firstNumber(
            item?.cancelled_amount,
            item?.cancelledamount,
            item?.cancelled_baseamount,
            cancelledQuantity * toAmount(item?.price)
        );

        return (
            <View
                key={paymentKey}
                className={`border-2 rounded-xl mb-4 overflow-hidden ${isPaid ? 'border-green-500 bg-green-50' : hasDue ? 'border-orange-500 bg-white' : 'border-gray-300 bg-white'}`}
            >
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setExpandedPaymentKey((current) => current === paymentKey ? null : paymentKey)}
                    className="p-4"
                >
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-3">
                            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                                {item.productname || 'Milk'}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-1">
                                {formatDate(item.bookingstartdate)} to {formatDate(item.bookingenddate)}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-1 capitalize">
                                {item.deliverytype || 'Morning'} • {formatQty(displayDailyQuantity)} L/day
                            </Text>
                        </View>

                        <View className="items-end">
                            <View className={`px-2.5 py-1 rounded-full ${isPaid ? 'bg-green-500' : hasDue ? 'bg-orange-500' : 'bg-gray-500'}`}>
                                <Text className="text-[10px] font-bold text-white">
                                    {isPaid ? 'PAID' : hasDue ? 'DUE' : 'PENDING'}
                                </Text>
                            </View>
                            <Text className={`text-lg font-bold mt-2 ${hasDue ? 'text-orange-600' : 'text-green-700'}`}>
                                ₹{formatAmount(balanceAmount)}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Text className="text-[11px] text-gray-500 mr-1">
                                    {expanded ? 'Hide' : 'View'}
                                </Text>
                                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#6B7280" />
                            </View>
                        </View>
                    </View>

                    <View className="flex-row flex-wrap mt-3">
                        <View className={`px-2 py-1 rounded-full mr-2 mb-2 ${item.booking_status === 'current booking' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Text className={`text-[10px] font-bold ${item.booking_status === 'current booking' ? 'text-blue-800' : 'text-gray-800'}`}>
                                {item.booking_status}
                            </Text>
                        </View>
                        <View className="px-2 py-1 rounded-full bg-slate-100 mb-2">
                            <Text className="text-[10px] font-bold text-slate-700">
                                Payable ₹{formatAmount(payableAmount)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {expanded && (
                <View className="space-y-2 px-4 pb-4">
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Product:</Text>
                        <Text className="font-semibold">{item.productname || 'Milk'}</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Price per unit:</Text>
                        <Text className="font-semibold">₹{item.price || '0'}</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Quantity per day:</Text>
                        <Text className="font-semibold">{formatQty(displayDailyQuantity)} L</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Selected Quantity Amount:</Text>
                        <Text className="font-semibold text-green-700">₹{formatAmount(selectedQuantityAmount)}</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Delivery Time:</Text>
                        <Text className="font-semibold capitalize">{item.deliverytype || 'Morning'}</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Booking Period:</Text>
                        <Text className="font-semibold text-right">
                            {formatDate(item.bookingstartdate)} to {formatDate(item.bookingenddate)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Total Quantity:</Text>
                        <Text className="font-semibold">{formatQty(bookedQuantity)} L</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Extra Quantity:</Text>
                        <Text className="font-semibold">{formatQty(extraQuantity)} L</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Cancelled Quantity:</Text>
                        <Text className="font-semibold text-red-700">{formatQty(cancelledQuantity)} L</Text>
                    </View>

                    {/* Amount Details */}
                    <View className="border-t border-gray-200 pt-2 mt-2">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Base Amount:</Text>
                            <Text className="font-semibold">₹{item.baseamount || '0'}</Text>
                        </View>

                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Extra Amount:</Text>
                            <Text className="font-semibold">₹{formatAmount(item.extraamount)}</Text>
                        </View>

                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Cancelled Amount:</Text>
                            <Text className="font-semibold text-red-700">- ₹{formatAmount(cancelledAmount)}</Text>
                        </View>

                        <View className="flex-row justify-between border-t border-gray-300 pt-2 mt-1">
                            <Text className="text-lg font-bold text-gray-800">Booked Total:</Text>
                            <Text className="text-lg font-bold text-green-600">
                                ₹{formatAmount(bookedAmount)}
                            </Text>
                        </View>

                        <View className="flex-row justify-between pt-1">
                            <Text className="text-gray-600">Payable Delivered Value:</Text>
                            <Text className="font-bold text-blue-700">
                                ₹{formatAmount(payableAmount)}
                            </Text>
                        </View>

                        <View className="flex-row justify-between border-t border-gray-300 pt-2 mt-1">
                            <Text className="text-lg font-bold text-gray-800">Amount To Pay:</Text>
                            <Text className={`text-lg font-bold ${hasDue ? 'text-orange-600' : 'text-green-600'}`}>
                                ₹{formatAmount(balanceAmount)}
                            </Text>
                        </View>
                    </View>

                    {/* Received Amounts (if any) */}
                    {(item.received_baseamount > 0 || item.received_extraamount > 0) && (
                        <View className="border-t border-gray-200 pt-2 mt-2">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Value of Milk Delivered:</Text>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Base Delivered Value:</Text>
                                <Text className="font-semibold">₹{item.received_baseamount || '0'}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Extra Delivered Value:</Text>
                                <Text className="font-semibold">₹{item.received_extraamount || '0'}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Total Delivered Value:</Text>
                                <Text className="font-semibold">₹{formatAmount(receivedAmount)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Paid Amount:</Text>
                                <Text className="font-semibold">₹{formatAmount(paidAmount)}</Text>
                            </View>
                        </View>
                    )}
                    {/* Pay Button - Only show if payment is pending and has balance */}
                {!isPaid && hasDue && (
                    <TouchableOpacity
                        onPress={() => handlePay(item)}
                        className="bg-orange-500 py-3 rounded-lg mt-4"
                    >
                        <Text className="text-white text-center font-bold text-lg">
                            Pay Now - ₹{formatAmount(balanceAmount)}
                        </Text>
                    </TouchableOpacity>
                )}

                {!isPaid && !hasDue && (
                    <View className="bg-gray-100 py-3 rounded-lg mt-4">
                        <Text className="text-gray-700 text-center font-bold text-base">
                            {hasReceivedMilk ? "No pending payment" : "No delivered milk amount due yet"}
                        </Text>
                    </View>
                )}

                {/* Show payment status if paid */}
                {isPaid && (
                    <View className="bg-green-100 py-3 rounded-lg mt-4">
                        <Text className="text-green-800 text-center font-bold text-lg">
                            Payment Completed
                        </Text>
                    </View>
                )}
                </View>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-4 py-4 border-b border-gray-200">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Daily Milk Payments</Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 p-4">
                {sortedPaymentData.length > 0 ? (
                    sortedPaymentData.map((item, index) => renderPaymentCard(item, index))
                ) : (
                    <View className="flex-1 justify-center items-center py-20">
                        <Ionicons name="card-outline" size={80} color="#d1d5db" />
                        <Text className="text-xl font-semibold text-gray-500 mt-4">
                            No Payment Records
                        </Text>
                        <Text className="text-gray-400 text-center mt-2 px-8">
                            You don't have any pending payments at the moment.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Payment Method Modal */}
            <Modal
                visible={paymentModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setPaymentModalVisible(false)}
            >
                <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
                    <View className="bg-white w-full max-w-md rounded-xl p-6">
                        <Text className="text-xl font-bold text-gray-900 mb-4">
                            Payment Details
                        </Text>

                        <View className="mb-4">
                            <Text className="text-gray-600 mb-2">Amount to Pay:</Text>
                            <TextInput
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                keyboardType="numeric"
                                className="border border-gray-300 rounded-lg p-3 text-lg font-bold text-gray-900"
                                editable={false}
                            />
                        </View>

                        <Text className="text-gray-600 mb-3">Select Payment Method:</Text>

                        <TouchableOpacity
                            onPress={() => handlePaymentMethodSelect('GPay')}
                            className="flex-row items-center bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3"
                        >
                            <Ionicons name="phone-portrait-outline" size={24} color="#4285F4" />
                            <Text className="ml-3 text-lg font-semibold text-blue-700">GPay</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handlePaymentMethodSelect('Cash')}
                            className="flex-row items-center bg-green-50 border border-green-200 rounded-lg p-4"
                        >
                            <Ionicons name="cash-outline" size={24} color="#0F9D58" />
                            <Text className="ml-3 text-lg font-semibold text-green-700">Cash</Text>
                        </TouchableOpacity>

                        <View className="flex-row justify-between mt-6">
                            <TouchableOpacity
                                onPress={() => setPaymentModalVisible(false)}
                                className="flex-1 mr-2 bg-gray-200 py-3 rounded-lg"
                            >
                                <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                visible={confirmationModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setConfirmationModalVisible(false)}
            >
                <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
                    <View className="bg-white w-full max-w-md rounded-xl p-6">
                        <Text className="text-xl font-bold text-gray-900 mb-2">
                            Confirm Payment
                        </Text>

                        <Text className="text-gray-600 mb-4">
                            Are you sure you want to proceed with {paymentMethod} payment of ₹{paymentAmount}?
                        </Text>

                        <View className="flex-row justify-between space-x-3">
                            <TouchableOpacity
                                onPress={() => setConfirmationModalVisible(false)}
                                className="flex-1 bg-gray-200 py-3 rounded-lg"
                            >
                                <Text className="text-center font-semibold text-gray-700">No, Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={processPayment}
                                className="flex-1 bg-green-500 py-3 rounded-lg"
                            >
                                <Text className="text-center font-semibold text-white">Yes, Proceed</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default DailyMilkPayment;
