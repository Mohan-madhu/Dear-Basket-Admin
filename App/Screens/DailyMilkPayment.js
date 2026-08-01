import React, { useState, useEffect } from 'react';
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


    const getStatusColor = (status) => {
        switch (status) {
            case 'Match Found': return 'bg-green-100 border-green-500';
            case 'No Match': return 'bg-red-100 border-red-500';
            default: return 'bg-gray-100 border-gray-500';
        }
    };

    const getStatusTextColor = (status) => {
        switch (status) {
            case 'Match Found': return 'text-green-800';
            case 'No Match': return 'text-red-800';
            default: return 'text-gray-800';
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

        return (
            <View
                key={index}
                className={`border-2 rounded-xl p-4 mb-4 ${isPaid ? 'border-green-500 bg-green-50' : hasDue ? 'border-orange-500 bg-white' : 'border-gray-300 bg-white'}`}
            >
                {/* Status Badge */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className={`px-3 py-1 rounded-full ${getStatusColor(item.match_status)}`}>
                        <Text className={`text-xs font-bold ${getStatusTextColor(item.match_status)}`}>
                            {item.match_status}
                        </Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                        <View className={`px-2 py-1 rounded-full ${item.booking_status === 'current booking' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs font-bold ${item.booking_status === 'current booking' ? 'text-blue-800' : 'text-gray-800'}`}>
                                {item.booking_status}
                            </Text>
                        </View>
                        {isPaid && (
                            <View className="bg-green-500 px-2 py-1 rounded-full">
                                <Text className="text-xs font-bold text-white">PAID</Text>
                            </View>
                        )}
                        {!isPaid && !hasDue && (
                            <View className="bg-gray-500 px-2 py-1 rounded-full">
                                <Text className="text-xs font-bold text-white">PENDING</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Product Details */}
                <View className="space-y-2">
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
                        <Text className="font-semibold">{item.quantity || '0'} L</Text>
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
                        <Text className="font-semibold">{item.total_qty || '0'} L</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Extra Quantity:</Text>
                        <Text className="font-semibold">{item.total_extra || '0'} L</Text>
                    </View>

                    {/* Amount Details */}
                    <View className="border-t border-gray-200 pt-2 mt-2">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Base Amount:</Text>
                            <Text className="font-semibold">₹{item.baseamount || '0'}</Text>
                        </View>

                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Extra Amount:</Text>
                            <Text className="font-semibold">₹{item.extraamount || '0'}</Text>
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
                </View>

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
                {paymentData.length > 0 ? (
                    paymentData.map((item, index) => renderPaymentCard(item, index))
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
