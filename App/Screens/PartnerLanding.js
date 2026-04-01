import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Switch,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API } from '../../App_Utils/Services/APIService';
import { createLogger } from '../../App_Utils/Utils/logger';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import OrderCard from '../Components_New/OrdersCard';

const log = createLogger('PartnerLanding');

const TYPE_OPTIONS = ['Daily Milk', 'Fast Grocery Delivery', 'Demo Daily Milk', 'Milk'];
const STATUS_OPTIONS = ['All', 'Order Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

const getISTMinutes = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  return ist.getHours() * 60 + ist.getMinutes();
};

const inRange = (minutes, start, end) => minutes >= start && minutes < end;

const getOrderType = (order) => {
  switch (Number(order?.isdailymilkuser)) {
    case 1:
      return 'Daily Milk';
    case 0:
      return 'Fast Grocery Delivery';
    case 2:
      return 'Demo Daily Milk';
    case 3:
      return 'Milk';
    default:
      return 'Unknown';
  }
};

const normalizeMilkOrderDataForCard = (order) => {
  let parsedOrderData = order?.orderdata;

  try {
    if (typeof parsedOrderData === 'string') {
      parsedOrderData = JSON.parse(parsedOrderData);
    }
  } catch {
    parsedOrderData = [];
  }

  const hasOrderItems = Array.isArray(parsedOrderData) && parsedOrderData.length > 0;
  if (hasOrderItems) return { ...order, orderdata: parsedOrderData };

  let milkData = order?.dailymilk_json;
  try {
    if (typeof milkData === 'string') {
      milkData = JSON.parse(milkData);
    }
  } catch {
    milkData = [];
  }

  const milkRows = Array.isArray(milkData) ? milkData : milkData ? [milkData] : [];
  if (!milkRows.length) return { ...order, orderdata: parsedOrderData || [] };

  const mappedItems = milkRows.map((row, idx) => {
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

    return {
      id: `${order?.productorderid || 'milk'}-${idx}`,
      productname: row?.productname || row?.milkname || 'Daily Milk',
      variantname: row?.date ? `Date: ${new Date(row.date).toLocaleDateString('en-IN')}` : 'Milk Order',
      orderquantity: effectiveQty,
      price: unitPrice,
      amount,
      quantity: regularQty,
      regular_quantity: regularQty,
      extra_quantity: extraQty,
      cancelled_quantity: cancelledQty,
      total_quantity: totalQty,
      imageurl: row?.imageurl || null,
    };
  });

  return {
    ...order,
    orderdata: mappedItems,
  };
};

const getCurrentStatus = (order) => {
  if (Number(order?.ordercancelled) === 1) return 'Cancelled';
  if (Number(order?.orderdelivered) === 1) return 'Delivered';
  if (Number(order?.orderoutofdelivery) === 1) return 'Out for Delivery';
  if (Number(order?.orderpacked) === 1) return 'Packed';
  if (Number(order?.orderconfirmed) === 1) return 'Confirmed';
  if (Number(order?.orderplaced) === 1) return 'Order Placed';
  return 'Pending';
};

const matchesPartnerOrderScope = (order, partnerid) => {
  const outBy = order?.orderoutofdeliveryby ?? order?.outofdeliveryby ?? null;
  return (
    Number(order?.ordercancelled) !== 1 &&
    Number(order?.orderdelivered) !== 1 &&
    Number(order?.orderpacked) === 1 &&
    (
      (Number(order?.isdailymilkuser) === 0 && (outBy === null || outBy === undefined || outBy === '')) ||
      String(order?.mappedpartnerid || '') === String(partnerid) ||
      String(order?.orderoutofdeliveryby || '') === String(partnerid) ||
      String(order?.outofdeliveryby || '') === String(partnerid)
    )
  );
};

const PartnerLanding = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { partnerid, partnername } = route.params || {};
  const { setLoading: setGlobalLoading } = useLoading();
  const globalLoadingRef = useRef(setGlobalLoading);

  const [online, setOnline] = useState(true);
  const [mode, setMode] = useState('full');
  const [partSlot, setPartSlot] = useState(null);
  const [isModeChanging, setIsModeChanging] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTypes, setSelectedTypes] = useState(new Set());

  const tickRef = useRef(null);
  const pollRef = useRef(null);
  const inFlightFetchRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  useEffect(() => {
    globalLoadingRef.current = setGlobalLoading;
  }, [setGlobalLoading]);

  const istMinutes = useMemo(() => getISTMinutes(), [nowTick]);
  const morningActive = inRange(istMinutes, 7 * 60, 10 * 60);
  const eveningActive = inRange(istMinutes, 16 * 60, 21 * 60);
  const canUsePartNow = morningActive || eveningActive;

  const partSlotIsValidNow =
    (partSlot === 'morning' && morningActive) ||
    (partSlot === 'evening' && eveningActive);

  const timingChosen = mode === 'full' || (mode === 'part' && partSlot && partSlotIsValidNow);
  const showOrders = online && timingChosen;

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setNowTick((v) => v + 1);
    }, 30000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const fetchOrders = useCallback(async (showSpinner = false, force = false) => {
    const now = Date.now();
    if (inFlightFetchRef.current && !force) return;
    if (!force && now - lastFetchAtRef.current < 2500) return;

    inFlightFetchRef.current = true;
    lastFetchAtRef.current = now;

    try {
      if (showSpinner) {
        setLoading(true);
        globalLoadingRef.current?.(true, 'Fetching partner orders...');
      }

      const res = await API.GET('ProductOrder/pending_orders_with_dailymilk');
      const response = Array.isArray(res?.Response) ? res.Response : [];

      const scoped = response
        .filter((order) => matchesPartnerOrderScope(order, partnerid))
        .map((order) => ({ ...order, type: getOrderType(order) }))
        .map((order) => normalizeMilkOrderDataForCard(order));

      const sorted = [...scoped].sort((a, b) => {
        const aMilk = a.type === 'Milk' ? 0 : 1;
        const bMilk = b.type === 'Milk' ? 0 : 1;
        if (aMilk !== bMilk) return aMilk - bMilk;

        const statusPriority = (s) => {
          if (s === 'Out for Delivery') return 0;
          if (s === 'Packed') return 1;
          if (s === 'Delivered') return 3;
          return 2;
        };

        return statusPriority(a.orderstatus) - statusPriority(b.orderstatus);
      });

      setOrders(sorted);
    } catch (error) {
      log('Error fetching orders:', error);
      if (showSpinner) {
        // keep alert only on user-triggered/full load
      }
    } finally {
      inFlightFetchRef.current = false;
      if (showSpinner) {
        setLoading(false);
        globalLoadingRef.current?.(false);
      }
      setRefreshing(false);
    }
  }, [partnerid]);

  useEffect(() => {
    fetchOrders(true, true);
  }, [fetchOrders]);

  useEffect(() => {
    if (!showOrders) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => fetchOrders(false, false), 300000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [showOrders, fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(true, true);
  }, [fetchOrders]);

  const handleOrderUpdate = useCallback(() => {
    fetchOrders(false, true);
  }, [fetchOrders]);

  const toggleType = (type) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (selectedTypes.size > 0) {
      list = list.filter((o) => selectedTypes.has(o.type));
    }

    if (selectedStatus !== 'All') {
      list = list.filter((o) => getCurrentStatus(o) === selectedStatus);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const orderId = String(o?.productorderid || '').toLowerCase();
        const name = String(o?.name || '').toLowerCase();
        const mobile = String(o?.user_mobile || '').toLowerCase();
        const address = String(o?.deliveryaddress || '').toLowerCase();
        return orderId.includes(q) || name.includes(q) || mobile.includes(q) || address.includes(q);
      });
    }

    return list;
  }, [orders, selectedStatus, selectedTypes, searchQuery]);

  const setOnlineMode = (value) => {
    setIsModeChanging(true);
    setOnline(value);
    if (!value) {
      setMode(null);
      setPartSlot(null);
    } else if (!mode) {
      setMode('full');
    }
    setTimeout(() => setIsModeChanging(false), 250);
  };

  const resetFilters = () => {
    setSelectedStatus('All');
    setSearchQuery('');
    setSelectedTypes(new Set());
  };

  if (loading && orders.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-600 mt-3">Loading partner orders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {isModeChanging ? (
        <View className="absolute inset-0 bg-white/60 items-center justify-center z-10">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : null}

      <View className="bg-white px-3 pt-2 pb-2 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
            <Icon name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 px-3">
            <Text className="text-base font-bold text-gray-900 text-center">{partnername || 'Partner Orders'}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
            <Icon name="refresh" size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-3">
          <View className="bg-white rounded-2xl border border-gray-200 p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-gray-900">Availability</Text>
              <View className="flex-row items-center">
                <Text className={`text-xs font-semibold mr-2 ${online ? 'text-green-700' : 'text-gray-500'}`}>
                  {online ? 'Online' : 'Offline'}
                </Text>
                <Switch value={online} onValueChange={setOnlineMode} />
              </View>
            </View>

            <View className="mt-2 bg-gray-50 rounded-xl p-2 border border-gray-200">
              <Text className="text-[11px] text-gray-600">
                {online
                  ? (timingChosen ? 'Active and receiving orders now.' : 'Choose a valid slot to receive orders.')
                  : 'Turn on Online mode to receive orders.'}
              </Text>
            </View>

            {online ? (
              <>
                <View className="flex-row mt-2">
                  <Pressable
                    onPress={() => {
                      setMode('full');
                      setPartSlot(null);
                    }}
                    className={`flex-1 mr-1.5 rounded-xl py-2 border ${mode === 'full' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                  >
                    <Text className={`text-center text-xs font-semibold ${mode === 'full' ? 'text-white' : 'text-gray-700'}`}>Full Time</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!canUsePartNow) return;
                      setMode('part');
                      if (!partSlot) setPartSlot(morningActive ? 'morning' : 'evening');
                    }}
                    className={`flex-1 ml-1.5 rounded-xl py-2 border ${mode === 'part' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'} ${!canUsePartNow ? 'opacity-50' : ''}`}
                  >
                    <Text className={`text-center text-xs font-semibold ${mode === 'part' ? 'text-white' : 'text-gray-700'}`}>Part Time</Text>
                  </Pressable>
                </View>

                {mode === 'part' ? (
                  <View className="flex-row mt-2">
                    <Pressable
                      disabled={!morningActive}
                      onPress={() => setPartSlot('morning')}
                      className={`flex-1 mr-1.5 rounded-xl py-2 border ${partSlot === 'morning' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'} ${!morningActive ? 'opacity-50' : ''}`}
                    >
                      <Text className={`text-center text-[11px] font-semibold ${partSlot === 'morning' ? 'text-white' : 'text-gray-700'}`}>Morning 7-10</Text>
                    </Pressable>
                    <Pressable
                      disabled={!eveningActive}
                      onPress={() => setPartSlot('evening')}
                      className={`flex-1 ml-1.5 rounded-xl py-2 border ${partSlot === 'evening' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'} ${!eveningActive ? 'opacity-50' : ''}`}
                    >
                      <Text className={`text-center text-[11px] font-semibold ${partSlot === 'evening' ? 'text-white' : 'text-gray-700'}`}>Evening 4-9</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-2.5 py-1.5 border border-gray-200">
              <Icon name="search" size={16} color="#6B7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search order / name / phone / address..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-1.5 text-xs text-gray-900"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={14} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {STATUS_OPTIONS.map((status) => {
                const active = selectedStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    className={`mr-2 px-2.5 py-1 rounded-full border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                  >
                    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>{status}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {TYPE_OPTIONS.map((type) => {
                const active = selectedTypes.has(type);
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => toggleType(type)}
                    className={`mr-2 px-2.5 py-1 rounded-full border ${active ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                  >
                    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View className="mt-1.5 flex-row items-center justify-between">
              <Text className="text-[11px] text-gray-600">{filteredOrders.length} orders shown</Text>
              {(selectedStatus !== 'All' || selectedTypes.size > 0 || searchQuery) ? (
                <TouchableOpacity onPress={resetFilters}>
                  <Text className="text-[11px] font-semibold text-blue-700">Clear Filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {!showOrders ? (
            <View className="bg-white rounded-2xl border border-gray-200 p-6 mt-2 items-center">
              <Icon name="directions-bike" size={36} color="#9CA3AF" />
              <Text className="text-sm font-semibold text-gray-800 mt-2">Not Receiving Orders</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">
                Switch online and choose a valid slot to view available orders.
              </Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-200 p-6 mt-2 items-center">
              <Icon name="inventory-2" size={36} color="#9CA3AF" />
              <Text className="text-sm font-semibold text-gray-800 mt-2">No Orders Found</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">
                Try changing status/type filters or search query.
              </Text>
            </View>
          ) : (
            <View className="mt-2 pb-2">
              {filteredOrders.map((order, idx) => (
                <View key={order?.productorderid || `${order?.orderid || 'order'}-${idx}`} className="mb-2">
                  <OrderCard
                    order={order}
                    onOrderUpdate={handleOrderUpdate}
                    enableReturnOrder={false}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default PartnerLanding;
