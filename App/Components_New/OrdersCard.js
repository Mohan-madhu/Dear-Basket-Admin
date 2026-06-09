import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../config';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';

const OrderCard = ({ order, onOrderUpdate, enableReturnOrder = false, onReturnCreated }) => {
  const RETURN_MODAL_BODY_MAX_HEIGHT = Dimensions.get('window').height * 0.62;
  const [expanded, setExpanded] = useState(false);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showOutForDeliveryWarningModal, setShowOutForDeliveryWarningModal] = useState(false);
  const [showMilkDeliveryModal, setShowMilkDeliveryModal] = useState(false);
  const [milkContainerReturned, setMilkContainerReturned] = useState(1);
  const [milkDeliveryNotes, setMilkDeliveryNotes] = useState('');
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

  const MILK_CAN_STATUS_OPTIONS = [
    {
      value: 0,
      label: 'Can Not Returned',
      chipActive: 'bg-red-600 border-red-600',
      badgeWrap: 'bg-red-50 border-red-200',
      badgeText: 'text-red-700',
      dot: '#DC2626',
    },
    {
      value: 1,
      label: 'Can Returned',
      chipActive: 'bg-green-600 border-green-600',
      badgeWrap: 'bg-green-50 border-green-200',
      badgeText: 'text-green-700',
      dot: '#16A34A',
    },
    {
      value: 2,
      label: 'Can Damaged',
      chipActive: 'bg-amber-500 border-amber-500',
      badgeWrap: 'bg-amber-50 border-amber-200',
      badgeText: 'text-amber-700',
      dot: '#D97706',
    },
  ];

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

  const handleMilkDelivery = async (containerReturned = 1, notes = '') => {
    try {
      setLoading(true, 'Marking milk as delivered...');
      const USERDATA = await Storage.getData('DATA');
      const userTransid = USERDATA?.transid || USER;

      const payload = {
        transid: order.productorderid,
        received: 1,
        cans_returned: containerReturned,
        luu: userTransid,
      };

      const response = await API.PUT('DailyMilkStatus', payload);

      Alert.alert('Success', response.message || 'Milk delivered successfully!');

      if (onOrderUpdate) {
        onOrderUpdate();
      }
    } catch (error) {
      log('Error delivering milk:', error);
      Alert.alert('Error', 'Failed to mark milk as delivered');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    if (!newStatus) return;

    const isCanReturnApplicableMilkOrder = Number(order?.isdailymilkuser) === 3;
    if (newStatus === 'Delivered' && isCanReturnApplicableMilkOrder) {
      await handleMilkDelivery(1, '');
      return;
    }

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

  const normalizeOrderItem = (item, index) => {
    const product = item?.product || {};
    const quantity = Number(item?.orderquantity ?? item?.quantity ?? 1) || 1;
    const price = Number(item?.price ?? item?.sellingprice ?? product?.price ?? product?.sellingprice ?? 0) || 0;
    const amount = Number(item?.lineamount ?? item?.amount ?? item?.totalamount);

    return {
      ...item,
      id: item?.id || item?.itemid || item?.productid || item?.variantid || `${order?.productorderid || 'order'}-${index}`,
      productname:
        item?.productname ||
        item?.itemname ||
        item?.name ||
        product?.productname ||
        product?.itemname ||
        product?.name ||
        'Item',
      variantname:
        item?.variantname ||
        item?.mealtypename ||
        item?.categoryname ||
        product?.variantname ||
        product?.unit ||
        product?.categoryname ||
        '',
      orderquantity: quantity,
      price,
      amount: Number.isFinite(amount) ? amount : price * quantity,
      imageurl:
        item?.imageurl ||
        item?.image ||
        product?.imageurl ||
        product?.image ||
        null,
      product: {
        ...product,
        imageurl: product?.imageurl || product?.image || item?.imageurl || item?.image || null,
      },
    };
  };

  const parseOrderData = () => {
    try {
      let parsedOrderData = order?.orderdata;

      if (typeof parsedOrderData === 'string') {
        parsedOrderData = JSON.parse(parsedOrderData);
      }

      if (Array.isArray(parsedOrderData) && parsedOrderData.length > 0) {
        return parsedOrderData.map(normalizeOrderItem);
      }

      const isDailyMilkType = [1, 2, 3].includes(Number(order?.isdailymilkuser));
      if (!isDailyMilkType) return [];

      let milkData = order?.dailymilk_json;
      if (typeof milkData === 'string') {
        milkData = JSON.parse(milkData);
      }

      const milkRows = Array.isArray(milkData) ? milkData : milkData ? [milkData] : [];
      if (milkRows.length === 0) return [];

      return milkRows.map((row, idx) => {
        const regularQty = Number(row?.regular_quantity ?? row?.quantity ?? row?.orderquantity ?? 0) || 0;
        const extraQty = Number(row?.extra_quantity ?? row?.extra ?? 0) || 0;
        const cancelledQty = Number(row?.cancelled_quantity ?? 0) || 0;
        const totalQtyRaw = Number(row?.total_quantity);
        const totalQty = Number.isFinite(totalQtyRaw) ? totalQtyRaw : (regularQty + extraQty);
        const effectiveQty = totalQty > 0 ? totalQty : regularQty;
        const baseAmount = Number(row?.lineamount ?? row?.amount ?? row?.price ?? order?.itemtotal ?? 0) || 0;
        const unitPriceBase = regularQty > 0 ? regularQty : (effectiveQty > 0 ? effectiveQty : 1);
        const unitPrice = baseAmount / unitPriceBase;
        const amount = Number(row?.finalamount ?? row?.totalamount ?? row?.effectiveamount) ||
          (unitPrice * (effectiveQty > 0 ? effectiveQty : unitPriceBase));

        return normalizeOrderItem({
          id: row?.id || row?.transid || `${order?.productorderid || 'milk'}-${idx}`,
          productname: row?.productname || row?.milkname || 'Daily Milk',
          variantname: row?.date
            ? `Date: ${new Date(row.date).toLocaleDateString('en-IN')}`
            : (row?.variantname || 'Milk Order'),
          orderquantity: effectiveQty,
          price: unitPrice,
          amount,
          quantity: regularQty,
          regular_quantity: regularQty,
          extra_quantity: extraQty,
          cancelled_quantity: cancelledQty,
          total_quantity: totalQty,
          imageurl: row?.imageurl || null,
        }, idx);
      });
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
    const explicitAmount = Number(item?.lineamount ?? item?.amount);
    if (Number.isFinite(explicitAmount) && explicitAmount >= 0) return explicitAmount;
    const price = Number(item.price || 0);
    const quantity = Number(item.orderquantity || 1);
    return price * quantity;
  };

  const getMilkBreakdown = (item) => {
    const regular = Number(item?.regular_quantity ?? item?.quantity ?? 0) || 0;
    const extra = Number(item?.extra_quantity ?? item?.extra ?? 0) || 0;
    const cancelled = Number(item?.cancelled_quantity ?? 0) || 0;
    const totalRaw = Number(item?.total_quantity);
    const total = Number.isFinite(totalRaw) ? totalRaw : (regular + extra);
    return { regular, extra, cancelled, total };
  };

  const isDateWithinRange = (startDate, endDate) => {
    if (!startDate || !endDate) return false;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return today >= start && today <= end;
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
    const isCanReturnApplicableMilkOrder = Number(order?.isdailymilkuser) === 3;
    const isFastDeliveryOrder = Number(order?.isdailymilkuser) === 0;
    const onStatusPress = () => {
      if (nextStatus === 'Delivered' && isCanReturnApplicableMilkOrder) {
        setMilkContainerReturned(1);
        setMilkDeliveryNotes('');
        setShowMilkDeliveryModal(true);
        return;
      }

      if (nextStatus === 'Out for Delivery' && isFastDeliveryOrder) {
        setShowOutForDeliveryWarningModal(true);
        return;
      }

      updateOrderStatus(nextStatus);
    };

    return (
      <View className="mt-2">
        <View className="flex-row">
          {buttonConfig && (
            <TouchableOpacity
              onPress={onStatusPress}
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
      bgColor: '#fdf2f8',
      textColor: '#be185d',
      borderColor: '#fbcfe8',
      icon: 'silverware-fork-knife',
      label: 'Kitchen Order',
    },
    'Milk': {
      bgColor: '#fef3c7',
      textColor: '#92400e',
      borderColor: '#fde68a',
      icon: 'cup',
      label: 'Milk Order',
    }
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

  
  let type = '';

  switch (Number(order?.isdailymilkuser)) {
    case 1:
      type = 'Daily Milk';
      break;
    case 0:
      type = 'Fast Grocery Delivery';
      break;
    case 2:
      type = 'Demo Daily Milk';
      break;
    case 3:
      type = 'Milk'; // Pure Daily Milk
      break;
    case 4:
      type = 'Food Delivery';
      break;
    default:
      type = 'Unknown';
  }

  const style = getOrderColor(type);
  const statusStyle = getStatusStyle();
  const isMilkTypeOrder = [1, 2, 3].includes(Number(order?.isdailymilkuser || 0));
  const isKitchenTypeOrder =
    Number(order?.isdailymilkuser || 0) === 4 ||
    String(order?.order_type || order?.ordertype || '').toLowerCase() === 'kitchen_order';
  const pregnancyBenefitMl = Number(
    order?.milkamountml ??
    order?.pregnancy_milkamountml ??
    order?.pregnancymilkamountml ??
    250
  ) || 250;
  const pregnancyBenefitLitres = pregnancyBenefitMl / 1000;
  const pregnancyStatusActive =
    Number(order?.pregnancy_status ?? order?.pregnancystatus ?? 0) === 1 ||
    Number(order?.isbenefitsactive ?? 0) === 1 ||
    order?.isbenefitsactive === true ||
    isDateWithinRange(order?.benefitsstartdate, order?.benefitsenddate) ||
    orderItems.some(
      (item) =>
        Number(item?.pregnancy_status ?? item?.pregnancystatus ?? 0) === 1 ||
        Number(item?.isbenefitsactive ?? 0) === 1 ||
        item?.isbenefitsactive === true
    );
  const computedItemSubtotal = orderItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const itemSubtotal = isMilkTypeOrder && computedItemSubtotal > 0
    ? computedItemSubtotal
    : Number(order?.itemtotal || 0);
  const explicitOrderTotal = Number(order?.totalamount);
  const totalAmount = Number.isFinite(explicitOrderTotal) && explicitOrderTotal > 0
    ? explicitOrderTotal
    : Number(itemSubtotal || 0) + Number(order?.deliverycharge || 0) + Number(order?.tax || 0);

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
        accountholdername: refundBankHolderName.trim() || null,
        bankname: refundBankName.trim() || null,
        accountnumber: refundAccountNumber.trim() || null,
        bankaccountnumber: refundAccountNumber.trim() || null,
        ifsccode: refundIfscCode.trim() || null,
        ifsc: refundIfscCode.trim() || null,
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

              {/* {hasNewUpdates && (
                <View className="ml-2 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                  <Text className="text-[10px] font-bold text-red-600">NEW UPDATE</Text>
                </View>
              )} */}
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

              {pregnancyStatusActive && isMilkTypeOrder ? (
                <View className="bg-pink-50 border border-pink-200 px-2 py-[3px] rounded-full flex-row items-center">
                  <Text className="text-[10px] font-bold text-pink-700">Pregnancy Care</Text>
                </View>
              ) : null}
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
          {pregnancyStatusActive && isMilkTypeOrder ? (
            <Text className="text-[11px] text-amber-700 mt-1 font-semibold" numberOfLines={1}>
              Complimentary +{pregnancyBenefitMl}ml pregnancy milk active
            </Text>
          ) : null}
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

                {pregnancyStatusActive && isMilkTypeOrder ? (
                  <View className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 mb-3">
                    <Text className="text-xs font-semibold text-amber-900">
                      Pregnancy Care Active
                    </Text>
                    <Text className="text-[11px] text-amber-800 mt-1">
                      Add complimentary +{pregnancyBenefitMl}ml ({pregnancyBenefitLitres.toFixed(2)}L) milk for this active order.
                    </Text>
                  </View>
                ) : null}

                {orderItems.map((item, index) => {
                  const itemTotal = calculateItemTotal(item);
                  const milkBreakdown = getMilkBreakdown(item);
                  const effectivePregnancyExtra =
                    pregnancyStatusActive && [1, 3].includes(Number(order?.isdailymilkuser || 0))
                      ? pregnancyBenefitLitres
                      : 0;
                  const finalQtyWithPregnancy = Number(
                    (milkBreakdown.total + effectivePregnancyExtra).toFixed(2)
                  );
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
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />

                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                          {item.productname}
                        </Text>

                        {item.variantname ? (
                          <Text className="text-xs text-gray-500 mt-0.5">
                            {isKitchenTypeOrder ? 'Details' : 'Variant'}: {item.variantname}
                          </Text>
                        ) : null}

                        <View className="flex-row justify-between items-center mt-2">
                          <Text className="text-xs text-gray-500">
                            ₹{item.price} × {item.orderquantity}
                          </Text>
                          <Text className="text-sm font-bold text-gray-900">₹{itemTotal}</Text>
                        </View>

                        {[1, 2, 3].includes(Number(order?.isdailymilkuser || 0)) ? (
                          <View className="flex-row flex-wrap mt-2">
                            {milkBreakdown.regular > 0 ? (
                              <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-1.5 mb-1">
                                <Text className="text-[10px] font-semibold text-blue-700">
                                  Regular {milkBreakdown.regular}L
                                </Text>
                              </View>
                            ) : null}
                            {milkBreakdown.extra > 0 ? (
                              <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mr-1.5 mb-1">
                                <Text className="text-[10px] font-semibold text-amber-700">
                                  Extra {milkBreakdown.extra}L
                                </Text>
                              </View>
                            ) : null}
                            {effectivePregnancyExtra > 0 ? (
                              <View className="bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full mr-1.5 mb-1">
                                <Text className="text-[10px] font-semibold text-pink-700">
                                  Pregnancy +{effectivePregnancyExtra.toFixed(2)}L
                                </Text>
                              </View>
                            ) : null}
                            {milkBreakdown.cancelled > 0 ? (
                              <View className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-full mr-1.5 mb-1">
                                <Text className="text-[10px] font-semibold text-red-700">
                                  Cancelled {milkBreakdown.cancelled}L
                                </Text>
                              </View>
                            ) : null}
                            {finalQtyWithPregnancy >= 0 ? (
                              <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mb-1">
                                <Text className="text-[10px] font-semibold text-emerald-700">
                                  Final {finalQtyWithPregnancy}L
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="mt-4 bg-white p-4 rounded-2xl border border-gray-200">
                <Text className="text-sm font-bold text-gray-800 mb-3">Price Details</Text>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Item Total</Text>
                  <Text className="text-sm font-medium text-gray-800">₹{itemSubtotal || 0}</Text>
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

      <Modal
        visible={showOutForDeliveryWarningModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOutForDeliveryWarningModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/40 p-4">
          <View className="bg-white w-full max-w-md rounded-3xl p-5">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center">
                <Icon name="alert-outline" size={22} color="#D97706" />
              </View>
              <Text className="text-lg font-extrabold text-gray-900 ml-3">Confirm Out for Delivery</Text>
            </View>

            <Text className="text-sm text-gray-700 leading-5 mb-4">
              This Fast Delivery order will be assigned to you once you mark it as Out for Delivery.
            </Text>

            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-5">
              <Text className="text-xs text-amber-800 leading-5">
                After confirmation, other partners will not see this order and cannot deliver it. Only you can complete delivery.
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setShowOutForDeliveryWarningModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-2xl mr-2"
                activeOpacity={0.85}
              >
                <Text className="text-gray-800 font-semibold text-center">Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setShowOutForDeliveryWarningModal(false);
                  await updateOrderStatus('Out for Delivery');
                }}
                className="flex-1 bg-amber-600 py-3 rounded-2xl ml-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-center">Yes, Assign to Me</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMilkDeliveryModal} transparent animationType="slide" onRequestClose={() => setShowMilkDeliveryModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/40 p-4">
          <View className="bg-white w-full max-w-md rounded-3xl p-5">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center">
                <Icon name="check-circle-outline" size={22} color="#16A34A" />
              </View>
              <Text className="text-lg font-extrabold text-gray-900 ml-3">Milk Delivery</Text>
            </View>

            <Text className="text-sm text-gray-600 mb-3 leading-5">
              Select container return status before marking this milk order as delivered.
            </Text>

            <Text className="text-sm font-semibold text-gray-700 mb-2">Cans Returned</Text>
            <View className="flex-row flex-wrap mb-4">
              {MILK_CAN_STATUS_OPTIONS.map((option) => {
                const active = milkContainerReturned === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setMilkContainerReturned(option.value)}
                    className={`mr-2 mb-2 px-3 py-2 rounded-full border flex-row items-center ${active ? option.chipActive : 'bg-white border-gray-300'}`}
                    activeOpacity={0.85}
                  >
                    <View
                      className="w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: active ? '#FFFFFF' : option.dot }}
                    />
                    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* <View className="flex-row flex-wrap mb-4">
              {MILK_CAN_STATUS_OPTIONS.map((option) => (
                <View key={`badge-${option.value}`} className={`mr-2 mb-2 px-2.5 py-1 rounded-full border flex-row items-center ${option.badgeWrap}`}>
                  <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: option.dot }} />
                  <Text className={`text-[10px] font-semibold ${option.badgeText}`}>{option.label}</Text>
                </View>
              ))}
            </View> */}

            <Text className="text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</Text>
            <TextInput
              value={milkDeliveryNotes}
              onChangeText={setMilkDeliveryNotes}
              placeholder="Add note for this delivery"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="border border-gray-300 rounded-2xl p-3 text-gray-800 mb-5 bg-gray-50"
            />

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setShowMilkDeliveryModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-2xl mr-2"
                activeOpacity={0.85}
              >
                <Text className="text-gray-800 font-semibold text-center">Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await handleMilkDelivery(milkContainerReturned, milkDeliveryNotes);
                  setShowMilkDeliveryModal(false);
                }}
                className="flex-1 bg-green-600 py-3 rounded-2xl ml-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-center">Mark Delivered</Text>
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
            className={`flex-row items-center justify-center bg-gray-50 rounded-xl py-2 ${isReturnEligible ? 'flex-1 mr-2' : 'w-full'
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

      <Modal visible={showReturnModal} transparent animationType="slide" onRequestClose={() => setShowReturnModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-center items-center bg-black/40 p-4">
            <View style={{ width: '100%', maxWidth: 520, maxHeight: '92%' }} className="bg-white rounded-3xl overflow-hidden">
              <View className="px-5 pt-5 pb-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center">
                    <Icon name="backup-restore" size={22} color="#C2410C" />
                  </View>
                  <Text className="text-lg font-extrabold text-gray-900 ml-3">Return Order</Text>
                </View>

                <Text className="text-sm text-gray-600 mt-2">
                  Select the products you want to return from this order.
                </Text>
              </View>

              <ScrollView
                style={{ maxHeight: RETURN_MODAL_BODY_MAX_HEIGHT }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {orderItems.length === 0 ? (
                  <View className="border border-gray-200 rounded-xl p-4 bg-gray-50 mb-2">
                    <Text className="text-xs text-gray-600">No returnable items available for this order.</Text>
                  </View>
                ) : (
                  orderItems.map((item, index) => {
                    const checked = !!returnSelections[index];
                    return (
                      <TouchableOpacity
                        key={`${item?.productid || item?.variantid || 'item'}-${index}`}
                        className={`flex-row items-center p-3 rounded-xl border mb-2 ${checked ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
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
                  })
                )}

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
                          className={`mr-2 px-3 py-1.5 rounded-full border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
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
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default OrderCard;
