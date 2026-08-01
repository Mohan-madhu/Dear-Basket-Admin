import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    TextInput,
    Modal,
    SafeAreaView,
    Alert,
    RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { matchesCustomerPhone } from '../../App_Utils/Utils/orderSearch';

const DailyMilkActiveBookings = () => {
    const { setLoading } = useLoading();
    const [bookings, setBookings] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const filterOptions = [
        { key: 'all', label: 'All Bookings' },
        { key: 'morning', label: 'Morning Delivery' },
        { key: 'evening', label: 'Evening Delivery' },
        { key: 'active', label: 'Active Now' },
        { key: 'pending', label: 'Pending Payment' },
    ];

    const toAmount = (value) => {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount : 0;
    };

    const getDeliveredValue = (booking) => {
        if (booking?.received_fullamount !== undefined && booking?.received_fullamount !== null && booking?.received_fullamount !== "") {
            return toAmount(booking.received_fullamount);
        }
        return toAmount(booking?.received_baseamount) + toAmount(booking?.received_extraamount);
    };

    const getPaymentSummary = (booking) => {
        const payable = getDeliveredValue(booking);
        const paid = toAmount(booking?.paidamount);
        const pending = Math.max(payable - paid, 0);
        return { payable, paid, pending };
    };

    // Fetch active bookings from API
    const getActiveBookingsFromDB = async () => {
        setLoading(true, "Fetching Active Bookings");
        try {
            const res = await API.GET("DailyMilkBooking");
            const bookingsData = Array.isArray(res?.Response) ? res.Response : [];
            console.log("Active Bookings API Response:", bookingsData);

            // Sort by booking start date (newest first)
            const sortedBookings = bookingsData.sort((a, b) =>
                new Date(b.bookingstartdate) - new Date(a.bookingstartdate)
            );

            setBookings(sortedBookings);
        } catch (err) {
            console.error("Error fetching active bookings:", err);
            Alert.alert("Error", "Failed to fetch active bookings. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        getActiveBookingsFromDB();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        getActiveBookingsFromDB();
    };

    // Calculate remaining days of subscription
    const getRemainingDays = (bookingEndDate) => {
        if (!bookingEndDate) return null;

        const today = new Date();
        const endDate = new Date(bookingEndDate);

        // If end date has passed
        if (endDate < today) return 0;

        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    // Get subscription status
    const getSubscriptionStatus = (booking) => {
        const remainingDays = getRemainingDays(booking.bookingenddate);
        const today = new Date();
        const startDate = new Date(booking.bookingstartdate);
        const endDate = new Date(booking.bookingenddate);

        // Check if subscription is active
        const isActive = today >= startDate && today <= endDate;

        if (remainingDays === null) return {
            text: 'No end date',
            color: '#6B7280',
            bgColor: '#F3F4F6',
            status: 'unknown'
        };

        if (!isActive && today > endDate) {
            return {
                text: 'Expired',
                color: '#EF4444',
                bgColor: '#FEE2E2',
                status: 'expired'
            };
        }

        if (!isActive && today < startDate) {
            return {
                text: 'Starts Soon',
                color: '#F59E0B',
                bgColor: '#FEF3C7',
                status: 'upcoming'
            };
        }

        if (remainingDays === 0) {
            return {
                text: 'Ends Today',
                color: '#EF4444',
                bgColor: '#FEE2E2',
                status: 'ending'
            };
        }

        if (remainingDays <= 3) {
            return {
                text: `Ends in ${remainingDays} days`,
                color: '#F59E0B',
                bgColor: '#FEF3C7',
                status: 'ending-soon'
            };
        }

        if (remainingDays <= 7) {
            return {
                text: `${remainingDays} days left`,
                color: '#10B981',
                bgColor: '#D1FAE5',
                status: 'active'
            };
        }

        return {
            text: `${remainingDays} days left`,
            color: '#3B82F6',
            bgColor: '#DBEAFE',
            status: 'active'
        };
    };

    // Get delivery status
    const getDeliveryStatus = (deliveryType) => {
        const now = new Date();
        const currentHour = now.getHours();

        switch (deliveryType?.toLowerCase()) {
            case 'morning':
                return currentHour < 12 ? 'Morning Delivery Today' : 'Morning Delivery Completed';
            case 'evening':
                return currentHour >= 12 ? 'Evening Delivery Today' : 'Evening Delivery Pending';
            default:
                return deliveryType || 'Delivery';
        }
    };

    // Calculate payable amount from delivered milk value, not booked total
    const getPaymentStatus = (booking) => {
        const { payable, paid, pending } = getPaymentSummary(booking);

        if (payable > 0 && paid >= payable - 0.009) {
            return {
                text: 'Paid',
                color: '#10B981',
                bgColor: '#D1FAE5',
                amount: `₹${paid}/₹${payable}`,
                isPaid: true
            };
        }

        if (paid === 0) {
            return {
                text: 'Not Paid',
                color: '#EF4444',
                bgColor: '#FEE2E2',
                amount: `₹0/₹${payable}`,
                isPaid: false
            };
        }

        return {
            text: 'Partial Paid',
            color: '#F59E0B',
            bgColor: '#FEF3C7',
            amount: `₹${paid}/₹${payable}`,
            isPaid: false
        };
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
        });
    };

    // Format date with time
    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        });
    };

    // Filter bookings
    const filteredBookings = useMemo(() => {
        let filtered = bookings.filter(booking => {
            const matchesSearch = searchQuery === '' ||
                booking.userid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.dailymilkregistrationid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.productname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.transid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                booking.mappedpartnerid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                matchesCustomerPhone(booking, searchQuery);

            if (!matchesSearch) return false;

            const subscriptionStatus = getSubscriptionStatus(booking);
            const paymentStatus = getPaymentStatus(booking);

            switch (selectedFilter) {
                case 'morning':
                    return booking.deliverytype?.toLowerCase() === 'morning';
                case 'evening':
                    return booking.deliverytype?.toLowerCase() === 'evening';
                case 'active':
                    return subscriptionStatus.status === 'active' || subscriptionStatus.status === 'ending-soon';
                case 'pending':
                    return !paymentStatus.isPaid;
                default:
                    return true;
            }
        });

        // Sort by remaining days (ascending) and then by start date (descending)
        return filtered.sort((a, b) => {
            const daysA = getRemainingDays(a.bookingenddate) || 9999;
            const daysB = getRemainingDays(b.bookingenddate) || 9999;
            if (daysA !== daysB) return daysA - daysB;

            const startA = new Date(a.bookingstartdate);
            const startB = new Date(b.bookingstartdate);
            return startB - startA;
        });
    }, [bookings, selectedFilter, searchQuery]);

    // Handle call (if you have customer mobile numbers in the booking data)
    const handleCall = (mobile) => {
        if (mobile) {
            Linking.openURL(`tel:${mobile}`);
        } else {
            Alert.alert("Info", "Customer mobile number not available");
        }
    };

    // Booking Card Component
    const BookingCard = ({ booking }) => {
        const subscriptionStatus = getSubscriptionStatus(booking);
        const paymentStatus = getPaymentStatus(booking);
        const deliveryStatus = getDeliveryStatus(booking.deliverytype);
        const remainingDays = getRemainingDays(booking.bookingenddate);

        return (
            <TouchableOpacity
                onPress={() => {
                    setSelectedBooking(booking);
                    setModalVisible(true);
                }}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4"
                style={{
                    borderLeftColor: subscriptionStatus.color,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                }}
            >
                {/* Header Row */}
                <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                            {booking.userid || 'No User ID'}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            Registration: {booking.dailymilkregistrationid || 'No Registration'}
                        </Text>
                    </View>

                    {/* Subscription Status Badge */}
                    <View className="px-2 py-1 rounded-lg border"
                        style={{
                            backgroundColor: subscriptionStatus.bgColor,
                            borderColor: subscriptionStatus.color + '20',
                        }}>
                        <Text className="text-xs font-semibold"
                            style={{ color: subscriptionStatus.color }}>
                            {subscriptionStatus.text}
                        </Text>
                    </View>
                </View>

                {/* Product Details */}
                <View className="mb-3">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm font-semibold text-gray-800">
                            {booking.productname || 'Milk'}
                        </Text>
                        <Text className="text-sm font-bold text-emerald-600">
                            ₹{booking.price || 0}/L
                        </Text>
                    </View>

                    <View className="flex-row justify-between">
                        <View className="flex-row items-center">
                            <Icon name="weight" size={14} color="#6B7280" />
                            <Text className="text-xs text-gray-700 ml-1.5">
                                {booking.quantity || 0} L per day
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Icon name="truck-delivery" size={14} color="#6B7280" />
                            <Text className="text-xs text-gray-700 ml-1.5">
                                {booking.deliverytype || 'Daily'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Timeline */}
                <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs text-gray-500">Subscription Period</Text>
                        <Text className="text-xs text-gray-700">
                            {remainingDays !== null ? `${remainingDays} days left` : ''}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className="flex-1">
                            <Text className="text-xs font-medium text-gray-800">
                                {formatDate(booking.bookingstartdate)}
                            </Text>
                            <Text className="text-xs text-gray-500">Start</Text>
                        </View>
                        <Icon name="arrow-right" size={16} color="#6B7280" />
                        <View className="flex-1 items-end">
                            <Text className="text-xs font-medium text-gray-800">
                                {formatDate(booking.bookingenddate)}
                            </Text>
                            <Text className="text-xs text-gray-500">End</Text>
                        </View>
                    </View>
                </View>

                {/* Footer - Payment & Delivery */}
                <View className="flex-row justify-between items-center">
                    {/* Payment Status */}
                    <View className="flex-1 mr-2">
                        <View className="px-2 py-1 rounded-md"
                            style={{ backgroundColor: paymentStatus.bgColor }}>
                            <Text className="text-xs font-medium"
                                style={{ color: paymentStatus.color }}>
                                {paymentStatus.text}: {paymentStatus.amount}
                            </Text>
                        </View>
                    </View>

                    {/* Delivery Status */}
                    <Text className="text-xs text-gray-500 text-right">
                        {deliveryStatus}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Booking Detail Modal
    const BookingDetailModal = () => {
        if (!selectedBooking) return null;

        const subscriptionStatus = getSubscriptionStatus(selectedBooking);
        const paymentStatus = getPaymentStatus(selectedBooking);
        const deliveryStatus = getDeliveryStatus(selectedBooking.deliverytype);
        const remainingDays = getRemainingDays(selectedBooking.bookingenddate);

        return (
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                {/* Modal Overlay */}
                <View className="flex-1 bg-black/50 justify-center p-5">
                    {/* Modal Container */}
                    <View className="bg-white rounded-2xl p-5 max-h-[85%]">
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-4">
                            <View className="flex-1">
                                <Text className="text-xl font-bold text-gray-800">
                                    Booking Details
                                </Text>
                                <Text className="text-xs text-gray-500 mt-1">
                                    Transaction: {selectedBooking.transid || 'N/A'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="p-1"
                            >
                                <Icon name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                            {/* Subscription Status */}
                            <View className="p-3 rounded-lg mb-4 border-l-4"
                                style={{
                                    backgroundColor: subscriptionStatus.bgColor,
                                    borderLeftColor: subscriptionStatus.color,
                                }}>
                                <View className="flex-row items-center">
                                    <Icon name="calendar-clock" size={18} color={subscriptionStatus.color} />
                                    <Text className="text-base font-semibold ml-2"
                                        style={{ color: subscriptionStatus.color }}>
                                        {subscriptionStatus.text}
                                    </Text>
                                </View>
                                <Text className="text-xs text-gray-700 mt-1">
                                    {remainingDays !== null ? `${remainingDays} days remaining in subscription` : 'No end date set'}
                                </Text>
                            </View>

                            {/* Product Details */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">Product Details</Text>
                                <View className="bg-gray-50 p-3 rounded-lg">
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Product</Text>
                                        <Text className="text-sm text-gray-800">{selectedBooking.productname || 'Milk'}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Price per Liter</Text>
                                        <Text className="text-sm text-gray-800">₹{selectedBooking.price || 0}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Daily Quantity</Text>
                                        <Text className="text-sm text-gray-800">{selectedBooking.quantity || 0} Liters</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Delivery Type</Text>
                                        <View className="flex-row items-center">
                                            <Icon
                                                name={selectedBooking.deliverytype?.toLowerCase() === 'morning' ? 'weather-sunny' : 'weather-night'}
                                                size={14}
                                                color="#6B7280"
                                            />
                                            <Text className="text-sm text-gray-800 ml-1">
                                                {selectedBooking.deliverytype || 'Daily'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Subscription Timeline */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">Subscription Timeline</Text>
                                <View className="bg-gray-50 p-3 rounded-lg">
                                    <View className="flex-row justify-between mb-3">
                                        <View>
                                            <Text className="text-xs text-gray-500">Start Date</Text>
                                            <Text className="text-sm font-medium text-gray-800">
                                                {formatDate(selectedBooking.bookingstartdate)}
                                            </Text>
                                        </View>
                                        <Icon name="arrow-right" size={20} color="#6B7280" />
                                        <View className="items-end">
                                            <Text className="text-xs text-gray-500">End Date</Text>
                                            <Text className="text-sm font-medium text-gray-800">
                                                {formatDate(selectedBooking.bookingenddate)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                        <View
                                            className="bg-emerald-500 h-2 rounded-full"
                                            style={{
                                                width: `${remainingDays && remainingDays > 0 ?
                                                    Math.min(100, (remainingDays / 30) * 100) : 0}%`
                                            }}
                                        />
                                    </View>
                                    <Text className="text-xs text-gray-500 text-center">
                                        {remainingDays !== null ? `${remainingDays} days remaining` : 'Subscription period not set'}
                                    </Text>
                                </View>
                            </View>

                            {/* Payment Details */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">Payment Details</Text>
                                <View className="bg-gray-50 p-3 rounded-lg">
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Booked Amount</Text>
                                        <Text className="text-sm font-bold text-gray-800">₹{selectedBooking.totalamount || 0}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Delivered Value</Text>
                                        <Text className="text-sm text-gray-800">₹{getPaymentSummary(selectedBooking).payable.toFixed(2)}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Paid Amount</Text>
                                        <Text className="text-sm text-gray-800">₹{selectedBooking.paidamount || 0}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-800">Balance</Text>
                                        <Text className="text-sm font-bold text-emerald-600">
                                            ₹{getPaymentSummary(selectedBooking).pending.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View className="mt-2">
                                        <View className="px-3 py-2 rounded-md"
                                            style={{ backgroundColor: paymentStatus.bgColor }}>
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-row items-center">
                                                    <Icon
                                                        name={paymentStatus.isPaid ? 'check-circle' : 'alert-circle'}
                                                        size={16}
                                                        color={paymentStatus.color}
                                                    />
                                                    <Text className="text-sm font-semibold ml-1.5"
                                                        style={{ color: paymentStatus.color }}>
                                                        {paymentStatus.text}
                                                    </Text>
                                                </View>
                                                <Text className="text-sm font-semibold"
                                                    style={{ color: paymentStatus.color }}>
                                                    {paymentStatus.amount}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Additional Information */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">Additional Information</Text>
                                <View className="bg-gray-50 p-3 rounded-lg gap-2">
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">User ID</Text>
                                        <Text className="text-sm text-gray-800">{selectedBooking.userid || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Registration ID</Text>
                                        <Text className="text-sm text-gray-800">{selectedBooking.dailymilkregistrationid || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Mapped Partner</Text>
                                        <Text className="text-sm text-gray-800">{selectedBooking.mappedpartnerid || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Booking ID</Text>
                                        <Text className="text-sm text-gray-800">{selectedBooking.bookingid || 'N/A'}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Created On</Text>
                                        <Text className="text-sm text-gray-800">{formatDateTime(selectedBooking.rcm)}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Last Updated</Text>
                                        <Text className="text-sm text-gray-800">
                                            {selectedBooking.lum ? formatDateTime(selectedBooking.lum) : 'Never'}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm font-medium text-gray-800">Status</Text>
                                        <View className="px-2 py-1 rounded"
                                            style={{ backgroundColor: selectedBooking.status === 1 ? '#D1FAE5' : '#FEE2E2' }}>
                                            <Text className="text-xs font-semibold"
                                                style={{ color: selectedBooking.status === 1 ? '#10B981' : '#EF4444' }}>
                                                {selectedBooking.status === 1 ? 'Active' : 'Inactive'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Delivery Information */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">Delivery Information</Text>
                                <View className="bg-gray-50 p-3 rounded-lg">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center">
                                            <Icon
                                                name={selectedBooking.deliverytype?.toLowerCase() === 'morning' ? 'weather-sunny' : 'weather-night'}
                                                size={18}
                                                color="#6B7280"
                                            />
                                            <Text className="text-sm font-medium text-gray-800 ml-2">
                                                {selectedBooking.deliverytype || 'Daily'} Delivery
                                            </Text>
                                        </View>
                                        <Text className="text-sm text-gray-700">{deliveryStatus}</Text>
                                    </View>
                                    <Text className="text-xs text-gray-500">
                                        {selectedBooking.deliverytype?.toLowerCase() === 'morning'
                                            ? 'Delivered every morning'
                                            : 'Delivered every evening'}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View className="flex-row gap-3">
                            {/* <TouchableOpacity
                                onPress={() => {
                                    // You can implement update functionality here
                                    Alert.alert("Info", "Update functionality to be implemented");
                                }}
                                className="flex-1 bg-blue-500 py-3 rounded-lg flex-row items-center justify-center"
                            >
                                <Icon name="pencil" size={18} color="#FFFFFF" />
                                <Text className="text-white font-semibold ml-1.5">Update</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    // You can implement payment functionality here
                                    Alert.alert("Info", "Payment functionality to be implemented");
                                }}
                                className="flex-1 bg-emerald-500 py-3 rounded-lg flex-row items-center justify-center"
                            >
                                <Icon name="credit-card" size={18} color="#FFFFFF" />
                                <Text className="text-white font-semibold ml-1.5">Add Payment</Text>
                            </TouchableOpacity> */}

                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="flex-1 bg-gray-500 py-3 rounded-lg flex-row items-center justify-center"
                            >
                                <Text className="text-white font-semibold">Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Calculate total statistics
    const calculateStats = useMemo(() => {
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(b => {
            const status = getSubscriptionStatus(b);
            return status.status === 'active' || status.status === 'ending-soon';
        }).length;

        const totalRevenue = bookings.reduce((sum, b) => sum + getPaymentSummary(b).payable, 0);
        const totalPaid = bookings.reduce((sum, b) => sum + getPaymentSummary(b).paid, 0);
        const pendingPayment = bookings.reduce((sum, b) => sum + getPaymentSummary(b).pending, 0);

        const morningDeliveries = bookings.filter(b => b.deliverytype?.toLowerCase() === 'morning').length;
        const eveningDeliveries = bookings.filter(b => b.deliverytype?.toLowerCase() === 'evening').length;

        return {
            totalBookings,
            activeBookings,
            totalRevenue,
            totalPaid,
            pendingPayment,
            morningDeliveries,
            eveningDeliveries
        };
    }, [bookings]);

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="bg-white px-4 pt-2 pb-4">
                <Text className="text-2xl font-bold text-gray-800 mb-1">
                    Active Milk Bookings
                </Text>
                <Text className="text-xs text-gray-500">
                    {filteredBookings.length} bookings • ₹{calculateStats.totalRevenue.toLocaleString()} total revenue
                </Text>
            </View>

            {/* Stats Overview */}
            <View className="bg-white px-4 py-2">
                <View className="flex-row flex-wrap gap-2">
                    {/* Row 1 */}
                    <View className="flex-row gap-2 flex-1 min-w-[48%]">
                        <View className="bg-blue-50 p-3 rounded-xl flex-1">
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
                                <Text className="text-xs font-semibold text-gray-600">Active</Text>
                            </View>
                            <Text className="text-base font-bold text-blue-700 mt-1">{calculateStats.activeBookings}</Text>
                            <Text className="text-[10px] text-gray-500">of {calculateStats.totalBookings}</Text>
                        </View>

                        <View className="bg-emerald-50 p-3 rounded-xl flex-1">
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                                <Text className="text-xs font-semibold text-gray-600">Revenue</Text>
                            </View>
                            <Text className="text-base font-bold text-emerald-700 mt-1">
                                ₹{(calculateStats.totalRevenue / 1000).toFixed(1)}k
                            </Text>
                            <Text className="text-[10px] text-gray-500">{(calculateStats.pendingPayment / 1000).toFixed(1)}k pending</Text>
                        </View>
                    </View>

                    {/* Row 2 */}
                    <View className="flex-row gap-2 flex-1 min-w-[48%]">
                        <View className="bg-amber-50 p-3 rounded-xl flex-1">
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                                <Text className="text-xs font-semibold text-gray-600">Deliveries</Text>
                            </View>
                            <View className="flex-row items-center mt-1">
                                <View className="flex-1 items-center">
                                    <Icon name="weather-sunny" size={12} color="#F59E0B" />
                                    <Text className="text-xs font-bold text-gray-700 mt-0.5">{calculateStats.morningDeliveries}</Text>
                                </View>
                                <View className="flex-1 items-center">
                                    <Icon name="weather-night" size={12} color="#3B82F6" />
                                    <Text className="text-xs font-bold text-gray-700 mt-0.5">{calculateStats.eveningDeliveries}</Text>
                                </View>
                            </View>
                        </View>

                        <View className="bg-purple-50 p-3 rounded-xl flex-1">
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
                                <Text className="text-xs font-semibold text-gray-600">Collection</Text>
                            </View>
                            <Text className="text-base font-bold text-purple-700 mt-1">
                                {((calculateStats.totalPaid / calculateStats.totalRevenue) * 100 || 0).toFixed(0)}%
                            </Text>
                            <Text className="text-[10px] text-gray-500">paid</Text>
                        </View>
                    </View>
                </View>
            </View>
            {/* Search Bar */}
            <View className="bg-white px-4 py-3">
                <View className="bg-gray-100 rounded-lg px-3 py-2 flex-row items-center">
                    <Icon name="magnify" size={18} color="#6B7280" />
                    <TextInput
                        placeholder="Search user ID, phone, product, or partner..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-2 text-sm text-gray-800"
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <View className="bg-white px-4 pb-3">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                >
                    {filterOptions.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setSelectedFilter(filter.key)}
                            className={`px-3.5 py-1.5 rounded-2xl border ${selectedFilter === filter.key ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-200'}`}
                        >
                            <Text className={`text-xs font-semibold ${selectedFilter === filter.key ? 'text-white' : 'text-gray-500'}`}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Booking List */}
            <ScrollView
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#3B82F6']}
                        tintColor="#3B82F6"
                    />
                }
            >
                {filteredBookings.length === 0 ? (
                    <View className="items-center justify-center py-10">
                        <Icon name="calendar-remove" size={40} color="#9CA3AF" />
                        <Text className="text-base text-gray-500 font-medium mt-3">
                            No bookings found
                        </Text>
                        <Text className="text-xs text-gray-400 text-center mt-1">
                            {searchQuery ? 'Try changing your search' : 'Pull down to refresh'}
                        </Text>
                    </View>
                ) : (
                    <>
                        {filteredBookings.map((booking, index) => (
                            <BookingCard
                                key={booking.transid || booking.bookingid || `booking-${index}`}
                                booking={booking}
                            />
                        ))}

                        <View className="h-10" />
                    </>
                )}
            </ScrollView>

            {/* Booking Detail Modal */}
            <BookingDetailModal />
        </SafeAreaView>
    );
};

export default DailyMilkActiveBookings;
