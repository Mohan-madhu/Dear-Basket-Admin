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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import Storage from '../../App_Utils/Services/StorageService';
import OrderCard from '../Components_New/OrdersCard';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

const DATE_FILTERS = [
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'yesterday', label: 'Yesterday', icon: 'history' },
  { key: 'week', label: 'This Week', icon: 'date-range' },
  { key: 'month', label: 'This Month', icon: 'calendar-month' },
  { key: 'year', label: 'This Year', icon: 'event-note' },
  { key: 'all', label: 'All', icon: 'list-alt' },
];

const parseTimestamp = (value) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;

  const text = String(value).trim();
  const direct = Date.parse(text);
  if (!Number.isNaN(direct)) return direct;

  // Handles "dd/mm/yyyy" or "dd-mm-yyyy" optionally with time.
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

const getOrderTimestamp = (item) =>
  parseTimestamp(item?.orderplacedtime || item?.rcd || item?.orderdate);

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const applyDateFilter = (list, filterKey) => {
  if (filterKey === 'all') return list;

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  return list.filter((item) => {
    const ts = getOrderTimestamp(item);
    if (!Number.isFinite(ts) || ts <= 0) return false;

    if (filterKey === 'today') {
      return ts >= todayStart && ts < tomorrowStart;
    }

    if (filterKey === 'yesterday') {
      return ts >= yesterdayStart && ts < todayStart;
    }

    const d = new Date(ts);
    if (filterKey === 'week') {
      const weekStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()));
      return ts >= weekStart && ts < tomorrowStart;
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
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const getScreenTitle = () => {
    if (isallorders) return 'All Orders';
    if (ordertype === 'fast') return 'Fast Delivery Orders';
    if (ordertype === 'dailymilk') return 'Daily Milk Orders';
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
      return isallorders ? `MY_ORDERS_CACHE_ALL_${ordertype}` : `MY_ORDERS_CACHE_FALLBACK_${ordertype}`;
    }
  };

  const loadOrdersFromCache = async () => {
    try {
      const key = await getCacheKey();
      const cached = await Storage.getData(key);
      const cachedOrders = Array.isArray(cached?.orders) ? cached.orders : [];
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
      }
    } catch (error) {
      log('Cache load error:', error);
    } finally {
      setCacheLoaded(true);
      setLoading(false);
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

      let endpoint = 'ProductOrder';
      if (!isallorders) {
        endpoint = `ProductOrder/user_orders_history/${userId}`;
      } else {
        endpoint = 'ProductOrder';
      }

      const res = await API.GET(endpoint);
      const response = Array.isArray(res?.Response) ? res.Response : [];

      setTitle(getScreenTitle());
      setOrders(response);
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
      setRefreshing(false);
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    setTitle(getScreenTitle());
    loadOrdersFromCache();
  }, []);

  useEffect(() => {
    if (!cacheLoaded) return;
    fetchOrders(orders.length === 0);
  }, [cacheLoaded]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const handleFilterChange = (filterKey) => {
    setSelectedDateFilter(filterKey);
  };

  const handleOrderUpdate = () => {
    fetchOrders(false);
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

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = orders;

    if (ordertype === 'fast') {
      filtered = filtered.filter((order) => !order.isdailymilkuser);
    } else if (ordertype === 'dailymilk') {
      filtered = filtered.filter((order) => order.isdailymilkuser);
    }

    filtered = applyDateFilter(filtered, selectedDateFilter);

    if (query) {
      filtered = filtered.filter((item) => {
        const orderId = String(item?.productorderid || item?.orderid || '').toLowerCase();
        const status = String(item?.orderstatus || '').toLowerCase();
        const customer = String(item?.name || item?.username || '').toLowerCase();
        return (
          orderId.includes(query) ||
          status.includes(query) ||
          customer.includes(query)
        );
      });
    }

    return [...filtered].sort((a, b) => {
      const dateA = getOrderTimestamp(a);
      const dateB = getOrderTimestamp(b);
      return dateB - dateA;
    });
  }, [orders, ordertype, searchQuery, selectedDateFilter]);

  const renderEmptyStateMessage = () => {
    if (searchQuery.trim()) {
      return {
        title: 'No Matching Orders',
        subtitle: 'Try a different order ID, status, or customer name.',
      };
    }

    if (ordertype === 'fast') {
      return {
        title: 'No Fast Delivery Orders',
        subtitle: 'No fast delivery orders found for this selected period.',
      };
    }

    if (ordertype === 'dailymilk') {
      return {
        title: 'No Daily Milk Orders',
        subtitle: 'No daily milk orders found for this selected period.',
      };
    }

    return {
      title: 'No Orders Found',
      subtitle: 'No orders are available for this selected period.',
    };
  };

  const emptyState = renderEmptyStateMessage();

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Icon name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>

          <View className="flex-1 px-3">
            <Text className="text-lg font-extrabold text-gray-900 text-center">{title}</Text>
            <Text className="text-xs text-gray-500 text-center">
              Filter: {DATE_FILTERS.find((f) => f.key === selectedDateFilter)?.label || 'All'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center"
          >
            <Icon
              name="refresh"
              size={22}
              color={refreshing ? '#9CA3AF' : '#2563eb'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-white px-4 py-2 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-1.5">
          <Icon name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search by Order ID, status, customer..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-gray-900 ml-2"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row items-center mt-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="w-full"
            contentContainerStyle={{ paddingRight: 8 }}
          >
            {DATE_FILTERS.map((item) => {
              const isActive = selectedDateFilter === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleFilterChange(item.key)}
                  className={`px-3 py-1 rounded-full mr-2 border ${
                    isActive
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isActive ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Animated.ScrollView
        className="flex-1 px-4 pt-4 bg-gray-100"
        entering={SlideInRight.duration(250)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {visibleOrders.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(100)}
            className="items-center justify-center mt-12 py-8"
          >
            <View className="bg-white p-6 rounded-full border border-gray-200">
              <Icon name="inventory-2" size={48} color="#9ca3af" />
            </View>

            <Text className="text-gray-700 text-lg mt-6 font-bold">
              {emptyState.title}
            </Text>

            <Text className="text-gray-500 mt-1 text-center px-6">
              {emptyState.subtitle}
            </Text>

            {!isallorders && (
              <TouchableOpacity
                onPress={handleStartShopping}
                className="bg-blue-600 px-6 py-3 rounded-full mt-6 shadow-sm"
              >
                <Text className="text-white font-semibold">Start Shopping</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          <View className="pb-6">
            {visibleOrders.map((order, index) => (
              <Animated.View
                key={order.productorderid || order.orderid || index}
                entering={FadeIn.delay(index * 80)}
                className="mb-4"
              >
                <OrderCard order={order} onOrderUpdate={handleOrderUpdate} />
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

export default MyOrdersScreen;
