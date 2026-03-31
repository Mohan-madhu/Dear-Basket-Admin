import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../config';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';

const OrderCard = ({ order, onOrderUpdate, enableReturnOrder = false, onReturnCreated }) => {
  const [expanded, setExpanded] = useState(false);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSelections, setReturnSelections] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [refundMethod, setRefundMethod] = useState('BankTransfer');
  const [refundGpayNumber, setRefundGpayNumber] = useState('');
  const [refundUpiId, setRefundUpiId] = useState('');
  const [refundBankHolderName, setRefundBankHolderName] = useState('');
  const [refundBankName, setRefundBankName] = useState('');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundIfscCode, setRefundIfscCode] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [ROLE, setROLE] = useState('');
  const [USER, setUSER] = useState('');
  const { setLoading } = useLoading();
  const log = createLogger('OrderCard');

  const ORDER_STATUS_FLOW = [
    'Order Placed',
    'Confirmed',
    'Packed',
    'Out for Delivery',
    'Delivered',
  ];

  useEffect(() => {
    checkForNewUpdates();
    getUserRole();
  }, [order]);

  useEffect(() => {
    setReturnSelections({});
    setShowReturnModal(false);
    setReturnReason('');
    setRefundMethod('BankTransfer');
    setRefundGpayNumber('');
    setRefundUpiId('');
    setRefundBankHolderName('');
    setRefundBankName('');
    setRefundAccountNumber('');
    setRefundIfscCode('');
  }, [order?.productorderid]);

  const getUserRole = async () => {
    try {
      const role = await Storage.getData('ROLE');
      const user = await Storage.getData('USER');
      setROLE(role);
      setUSER(user);
    } catch (error) {
      log('Error getting user role:', error);
    }
  };

  const markAsViewed = () => {
    setHasNewUpdates(false);
  };

  const getStatusButtonConfig = (status) => {
    switch (status) {
      case 'Confirmed':
        return { icon: 'check-circle-outline', color: 'bg-blue-600', text: 'Confirm Order' };
      case 'Packed':
        return { icon: 'package-variant', color: 'bg-amber-600', text: 'Mark as Packed' };
      case 'Out for Delivery':
        return { icon: 'truck-delivery', color: 'bg-purple-600', text: 'Out for Delivery' };
      case 'Delivered':
        return { icon: 'check-circle', color: 'bg-green-600', text: 'Mark as Delivered' };
      default:
        return { icon: 'update', color: 'bg-gray-600', text: 'Update Status' };
    }
  };

  const updateOrderStatus = async (newStatus) => {
    if (!newStatus) return;

    try {
      setLoading(true, `Updating order to ${newStatus}...`);

      let endpoint = '';
      let payload = {
        productorderid: order.productorderid,
        luu: USER,
      };

      switch (newStatus) {
        case 'Confirmed':
          endpoint = 'confirm';
          payload.orderconfirmedby = USER;
          break;
        case 'Packed':
          endpoint = 'pack';
          payload.orderpackedby = USER;
          break;
        case 'Out for Delivery':
          endpoint = 'outfordelivery';
          payload.orderoutofdeliveryby = USER;
          break;
        case 'Delivered':
          endpoint = 'deliver';
          payload.orderdeliveredby = USER;
          break;
        default:
          endpoint = 'status';
          payload.orderstatus = newStatus;
      }

      const response = await API.PUT(`ProductOrder/${endpoint}`, payload);

      Alert.alert('Success', response.message || `Order status updated to ${newStatus}`);

      if (onOrderUpdate) {
        onOrderUpdate();
      }
    } catch (error) {
      log('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a cancellation reason');
      return;
    }

    try {
      setLoading(true, 'Cancelling order...');

      const payload = {
        productorderid: order.productorderid,
        ordercalcelledby: USER,
        ordercancelledreason: cancelReason,
        luu: USER,
      };

      const response = await API.PUT('Orders/cancel', payload);

      Alert.alert('Success', response.message || 'Order cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');

      if (onOrderUpdate) {
        onOrderUpdate();
      }
    } catch (error) {
      log('Error cancelling order:', error);
      Alert.alert('Error', 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  const getImageUri = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('file://')) return imagePath;
    if (imagePath.startsWith('http')) return imagePath;
    return getImageUrl(imagePath);
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
  const isWithinReturnWindow = () => {
    const deliveredAtRaw = order?.orderdeliveredtime;
    if (!deliveredAtRaw) return false;
    const deliveredAt = new Date(deliveredAtRaw);
    if (Number.isNaN(deliveredAt.getTime())) return false;
    const windowEnd = new Date(deliveredAt);
    windowEnd.setDate(windowEnd.getDate() + 7);
    return new Date() <= windowEnd;
  };

  const isReturnEligible =
    enableReturnOrder &&
    order?.isdailymilkuser !== 2 &&
    Number(order?.orderdelivered || 0) === 1 &&
    Number(order?.ordercancelled || 0) !== 1 &&
    isWithinReturnWindow() &&
    totalItems > 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const getTimeDifference = (startDate, endDate) => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);

    return result.join(' ') || '0m';
  };

  const calculateItemTotal = (item) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.orderquantity || 1);
    return price * quantity;
  };

  const openMaps = (lat, lng) => {
    if (!lat || !lng) {
      Alert.alert('Location not available');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch((err) => {
      log('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps app');
    });
  };

  const getCurrentStatus = () => {
    if (order.ordercancelled === 1) return 'Cancelled';
    if (order.orderdelivered === 1) return 'Delivered';
    if (order.orderoutofdelivery === 1) return 'Out for Delivery';
    if (order.orderpacked === 1) return 'Packed';
    if (order.orderconfirmed === 1) return 'Confirmed';
    if (order.orderplaced === 1) return 'Order Placed';
    return 'Pending';
  };

  const getNextStatus = () => {
    const currentStatus = getCurrentStatus();

    if (currentStatus === 'Cancelled' || currentStatus === 'Delivered') {
      return null;
    }

    const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

    if (currentIndex === -1 || currentIndex >= ORDER_STATUS_FLOW.length - 1) {
      return null;
    }

    return ORDER_STATUS_FLOW[currentIndex + 1];
  };

  const isStatusCompleted = (status) => {
    switch (status) {
      case 'Order Placed':
        return order.orderplaced === 1;
      case 'Confirmed':
        return order.orderconfirmed === 1;
      case 'Packed':
        return order.orderpacked === 1;
      case 'Out for Delivery':
        return order.orderoutofdelivery === 1;
      case 'Delivered':
        return order.orderdelivered === 1;
      case 'Cancelled':
        return order.ordercancelled === 1;
      default:
        return false;
    }
  };

  const getStatusStyle = () => {
    const status = getCurrentStatus();

    switch (status?.toLowerCase()) {
      case 'delivered':
        return {
          wrap: 'bg-green-50 border-green-200',
          text: 'text-green-700',
          icon: 'check-circle',
          iconColor: '#16A34A',
        };
      case 'cancelled':
        return {
          wrap: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          icon: 'close-circle',
          iconColor: '#DC2626',
        };
      case 'confirmed':
        return {
          wrap: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          icon: 'check-decagram',
          iconColor: '#2563EB',
        };
      case 'packed':
        return {
          wrap: 'bg-amber-50 border-amber-200',
          text: 'text-amber-700',
          icon: 'package-variant-closed',
          iconColor: '#D97706',
        };
      case 'out for delivery':
        return {
          wrap: 'bg-purple-50 border-purple-200',
          text: 'text-purple-700',
          icon: 'truck-delivery',
          iconColor: '#7C3AED',
        };
      default:
        return {
          wrap: 'bg-gray-50 border-gray-200',
          text: 'text-gray-700',
          icon: 'clock-outline',
          iconColor: '#6B7280',
        };
    }
  };

  const checkForNewUpdates = () => {
    const lastViewedStatus = order.lastViewedStatus || 'Order Placed';
    const currentStatus = getCurrentStatus();

    if (lastViewedStatus !== currentStatus) {
      setHasNewUpdates(true);
    }
  };

  const AdminActions = () => {
    if (ROLE !== 'ADMIN') return null;

    const currentStatus = getCurrentStatus();
    const nextStatus = getNextStatus();

    if (currentStatus === 'Cancelled' || currentStatus === 'Delivered') {
      return null;
    }

    const buttonConfig = nextStatus ? getStatusButtonConfig(nextStatus) : null;

    return (
      <View className="mt-2">
        <View className="flex-row">
          {buttonConfig && (
            <TouchableOpacity
              onPress={() => updateOrderStatus(nextStatus)}
              className={`flex-1 ${buttonConfig.color} py-2 px-2 mx-1 rounded-xl flex-row items-center justify-center`}
              activeOpacity={0.85}
            >
              <Icon name={buttonConfig.icon} size={14} color="white" />
              <Text className="text-white text-xs font-semibold ml-1">{buttonConfig.text}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowCancelModal(true)}
            className="flex-1 bg-red-600 py-2 px-2 mx-1 rounded-xl flex-row items-center justify-center"
            activeOpacity={0.85}
          >
            <Icon name="cancel" size={14} color="white" />
            <Text className="text-white text-xs font-semibold ml-1">Cancel Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TYPE_STYLES = {
    'Demo Daily Milk': {
      bgColor: '#fffbeb',
      textColor: '#b45309',
      borderColor: '#fde68a',
      icon: 'cow',
      label: 'Demo Milk',
    },
    'Daily Milk': {
      bgColor: '#eff6ff',
      textColor: '#1d4ed8',
      borderColor: '#bfdbfe',
      icon: 'cup',
      label: 'Daily Milk',
    },
    'Fast Grocery Delivery': {
      bgColor: '#f0fdf4',
      textColor: '#15803d',
      borderColor: '#bbf7d0',
      icon: 'cart',
      label: 'Fast Order',
    },
    'Food Delivery': {
      bgColor: '#fff7ed',
      textColor: '#c2410c',
      borderColor: '#fed7aa',
      icon: 'food',
      label: 'Food Order',
    },
  };

  const getOrderColor = (type) => {
    return TYPE_STYLES[type] || TYPE_STYLES['Fast Grocery Delivery'];
  };

  const renderTimelineRow = (icon, color, title, time, extraText) => (
    <View className="flex-row mb-4">
      <View className="w-8 items-center">
        <View className="w-7 h-7 rounded-full bg-white border border-gray-200 items-center justify-center">
          <Icon name={icon} size={15} color={color} />
        </View>
        <View className="flex-1 w-0.5 bg-gray-200 mt-1" />
      </View>
      <View className="ml-3 flex-1 pb-1">
        <Text className="text-sm font-semibold text-gray-800">{title}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{time}</Text>
        {extraText ? <Text className="text-xs text-blue-600 mt-1">{extraText}</Text> : null}
      </View>
    </View>
  );

  const renderOrderTimeline = () => (
    <View className="mt-2">
      <Text className="text-sm font-bold text-gray-800 mb-4">Order Timeline</Text>

      {isStatusCompleted('Order Placed') &&
        renderTimelineRow(
          'check-circle',
          '#10B981',
          'Order Placed',
          formatDate(order.orderpalcedtime),
          'Completed'
        )}

      {isStatusCompleted('Confirmed') &&
        renderTimelineRow(
          'check-decagram',
          '#2563EB',
          'Order Confirmed',
          formatDate(order.orderconfirmedtime),
          isStatusCompleted('Order Placed')
            ? `Time taken: ${getTimeDifference(order.orderpalcedtime, order.orderconfirmedtime)}`
            : null
        )}

      {isStatusCompleted('Packed') &&
        renderTimelineRow(
          'package-variant-closed',
          '#D97706',
          'Packed',
          formatDate(order.orderpackedtime),
          isStatusCompleted('Confirmed')
            ? `Time taken: ${getTimeDifference(order.orderconfirmedtime, order.orderpackedtime)}`
            : null
        )}

      {isStatusCompleted('Out for Delivery') &&
        renderTimelineRow(
          'truck-delivery',
          '#7C3AED',
          'Out for Delivery',
          formatDate(order.orderoutofdeliverytime),
          isStatusCompleted('Packed')
            ? `Time taken: ${getTimeDifference(order.orderpackedtime, order.orderoutofdeliverytime)}`
            : null
        )}

      {isStatusCompleted('Delivered') &&
        renderTimelineRow(
          'check-circle',
          '#16A34A',
          'Delivered',
          formatDate(order.orderdeliveredtime),
          isStatusCompleted('Out for Delivery')
            ? `Delivered in: ${getTimeDifference(order.orderoutofdeliverytime, order.orderdeliveredtime)}`
            : null
        )}

      {isStatusCompleted('Cancelled') &&
        renderTimelineRow(
          'close-circle',
          '#DC2626',
          'Cancelled',
          formatDate(order.ordercancelledtime),
          order.ordercancelledreason ? `Reason: ${order.ordercancelledreason}` : null
        )}
    </View>
  );

  const style = getOrderColor(order?.type);
  const statusStyle = getStatusStyle();
  const totalAmount =
    Number(order?.itemtotal || 0) + Number(order?.deliverycharge || 0) + Number(order?.tax || 0);

  const orderDisplayId =
    order?.dailymilkorderid ||
    (order?.productorderid && order.productorderid.length > 20
      ? order.productorderid.slice(-5).toUpperCase()
      : order?.productorderid?.toUpperCase());

  const toggleReturnSelection = (index) => {
    setReturnSelections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const openReturnModal = () => {
    const initial = {};
    orderItems.forEach((_, index) => {
      initial[index] = false;
    });
    setReturnSelections(initial);
    setShowReturnModal(true);
    hydrateRefundPrefs();
  };

  const getRefundPrefsKey = () =>
    `RETURN_REFUND_PREFS_${order?.userid || USER || 'ANON'}`;

  const hydrateRefundPrefs = async () => {
    try {
      const pref = await Storage.getData(getRefundPrefsKey());
      if (!pref) return;
      setRefundMethod(pref?.refundmethod || 'BankTransfer');
      setRefundGpayNumber(pref?.gpaynumber || '');
      setRefundUpiId(pref?.upiid || '');
      setRefundBankHolderName(pref?.bankholdername || '');
      setRefundBankName(pref?.bankname || '');
      setRefundAccountNumber(pref?.accountnumber || '');
      setRefundIfscCode(pref?.ifsccode || '');
    } catch (error) {
      log('Failed to hydrate refund prefs:', error);
    }
  };

  const persistRefundPrefs = async () => {
    try {
      await Storage.storeData(getRefundPrefsKey(), {
        refundmethod: refundMethod,
        gpaynumber: refundGpayNumber,
        upiid: refundUpiId,
        bankholdername: refundBankHolderName,
        bankname: refundBankName,
        accountnumber: refundAccountNumber,
        ifsccode: refundIfscCode,
      });
    } catch (error) {
      log('Failed to persist refund prefs:', error);
    }
  };

  const submitReturnRequest = async () => {
    if (isSubmittingReturn) return;

    const selectedItems = orderItems.filter((_, index) => returnSelections[index]);
    if (selectedItems.length === 0) {
      Alert.alert('Select Products', 'Please select at least one product to return.');
      return;
    }
    if (!returnReason.trim()) {
      Alert.alert('Reason Required', 'Please enter the reason for this return request.');
      return;
    }

    if (refundMethod === 'GPay' && !refundGpayNumber.trim() && !refundUpiId.trim()) {
      Alert.alert('Refund Details', 'Provide GPay number or UPI ID for GPay refund.');
      return;
    }

    if (refundMethod === 'BankTransfer') {
      if (
        !refundBankHolderName.trim() ||
        !refundBankName.trim() ||
        !refundAccountNumber.trim() ||
        !refundIfscCode.trim()
      ) {
        Alert.alert(
          'Refund Details',
          'Bank holder name, bank name, account number, and IFSC are required.'
        );
        return;
      }
    }

    try {
      setIsSubmittingReturn(true);
      setLoading(true, 'Submitting return request...');

      const items = selectedItems.map((item) => {
        const orderedqty = Number(item?.orderquantity || 1);
        const unitprice = Number(item?.price || 0);
        const returnqty = orderedqty;
        return {
          productorderdetailsid: item?.productorderdetailsid || null,
          productid: item?.productid || null,
          variantid: item?.variantid || null,
          productname: item?.productname || null,
          variantname: item?.variantname || null,
          orderedqty,
          returnqty,
          unitprice,
          lineamount: Number((returnqty * unitprice).toFixed(2)),
          itemreason: returnReason.trim(),
        };
      });

      const payload = {
        productorderid: order?.productorderid || null,
        userid: order?.userid || null,
        username: order?.name || null,
        partnerid: order?.mappedpartnerid || null,
        pickupaddress: order?.deliveryaddress || null,
        pickupcity: order?.deliverycity || null,
        pickupstate: order?.deliverystate || null,
        pickuppincode: order?.deliverypincode || null,
        pickuplatitude: order?.latitude || null,
        pickuplongitude: order?.longitude || null,
        returnreason: returnReason.trim(),
        refundmethod: refundMethod,
        gpaynumber: refundGpayNumber.trim() || null,
        upiid: refundUpiId.trim() || null,
        bankholdername: refundBankHolderName.trim() || null,
        bankname: refundBankName.trim() || null,
        accountnumber: refundAccountNumber.trim() || null,
        ifsccode: refundIfscCode.trim() || null,
        items,
        rcu: USER || order?.name || order?.userid || 'USER',
      };

      let response = null;
      try {
        response = await API.PUT('ProductReturn', payload);
      } catch (putError) {
        // Backward compatibility if backend still exposes POST for create.
        response = await API.POST('ProductReturn', payload);
      }

      setShowReturnModal(false);
      setReturnSelections({});
      setReturnReason('');
      await persistRefundPrefs();

      Alert.alert(
        'Return Requested',
        response?.message || `${selectedItems.length} item(s) submitted for return.`,
        [{ text: 'OK' }]
      );

      if (onReturnCreated) {
        onReturnCreated();
      } else if (onOrderUpdate) {
        onOrderUpdate();
      }
    } catch (error) {
      log('Error creating return request:', error);
      Alert.alert('Return Failed', error?.message || 'Unable to create return request right now.');
    } finally {
      setIsSubmittingReturn(false);
      setLoading(false);
    }
  };

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-2 overflow-hidden">
      <TouchableOpacity
        onPress={() => {
          setExpanded(!expanded);
          if (hasNewUpdates) markAsViewed();
        }}
        activeOpacity={0.92}
        className="px-3 py-2"
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center flex-wrap">
              <Text className="text-xs text-gray-500 font-medium">Order ID</Text>

              {hasNewUpdates && (
                <View className="ml-2 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                  <Text className="text-[10px] font-bold text-red-600">NEW UPDATE</Text>
                </View>
              )}
            </View>

            <Text className="text-sm font-extrabold text-gray-900 mt-0.5">#{orderDisplayId || 'N/A'}</Text>

            <View className="flex-row items-center mt-1 flex-wrap">
              <View
                style={{
                  backgroundColor: style.bgColor,
                  borderColor: style.borderColor,
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Icon name={style.icon} size={12} color={style.textColor} />
                <Text
                  style={{
                    marginLeft: 4,
                    color: style.textColor,
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                >
                  {order?.isdailymilkuser === 2 ? 'Demo Daily Milk' : style.label}
                </Text>
              </View>
            </View>
          </View>

          <View className={`px-2 py-1 rounded-xl border flex-row items-center ${statusStyle.wrap}`}>
            <Icon name={statusStyle.icon} size={13} color={statusStyle.iconColor} />
            <Text className={`ml-1 text-[10px] font-bold ${statusStyle.text}`}>
              {getCurrentStatus()}
            </Text>
          </View>
        </View>

        <View className="mt-1.5">
          <Text className="text-xs text-gray-800 font-semibold" numberOfLines={1}>
            {order?.name || 'Unknown User'}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
            {formatDate(order?.ordertime || order?.orderpalcedtime || order?.orderplacedtime)} • {order?.isdailymilkuser === 2 ? 'Demo' : `${totalItems} item${totalItems !== 1 ? 's' : ''}`} • {order?.isdailymilkuser === 2 ? 'Demo Order' : `₹${totalAmount}`}
          </Text>
        </View>

        {(order?.user_mobile && ROLE !== 'USER') || (order?.latitude && order?.longitude && order?.orderdelivered !== 1 && ROLE === 'ADMIN') ? (
          <View className="flex-row mt-2">
            {order?.user_mobile && ROLE !== 'USER' ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${order.user_mobile}`)}
                className="bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg flex-row items-center mr-2"
                activeOpacity={0.85}
              >
                <Icon name="phone" size={13} color="#16A34A" />
                <Text className="text-[11px] text-green-700 font-semibold ml-1">Call</Text>
              </TouchableOpacity>
            ) : null}

            {order?.latitude && order?.longitude && order?.orderdelivered !== 1 && ROLE === 'ADMIN' ? (
              <TouchableOpacity
                onPress={() => openMaps(order.latitude, order.longitude)}
                className="bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg flex-row items-center"
                activeOpacity={0.85}
              >
                <Icon name="map-marker" size={13} color="#2563EB" />
                <Text className="text-[11px] text-blue-700 font-semibold ml-1">Map</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <AdminActions />
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-200">
            <Text className="text-sm font-bold text-gray-800 mb-3">Delivery Address</Text>
            <Text className="text-sm text-gray-700">{order.deliveryaddress || 'N/A'}</Text>
            <Text className="text-sm text-gray-700 mt-1">
              {order.deliverycity || ''}{order.deliverycity ? ', ' : ''}
              {order.deliverystate || ''} {order.deliverypincode ? `- ${order.deliverypincode}` : ''}
            </Text>

            {order.latitude && order.longitude ? (
              <TouchableOpacity
                onPress={() => openMaps(order.latitude, order.longitude)}
                className="flex-row items-center mt-3 self-start bg-blue-50 border border-blue-200 px-3 py-2 rounded-full"
              >
                <Icon name="map-marker" size={14} color="#2563EB" />
                <Text className="text-xs text-blue-700 font-semibold ml-1">Open in Google Maps</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {order.isdailymilkuser === 2 ? (
            <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-200">
              {renderOrderTimeline()}
            </View>
          ) : (
            <>
              <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-200">
                <Text className="text-sm font-bold text-gray-800 mb-3">Order Items</Text>

                {orderItems.map((item, index) => {
                  const itemTotal = calculateItemTotal(item);
                  return (
                    <View
                      key={index}
                      className="bg-gray-50 p-3 rounded-2xl border border-gray-200 mb-3 flex-row items-center"
                    >
                      <Image
                        source={{
                          uri:
                            getImageUri(item.imageurl) ||
                            getImageUri(item.product?.imageurl) ||
                            'https://placehold.co/60x60/png?text=No+Image',
                        }}
                        className="w-14 h-14 rounded-xl mr-3"
                        resizeMode="cover"
                      />

                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                          {item.productname}
                        </Text>

                        {item.variantname ? (
                          <Text className="text-xs text-gray-500 mt-0.5">Variant: {item.variantname}</Text>
                        ) : null}

                        <View className="flex-row justify-between items-center mt-2">
                          <Text className="text-xs text-gray-500">
                            ₹{item.price} × {item.orderquantity}
                          </Text>
                          <Text className="text-sm font-bold text-gray-900">₹{itemTotal}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-200">
                <Text className="text-sm font-bold text-gray-800 mb-3">Price Details</Text>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Item Total</Text>
                  <Text className="text-sm font-medium text-gray-800">₹{order.itemtotal || 0}</Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Delivery Charge</Text>
                  <Text className="text-sm font-medium text-gray-800">₹{order.deliverycharge || 0}</Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Tax</Text>
                  <Text className="text-sm font-medium text-gray-800">₹{order.tax || 0}</Text>
                </View>

                <View className="border-t border-gray-200 pt-3 mt-2 flex-row justify-between items-center">
                  <Text className="text-base font-bold text-gray-900">Total Amount</Text>
                  <Text className="text-lg font-extrabold text-gray-900">₹{totalAmount}</Text>
                </View>
              </View>

              <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-200">
                {renderOrderTimeline()}
              </View>
            </>
          )}
        </View>
      )}

      <Modal visible={showCancelModal} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/40 p-4">
          <View className="bg-white w-full max-w-md rounded-3xl p-5">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                <Icon name="alert-circle-outline" size={22} color="#DC2626" />
              </View>
              <Text className="text-lg font-extrabold text-gray-900 ml-3">Cancel Order</Text>
            </View>

            <Text className="text-sm text-gray-600 mb-4 leading-5">
              Are you sure you want to cancel this order? Please enter the reason below.
            </Text>

            <Text className="text-sm font-semibold text-gray-700 mb-2">Cancellation Reason</Text>

            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Enter reason for cancellation"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-gray-300 rounded-2xl p-4 text-gray-800 mb-5 bg-gray-50"
            />

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-2xl mr-2"
                activeOpacity={0.85}
              >
                <Text className="text-gray-800 font-semibold text-center">Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={cancelOrder}
                className="flex-1 bg-red-600 py-3 rounded-2xl ml-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-center">Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="px-3 py-2 bg-white border-t border-gray-100">
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => {
              setExpanded(!expanded);
              if (hasNewUpdates) markAsViewed();
            }}
            className={`flex-row items-center justify-center bg-gray-50 rounded-xl py-2 ${
              isReturnEligible ? 'flex-1 mr-2' : 'w-full'
            }`}
            activeOpacity={0.85}
          >
            <Text className="text-blue-600 text-xs font-semibold mr-1.5">
              {expanded ? 'Show Less' : 'View Details'}
            </Text>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#2563EB" />
          </TouchableOpacity>

          {isReturnEligible ? (
            <TouchableOpacity
              onPress={openReturnModal}
              className="px-3 bg-orange-50 border border-orange-200 rounded-xl items-center justify-center"
              activeOpacity={0.85}
            >
              <Text className="text-[11px] font-semibold text-orange-700">Return Order</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Modal visible={showReturnModal} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/40 p-4">
          <View className="bg-white w-full max-w-md rounded-3xl p-5 max-h-[80%]">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center">
                <Icon name="backup-restore" size={22} color="#C2410C" />
              </View>
              <Text className="text-lg font-extrabold text-gray-900 ml-3">Return Order</Text>
            </View>

            <Text className="text-sm text-gray-600 mb-3">
              Select the products you want to return from this order.
            </Text>

            <ScrollView className="max-h-[320px]">
              {orderItems.map((item, index) => {
                const checked = !!returnSelections[index];
                return (
                  <TouchableOpacity
                    key={`${item?.productid || item?.variantid || 'item'}-${index}`}
                    className={`flex-row items-center p-3 rounded-xl border mb-2 ${
                      checked ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => toggleReturnSelection(index)}
                    activeOpacity={0.85}
                  >
                    <Icon
                      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={checked ? '#EA580C' : '#6B7280'}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                        {item?.productname || 'Product'}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        Qty: {item?.orderquantity || 1} • ₹{item?.price || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              value={returnReason}
              onChangeText={setReturnReason}
              placeholder="Reason for return (required)"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              className="border border-gray-300 rounded-2xl p-3 text-gray-800 mt-2 bg-gray-50"
            />

            <View className="mt-3">
              <Text className="text-xs font-semibold text-gray-700 mb-2">Refund Method</Text>
              <View className="flex-row">
                {['BankTransfer', 'GPay', 'Cash'].map((method) => {
                  const active = refundMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setRefundMethod(method)}
                      className={`mr-2 px-3 py-1.5 rounded-full border ${
                        active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>
                        {method === 'BankTransfer' ? 'Bank' : method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {refundMethod === 'GPay' ? (
              <View className="mt-2">
                <TextInput
                  value={refundGpayNumber}
                  onChangeText={setRefundGpayNumber}
                  placeholder="GPay Number"
                  keyboardType="phone-pad"
                  className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-gray-50"
                />
                <TextInput
                  value={refundUpiId}
                  onChangeText={setRefundUpiId}
                  placeholder="UPI ID"
                  autoCapitalize="none"
                  className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-gray-50 mt-2"
                />
              </View>
            ) : null}

            {refundMethod === 'BankTransfer' ? (
              <View className="mt-2">
                <TextInput
                  value={refundBankHolderName}
                  onChangeText={setRefundBankHolderName}
                  placeholder="Account Holder Name"
                  className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-gray-50"
                />
                <TextInput
                  value={refundBankName}
                  onChangeText={setRefundBankName}
                  placeholder="Bank Name"
                  className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-gray-50 mt-2"
                />
                <TextInput
                  value={refundAccountNumber}
                  onChangeText={setRefundAccountNumber}
                  placeholder="Account Number"
                  keyboardType="number-pad"
                  className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-gray-50 mt-2"
                />
                <TextInput
                  value={refundIfscCode}
                  onChangeText={setRefundIfscCode}
                  placeholder="IFSC Code"
                  autoCapitalize="characters"
                  className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-gray-50 mt-2"
                />
              </View>
            ) : null}

            <View className="flex-row mt-4">
              <TouchableOpacity
                onPress={() => setShowReturnModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-2xl mr-2"
                activeOpacity={0.85}
              >
                <Text className="text-gray-800 font-semibold text-center">Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReturnRequest}
                disabled={isSubmittingReturn}
                className="flex-1 bg-orange-600 py-3 rounded-2xl ml-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-center">
                  {isSubmittingReturn ? 'Submitting...' : 'Submit Return'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OrderCard;
