import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import Storage from '../../App_Utils/Services/StorageService';
import OrderCard from '../Components_New/OrdersCard';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

const DATE_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All' },
];

const ORDER_PAGE_SIZE = 10;

const parseTimestamp = (value) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;

  const text = String(value).trim();
  const direct = Date.parse(text);
  if (!Number.isNaN(direct)) return direct;

  const match = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (match) {
    const dd = Number(match[1]);
    const mm = Number(match[2]) - 1;
    const yy = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const hh = Number(match[4] || 0);
    const mi = Number(match[5] || 0);
    const ss = Number(match[6] || 0);
    return new Date(yy, mm, dd, hh, mi, ss).getTime();
  }

  return 0;
};

const getOrderTimestamp = (item) => {
  // Strictly use order-created timestamps, not delivery/completion dates.
  const candidates = [
    item?.orderplacedtime,
    item?.orderpalcedtime, // backend typo seen in API response
    item?.order_placed_time,
    item?.orderplacedat,
    item?.ordertime,
    item?.createdat,
    item?.created_at,
    item?.rcm,
    item?.rcd,
    item?.orderdate,
  ];

  for (const value of candidates) {
    const ts = parseTimestamp(value);
    if (Number.isFinite(ts) && ts > 0) return ts;
  }

  return 0;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const applyDateFilterWithResolver = (list, filterKey, tsResolver) => {
  if (filterKey === 'all') return list;

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  return list.filter((item) => {
    const ts = tsResolver(item);
    if (!Number.isFinite(ts) || ts <= 0) return false;

    if (filterKey === 'today') {
      return ts >= todayStart && ts < tomorrowStart;
    }

    if (filterKey === 'yesterday') {
      return ts >= yesterdayStart && ts < todayStart;
    }

    const d = new Date(ts);

    if (filterKey === 'week') {
      // Rolling 7-day window based on order date.
      const rollingWeekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
      return ts >= rollingWeekStart && ts < tomorrowStart;
    }

    if (filterKey === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    if (filterKey === 'year') {
      return d.getFullYear() === now.getFullYear();
    }

    return true;
  });
};

const applyDateFilter = (list, filterKey) =>
  applyDateFilterWithResolver(list, filterKey, getOrderTimestamp);

const getOrderTypeCode = (order) => Number(order?.isdailymilkuser);

const isFastDeliveryOrder = (order) => getOrderTypeCode(order) === 0;

const isDailyMilkOrder = (order) => [1, 2, 3].includes(getOrderTypeCode(order));

const isKitchenOrder = (order) =>
  getOrderTypeCode(order) === 4 ||
  String(order?.order_type || "").toLowerCase() === "kitchen_order" ||
  String(order?.ordertype || "").toLowerCase() === "kitchen_order";

const hasOrdersForType = (list, type) => {
  if (!Array.isArray(list) || list.length === 0) return false;
  if (type === 'fast') return list.some(isFastDeliveryOrder);
  if (type === 'dailymilk') return list.some(isDailyMilkOrder);
  if (type === 'kitchen') return list.some(isKitchenOrder);
  return list.length > 0;
};

const getReturnTimestamp = (item) => {
  const candidates = [
    item?.requestedtime,
    item?.rcm,
    item?.lum,
    item?.approvedtime,
    item?.rejectedtime,
    item?.pickuptime,
    item?.refundedtime,
    item?.closedtime,
  ];

  for (const value of candidates) {
    const ts = parseTimestamp(value);
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  return 0;
};

const formatNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

const formatDateTime = (value) => {
  const ts = parseTimestamp(value);
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
};

const MyOrdersScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { setLoading: setGlobalLoading } = useLoading();
  const log = createLogger('MyOrdersScreen');

  const allorder = route.params?.allorder ?? false;
  const ordertype = route.params?.ordertype ?? 'all';

  const [isallorders] = useState(allorder);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('My Orders');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleOrderLimit, setVisibleOrderLimit] = useState(ORDER_PAGE_SIZE);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [returnOrders, setReturnOrders] = useState([]);
  const [isReturnServiceUnavailable, setIsReturnServiceUnavailable] = useState(false);
  const [returnDetailsVisible, setReturnDetailsVisible] = useState(false);
  const [returnDetailsLoading, setReturnDetailsLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [selectedReturnDetail, setSelectedReturnDetail] = useState({
    Header: null,
    Details: [],
    StatusHistory: [],
    Refund: null,
  });

  const getScreenTitle = () => {

   if (ordertype === 'fast') return 'Fast Delivery Orders';
    if (ordertype === 'dailymilk') return 'Daily Milk Orders';
    if (ordertype === 'kitchen') return 'Kitchen Orders';
    if (isallorders) return 'All Orders';

    return 'My Orders';
  };

  const getCacheKey = async () => {
    try {
      const userData = await Storage.getData('DATA');
      const userId = userData?.transid || 'anonymous';
      return isallorders
        ? `MY_ORDERS_CACHE_ALL_${ordertype}`
        : `MY_ORDERS_CACHE_${userId}_${ordertype}`;
    } catch {
      return isallorders
        ? `MY_ORDERS_CACHE_ALL_${ordertype}`
        : `MY_ORDERS_CACHE_FALLBACK_${ordertype}`;
    }
  };

  const loadOrdersFromCache = async () => {
    try {
      const key = await getCacheKey();
      const cached = await Storage.getData(key);
      const cachedOrders = Array.isArray(cached?.orders) ? cached.orders : [];
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        return cachedOrders;
      }
    } catch (error) {
      log('Cache load error:', error);
    }
    return [];
  };

  const getReturnCacheKey = async () => {
    try {
      const userData = await Storage.getData('DATA');
      const userId = userData?.transid || 'anonymous';
      return `MY_RETURN_ORDERS_CACHE_${userId}`;
    } catch {
      return 'MY_RETURN_ORDERS_CACHE_FALLBACK';
    }
  };

  const loadReturnsFromCache = async () => {
    try {
      const key = await getReturnCacheKey();
      const cached = await Storage.getData(key);
      const cachedReturns = Array.isArray(cached?.returns) ? cached.returns : [];
      if (cachedReturns.length > 0) {
        setReturnOrders(cachedReturns);
      }
    } catch (error) {
      log('Return cache load error:', error);
    }
  };

  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
        setGlobalLoading(true, 'Fetching orders...');
      }

      const userData = await Storage.getData('DATA');
      const userId = userData?.transid;

      let endpoint = 'ProductOrder/all-combined';
      if (!isallorders) {
        endpoint = `ProductOrder/all-combined/user/${userId}`;
      }

      const res = await API.GET(endpoint);
      const response = Array.isArray(res?.Response) ? res.Response : [];

      setTitle(getScreenTitle());
      setOrders(response);
      // console.log('Fetched orders:', response);

      try {
        const key = await getCacheKey();
        await Storage.storeData(key, {
          orders: response,
          updatedAt: new Date().toISOString(),
        });
      } catch (cacheError) {
        log('Cache save error:', cacheError);
      }
    } catch (error) {
      log('Error fetching orders:', error);
      if (orders.length === 0) {
        Alert.alert('Error', 'Failed to load orders');
      }
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const fetchReturnOrders = async () => {
    if (isallorders || isReturnServiceUnavailable) return;
    try {
      const userData = await Storage.getData('DATA');
      const userId = userData?.transid;
      if (!userId) return;

      const payload = {
        status: null,
        fromDate: null,
        toDate: null,
        page: 1,
        pageSize: 200,
      };

      let res = null;
      try {
        res = await API.PUT(`ProductReturn/user/${userId}`, payload);
      } catch {
        res = await API.GET(`ProductReturn/user/${userId}`);
      }

      const response = Array.isArray(res?.Response) ? res.Response : [];
      setReturnOrders(response);
      if (isReturnServiceUnavailable) setIsReturnServiceUnavailable(false);

      try {
        const key = await getReturnCacheKey();
        await Storage.storeData(key, {
          returns: response,
          updatedAt: new Date().toISOString(),
        });
      } catch (cacheError) {
        log('Return cache save error:', cacheError);
      }
    } catch (error) {
      log('Error fetching return orders:', error);
      const msg = String(error?.message || '').toLowerCase();
      if (
        msg.includes('non-json response') ||
        msg.includes('unexpected character') ||
        msg.includes('<html') ||
        msg.includes('<!doctype')
      ) {
        setIsReturnServiceUnavailable(true);
      }
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setTitle(getScreenTitle());
      const [cachedOrders] = await Promise.all([loadOrdersFromCache(), loadReturnsFromCache()]);
      setCacheLoaded(true);
      setLoading(!hasOrdersForType(cachedOrders, ordertype));
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!cacheLoaded) return;
    fetchOrders(!hasOrdersForType(orders, ordertype));
    fetchReturnOrders();
  }, [cacheLoaded]);

  useEffect(() => {
    setVisibleOrderLimit(ORDER_PAGE_SIZE);
  }, [ordertype, selectedDateFilter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchOrders(false), fetchReturnOrders()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOrderUpdate = () => {
    fetchOrders(false);
    fetchReturnOrders();
  };

  const handleStartShopping = () => {
    try {
      navigation.navigate('Main', { screen: 'Home' });
    } catch {
      try {
        navigation.navigate('Main');
      } catch {
        Alert.alert('Navigation Error', 'Unable to open Home right now.');
      }
    }
  };

  const openReturnDetails = async (item) => {
    if (!item?.returnid) return;
    setSelectedReturn(item);
    setReturnDetailsVisible(true);
    setReturnDetailsLoading(true);
    try {
      let res = null;
      try {
        res = await API.PUT('ProductReturn/detail', { returnid: item.returnid });
      } catch {
        res = await API.GET(`ProductReturn/${item.returnid}`);
      }

      setSelectedReturnDetail({
        Header: res?.Header || null,
        Details: Array.isArray(res?.Details) ? res.Details : [],
        StatusHistory: Array.isArray(res?.StatusHistory) ? res.StatusHistory : [],
        Refund: res?.Refund || null,
      });
    } catch (error) {
      log('Error fetching return details:', error);
      Alert.alert('Error', 'Failed to load return details.');
    } finally {
      setReturnDetailsLoading(false);
    }
  };

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = orders;

    if (ordertype === 'fast') {
      filtered = filtered.filter(isFastDeliveryOrder);
    } else if (ordertype === 'dailymilk') {
      filtered = filtered.filter(isDailyMilkOrder);
    } else if (ordertype === 'kitchen') {
      filtered = filtered.filter(isKitchenOrder);
    }

    filtered = applyDateFilter(filtered, selectedDateFilter);

    if (query) {
      filtered = filtered.filter((item) => {
        const orderId = String(item?.productorderid || item?.orderid || '').toLowerCase();
        const status = String(item?.orderstatus || '').toLowerCase();
        const customer = String(item?.name || item?.username || '').toLowerCase();
        const product = String(item?.productname || item?.product || '').toLowerCase();

        return (
          orderId.includes(query) ||
          status.includes(query) ||
          customer.includes(query) ||
          product.includes(query)
        );
      });
    }

    return [...filtered].sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
  }, [orders, ordertype, searchQuery, selectedDateFilter]);

  const summary = useMemo(() => {
    const totalOrders = visibleOrders.length;

    const totalLitres = visibleOrders.reduce((sum, item) => {
      return sum + formatNumber(item?.quantity);
    }, 0);

    const totalAmount = visibleOrders.reduce((sum, item) => {
      return sum + formatNumber(item?.totalamount || item?.amount || item?.price);
    }, 0);

    return {
      totalOrders,
      totalLitres,
      totalAmount,
    };
  }, [visibleOrders]);

  const displayedOrders = useMemo(
    () => visibleOrders.slice(0, visibleOrderLimit),
    [visibleOrders, visibleOrderLimit]
  );

  const hasMoreOrders = displayedOrders.length < visibleOrders.length;

  const handleLoadMoreOrders = () => {
    setVisibleOrderLimit((current) => current + ORDER_PAGE_SIZE);
  };

  const visibleReturnOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = applyDateFilterWithResolver(returnOrders, selectedDateFilter, getReturnTimestamp);

    if (query) {
      filtered = filtered.filter((item) => {
        const returnNumber = String(item?.returnnumber || item?.returnid || '').toLowerCase();
        const sourceOrder = String(item?.productorderid || '').toLowerCase();
        const status = String(item?.returnstatus || '').toLowerCase();
        return returnNumber.includes(query) || sourceOrder.includes(query) || status.includes(query);
      });
    }

    return [...filtered].sort((a, b) => getReturnTimestamp(b) - getReturnTimestamp(a));
  }, [returnOrders, searchQuery, selectedDateFilter]);

  const renderEmptyStateMessage = () => {
    if (searchQuery.trim()) {
      return {
        title: 'No Matching Orders',
        subtitle: 'Try another order ID, product name, customer, or status.',
      };
    }

    if (ordertype === 'fast') {
      return {
        title: 'No Fast Delivery Orders',
        subtitle: 'No fast delivery orders found for the selected period.',
      };
    }

    if (ordertype === 'dailymilk') {
      return {
        title: 'No Daily Milk Orders',
        subtitle: 'No daily milk orders found for the selected period.',
      };
    }

    if (ordertype === 'kitchen') {
      return {
        title: 'No Kitchen Orders',
        subtitle: 'No Dear Kitchen orders found for the selected period.',
      };
    }

    return {
      title: 'No Orders Found',
      subtitle: 'No orders are available for the selected period.',
    };
  };

  const emptyState = renderEmptyStateMessage();
  const detailHeader = selectedReturnDetail?.Header || selectedReturn;
  const rawTimeline = Array.isArray(selectedReturnDetail?.StatusHistory)
    ? selectedReturnDetail.StatusHistory
    : [];
  const timeline = [...rawTimeline].sort(
    (a, b) => parseTimestamp(a?.changedtime) - parseTimestamp(b?.changedtime)
  );

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-600 mt-4 font-medium">Loading orders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="bg-white px-3 pt-2 pb-2 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center"
          >
            <Icon name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>

          <View className="flex-1 px-3">
            <Text className="text-base font-bold text-gray-900 text-center">{title}</Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center"
          >
            <Icon
              name="refresh"
              size={20}
              color={refreshing ? '#9CA3AF' : '#2563EB'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-3 pt-2 bg-gray-100">
        <Animated.View
          entering={SlideInDown.duration(250)}
          className="bg-white rounded-2xl p-2.5 border border-gray-200"
        >
          <View className="flex-row items-center bg-gray-100 rounded-xl px-2.5 py-1.5 border border-gray-200">
            <Icon name="search" size={16} color="#6B7280" />
            <TextInput
              placeholder="Search order ID, product, customer, status..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-gray-900 ml-1.5 text-xs"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={14} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2"
            contentContainerStyle={{ paddingRight: 8 }}
          >
            {DATE_FILTERS.map((item) => {
              const isActive = selectedDateFilter === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setSelectedDateFilter(item.key)}
                  activeOpacity={0.85}
                  className={`mr-2 px-2.5 py-1 rounded-full border ${isActive
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300'
                    }`}
                >
                  <Text
                    className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-gray-700'
                      }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="mt-1.5 px-0.5">
            <Text className="text-[11px] text-gray-600">
              {summary.totalOrders} orders • {summary.totalLitres} L • ₹{summary.totalAmount}
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.ScrollView
        className="flex-1 px-3 pt-2 bg-gray-100"
        entering={FadeIn.duration(250)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!isallorders ? (
          <View className="mb-2 bg-white rounded-2xl border border-gray-200 p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-gray-900">Returned Orders</Text>
              <View className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                <Text className="text-[10px] font-bold text-orange-700">
                  {visibleReturnOrders.length}
                </Text>
              </View>
            </View>

            {visibleReturnOrders.length === 0 ? (
              <Text className="text-xs text-gray-500 mt-2">
                {isReturnServiceUnavailable
                  ? 'Return service is currently unavailable.'
                  : 'No return requests yet.'}
              </Text>
            ) : (
              <View className="mt-2">
                {visibleReturnOrders.map((item, idx) => (
                  <TouchableOpacity
                    key={item?.returnid || `${item?.returnnumber || 'RET'}-${idx}`}
                    activeOpacity={0.85}
                    onPress={() => openReturnDetails(item)}
                    className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 mb-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-bold text-gray-900">
                        {item?.returnnumber || item?.returnid || 'Return'}
                      </Text>
                      <View className="px-2 py-0.5 rounded-full bg-white border border-orange-200">
                        <Text className="text-[10px] font-semibold text-orange-700">
                          {item?.returnstatus || 'Requested'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-gray-600 mt-1">
                      Order: {item?.productorderid || 'N/A'}
                    </Text>
                    <Text className="text-[11px] text-gray-600 mt-0.5">
                      {formatDateTime(item?.requestedtime || item?.rcm)} • Qty {formatNumber(item?.totalreturnqty)} • ₹{formatNumber(item?.totalreturnamount)}
                    </Text>
                    <View className="flex-row items-center justify-end mt-1">
                      <Text className="text-[10px] text-orange-700 font-semibold mr-0.5">
                        View Timeline
                      </Text>
                      <Icon name="chevron-right" size={14} color="#C2410C" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {visibleOrders.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(100)}
            className="items-center justify-center mt-12 py-10"
          >
            <View className="bg-white p-6 rounded-full border border-gray-200">
              <Icon name="inventory-2" size={46} color="#9CA3AF" />
            </View>

            <Text className="text-gray-800 text-lg mt-6 font-bold">
              {emptyState.title}
            </Text>

            <Text className="text-gray-500 mt-2 text-center px-6 leading-5">
              {emptyState.subtitle}
            </Text>

            {!isallorders && (
              <TouchableOpacity
                onPress={handleStartShopping}
                className="bg-blue-600 px-6 py-3 rounded-full mt-6"
              >
                <Text className="text-white font-semibold">Start Shopping</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          <View className="pb-4">
            {displayedOrders.map((order, index) => (
              <Animated.View
                key={order.productorderid + index || order.orderid + index || index}
                entering={FadeIn.delay(index * 60)}
                className="mb-2"
              >
                <OrderCard
                  order={order}
                  onOrderUpdate={handleOrderUpdate}
                  enableReturnOrder={!isallorders}
                  onReturnCreated={fetchReturnOrders}
                />
              </Animated.View>
            ))}

            {hasMoreOrders ? (
              <TouchableOpacity
                onPress={handleLoadMoreOrders}
                activeOpacity={0.85}
                className="mt-2 mb-4 bg-white border border-blue-200 rounded-2xl py-3 px-4 flex-row items-center justify-center"
              >
                <Icon name="expand-more" size={20} color="#2563EB" />
                <Text className="text-blue-700 font-bold ml-1">
                  Load More
                </Text>
                <Text className="text-gray-500 text-xs ml-2">
                  {displayedOrders.length}/{visibleOrders.length}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </Animated.ScrollView>

      <Modal visible={returnDetailsVisible} animationType="slide" onRequestClose={() => setReturnDetailsVisible(false)}>
        <View className="flex-1 bg-gray-100">
          <View className="bg-white px-3 pt-2 pb-2 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setReturnDetailsVisible(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center"
              >
                <Icon name="arrow-back" size={20} color="#111827" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">Return Details</Text>
              <View className="w-9 h-9" />
            </View>
          </View>

          <ScrollView className="flex-1 p-3">
            {returnDetailsLoading ? (
              <View className="bg-white rounded-2xl border border-gray-200 p-5 items-center">
                <ActivityIndicator size="small" color="#2563EB" />
                <Text className="text-xs text-gray-500 mt-2">Loading return details...</Text>
              </View>
            ) : (
              <>
                <View className="bg-white rounded-2xl border border-gray-200 p-3">
                  <Text className="text-xs text-gray-500">Return Number</Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {detailHeader?.returnnumber || detailHeader?.returnid || 'N/A'}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-2">Order</Text>
                  <Text className="text-sm font-semibold text-gray-800">
                    {detailHeader?.productorderid || 'N/A'}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-2">Current Status</Text>
                  <Text className="text-sm font-bold text-orange-700">
                    {detailHeader?.returnstatus || 'Requested'}
                  </Text>
                </View>

                <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
                  <Text className="text-sm font-bold text-gray-900 mb-2">Items</Text>
                  {selectedReturnDetail?.Details?.length ? (
                    selectedReturnDetail.Details.map((d, i) => (
                      <View key={d?.returndetailid || i} className="py-2 border-b border-gray-100">
                        <Text className="text-xs font-semibold text-gray-900">{d?.productname || 'Product'}</Text>
                        <Text className="text-[11px] text-gray-600">
                          Qty {formatNumber(d?.returnqty)} • ₹{formatNumber(d?.lineamount)} • {d?.itemstatus || 'Requested'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-gray-500">No line items available.</Text>
                  )}
                </View>

                <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
                  <Text className="text-sm font-bold text-gray-900 mb-2">Refund Preference</Text>
                  <Text className="text-[11px] text-gray-600">
                    Method: {selectedReturnDetail?.Refund?.refundmethod || 'Not provided'}
                  </Text>
                  <Text className="text-[11px] text-gray-600 mt-1">
                    Amount: ₹{formatNumber(selectedReturnDetail?.Refund?.refundamount || detailHeader?.totalreturnamount)}
                  </Text>
                  {selectedReturnDetail?.Refund?.upiid ? (
                    <Text className="text-[11px] text-gray-600 mt-1">
                      UPI: {selectedReturnDetail.Refund.upiid}
                    </Text>
                  ) : null}
                  {selectedReturnDetail?.Refund?.bankholdername ? (
                    <Text className="text-[11px] text-gray-600 mt-1">
                      Holder: {selectedReturnDetail.Refund.bankholdername}
                    </Text>
                  ) : null}
                  {selectedReturnDetail?.Refund?.bankname ? (
                    <Text className="text-[11px] text-gray-600 mt-1">
                      Bank: {selectedReturnDetail.Refund.bankname}
                    </Text>
                  ) : null}
                  {selectedReturnDetail?.Refund?.accountnumber ? (
                    <Text className="text-[11px] text-gray-600 mt-1">
                      A/C: {selectedReturnDetail.Refund.accountnumber}
                    </Text>
                  ) : null}
                  {selectedReturnDetail?.Refund?.ifsccode ? (
                    <Text className="text-[11px] text-gray-600 mt-1">
                      IFSC: {selectedReturnDetail.Refund.ifsccode}
                    </Text>
                  ) : null}
                </View>

                <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
                  <Text className="text-sm font-bold text-gray-900 mb-2">Timeline</Text>
                  {timeline.length ? (
                    timeline.map((entry, idx) => (
                      <View key={entry?.returnstatusid || `${entry?.newstatus || 'status'}-${idx}`} className="flex-row mb-2">
                        <View className="items-center mr-2.5">
                          <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                          {idx !== timeline.length - 1 ? <View className="w-0.5 flex-1 bg-blue-200 mt-1" /> : null}
                        </View>
                        <View className="flex-1 pb-1">
                          <Text className="text-xs font-semibold text-gray-900">
                            {entry?.newstatus || 'Status Updated'}
                          </Text>
                          <Text className="text-[11px] text-gray-600 mt-0.5">
                            {formatDateTime(entry?.changedtime)}
                          </Text>
                          {entry?.changedby ? (
                            <Text className="text-[11px] text-gray-600 mt-0.5">
                              By: {entry.changedby}
                            </Text>
                          ) : null}
                          {entry?.remarks ? (
                            <Text className="text-[11px] text-gray-600 mt-0.5">
                              {entry.remarks}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-gray-500">
                      No timeline updates yet.
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default MyOrdersScreen;
