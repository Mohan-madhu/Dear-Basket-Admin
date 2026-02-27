// PartnerLanding.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, { BounceIn, FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useNavigation, useRoute } from '@react-navigation/native';
import { QrCode, Search, X } from 'lucide-react-native';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import { Ionicons } from '@expo/vector-icons';
import Storage from '../../App_Utils/Services/StorageService';
import { API } from '../../App_Utils/Services/APIService';
import { createLogger } from '../../App_Utils/Utils/logger';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const log = createLogger("PartnerLanding");

// Enhanced type styles with better visual hierarchy
const TYPE_STYLES = {
  'Demo Daily Milk': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    bgColor: '#fffbeb',
    textColor: '#b45309',
    borderColor: '#fde68a',
    icon: 'cow'
  },
  'Daily Milk': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    borderColor: '#bfdbfe',
    icon: 'cup'
  },
  'Fast Grocery Delivery': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    bgColor: '#f0fdf4',
    textColor: '#15803d',
    borderColor: '#bbf7d0',
    icon: 'cart'
  },
  'Food Delivery': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    bgColor: '#fff7ed',
    textColor: '#c2410c',
    borderColor: '#fed7aa',
    icon: 'food'
  },
  'Milk': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    bgColor: '#faf5ff',
    textColor: '#7c3aed',
    borderColor: '#ddd6fe',
    icon: 'bottle-tonic'
  }
};

const ORDER_STATUS_FLOW = [
  'Order Placed',
  'Confirmed',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

const ALL_STATUS_OPTIONS = [
  'All',
  'Order Placed',
  'Confirmed',
  'Packed',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
];

// Helper functions
const getISTMinutes = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  return ist.getHours() * 60 + ist.getMinutes();
};

const inRange = (m, start, end) => m >= start && m < end;

// Status Badge Component
const StatusBadge = React.memo(({ online, timingChosen }) => {
  if (!online) {
    return (
      <View className="flex-row items-center">
        <View className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
        <Text className="text-sm text-gray-600">Offline</Text>
      </View>
    );
  }

  if (!timingChosen) {
    return (
      <View className="flex-row items-center">
        <View className="w-2 h-2 bg-amber-400 rounded-full mr-2" />
        <Text className="text-sm text-amber-700">Choose Timing</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center">
      <View className="w-2 h-2 bg-green-400 rounded-full mr-2" />
      <Text className="text-sm text-green-700">Active & Receiving Orders</Text>
    </View>
  );
});

// Memoized TimingSelector Component
const TimingSelector = React.memo(({
  mode,
  setMode,
  partSlot,
  setPartSlot,
  canUsePartNow,
  morningActive,
  eveningActive
}) => {
  return (
    <View className="mt-4">
      <Text className="text-sm font-medium text-gray-700 mb-3">Select Availability</Text>

      <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white p-1">
        <Pressable
          onPress={() => {
            React.startTransition(() => {
              setMode('full');
              setPartSlot(null);
            });
          }}
          className={`flex-1 rounded-xl px-4 py-3 ${mode === 'full' ? 'bg-gray-900' : ''}`}
        >
          <Text className={`text-center font-medium ${mode === 'full' ? 'text-white' : 'text-gray-700'}`}>
            Full Time
          </Text>
          <Text className={`text-center text-xs mt-1 ${mode === 'full' ? 'text-gray-300' : 'text-gray-500'}`}>
            8 hours
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (canUsePartNow) {
              React.startTransition(() => {
                setMode('part');
                setPartSlot(morningActive ? 'morning' : 'evening');
              });
            }
          }}
          disabled={!canUsePartNow}
          className={`flex-1 rounded-xl px-4 py-3 ${mode === 'part' ? 'bg-gray-900' : ''} ${!canUsePartNow ? 'opacity-50' : ''}`}
        >
          <Text className={`text-center font-medium ${mode === 'part' ? 'text-white' : 'text-gray-700'}`}>
            Part Time
          </Text>
          <Text className={`text-center text-xs mt-1 ${mode === 'part' ? 'text-gray-300' : 'text-gray-500'}`}>
            Flexible slots
          </Text>
        </Pressable>
      </View>

      {mode === 'full' && (
        <View className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-start">
            <View className="bg-blue-50 rounded-lg p-2 mr-3">
              <Icon name="information" size={16} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-medium">
                Full Time Commitment
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                You're committing to 8 hours of availability today. The system will assign you optimal time slots.
              </Text>
            </View>
          </View>
        </View>
      )}

      {mode === 'part' && (
        <View className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-medium text-gray-800 mb-3">Available Time Slots (IST)</Text>

          <View className="gap-3">
            <Pressable
              disabled={!morningActive}
              onPress={() => React.startTransition(() => setPartSlot('morning'))}
              style={{
                borderRadius: 12,
                borderWidth: 2,
                padding: 16,
                backgroundColor: partSlot === 'morning' ? '#111827' : '#ffffff',
                borderColor: partSlot === 'morning' ? '#111827' : '#e5e7eb',
                opacity: !morningActive ? 0.6 : 1,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ fontWeight: '500', color: partSlot === 'morning' ? '#ffffff' : '#1f2937' }}>
                    Morning Slot
                  </Text>
                  <Text style={{ fontSize: 14, marginTop: 4, color: partSlot === 'morning' ? '#d1d5db' : '#6b7280' }}>
                    7:00 AM - 10:00 AM
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: partSlot === 'morning' ? '#374151' : morningActive ? '#d1fae5' : '#f3f4f6'
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: partSlot === 'morning' ? '#ffffff' : morningActive ? '#065f46' : '#6b7280'
                  }}>
                    {morningActive ? 'Available Now' : 'Closed'}
                  </Text>
                </View>
              </View>
            </Pressable>

            <Pressable
              disabled={!eveningActive}
              onPress={() => React.startTransition(() => setPartSlot('evening'))}
              style={{
                borderRadius: 12,
                borderWidth: 2,
                padding: 16,
                backgroundColor: partSlot === 'evening' ? '#111827' : '#ffffff',
                borderColor: partSlot === 'evening' ? '#111827' : '#e5e7eb',
                opacity: !eveningActive ? 0.6 : 1,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ fontWeight: '500', color: partSlot === 'evening' ? '#ffffff' : '#1f2937' }}>
                    Evening Slot
                  </Text>
                  <Text style={{ fontSize: 14, marginTop: 4, color: partSlot === 'evening' ? '#d1d5db' : '#6b7280' }}>
                    4:00 PM - 9:00 PM
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: partSlot === 'evening' ? '#374151' : eveningActive ? '#d1fae5' : '#f3f4f6'
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: partSlot === 'evening' ? '#ffffff' : eveningActive ? '#065f46' : '#6b7280'
                  }}>
                    {eveningActive ? 'Available Now' : 'Closed'}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>

          {!canUsePartNow && (
            <View className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
              <Text className="text-amber-700 text-sm">
                Part-time is only available from 7–10 AM or 4–9 PM (IST).
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// Memoized Filters Component
const Filters = React.memo(({
  allFilterOptions,
  selectedFilters,
  toggleFilter,
  getOrderColor
}) => {
  return (
    <View className="mt-4">
      <Text className="text-sm font-medium text-gray-700 mb-3">Filter Orders</Text>
      <View className="flex-row flex-wrap">
        {allFilterOptions.map((f) => {
          const active = selectedFilters.has(f);
          const style = getOrderColor(f);
          return (
            <Pressable
              key={f}
              onPress={() => toggleFilter(f)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: 8,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: active ? style.bgColor : '#ffffff',
                borderColor: active ? style.borderColor : '#d1d5db',
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  marginRight: 8,
                  backgroundColor: active ? '#ffffff' : style.textColor,
                }}
              />
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: active ? style.textColor : '#374151'
              }}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

// Status Filter Dropdown Component
const StatusFilterDropdown = React.memo(({
  selectedStatus,
  onStatusChange,
  isOpen,
  onToggle
}) => {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-2">Filter by Status</Text>
      <View>
        <Pressable
          onPress={onToggle}
          className="flex-row items-center justify-between bg-white border border-gray-300 rounded-xl px-4 py-3"
        >
          <Text className="text-gray-800 font-medium">{selectedStatus}</Text>
          <Icon
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6b7280"
          />
        </Pressable>

        {isOpen && (
          <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xl shadow-lg z-10 max-h-96">
            <ScrollView className="max-h-96">
              {ALL_STATUS_OPTIONS.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => {
                    onStatusChange(status);
                    onToggle();
                  }}
                  className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${selectedStatus === status ? 'bg-blue-50' : 'bg-white'
                    }`}
                >
                  <View className={`w-3 h-3 rounded-full mr-3 ${selectedStatus === status ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                  <Text className={`font-medium ${selectedStatus === status ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
});

// Search Modal Component
const SearchModal = React.memo(({ visible, onClose, onSearch }) => {
  const [searchText, setSearchText] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');

  const searchCategories = [
    { value: 'all', label: 'All Fields' },
    { value: 'orderId', label: 'Order ID' },
    { value: 'customerName', label: 'Customer Name' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'address', label: 'Address' }
  ];

  const handleSearch = () => {
    if (searchText.trim()) {
      onSearch(searchText.trim(), searchCategory);
      onClose();
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setSearchCategory('all');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black bg-opacity-10 justify-center items-center p-4">
        <View className="bg-white w-full rounded-2xl p-6 max-w-md">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">Search Orders</Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} color="#6b7280" />
            </Pressable>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Search Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row">
                {searchCategories.map((category) => (
                  <Pressable
                    key={category.value}
                    onPress={() => setSearchCategory(category.value)}
                    className={`mr-2 px-4 py-2 rounded-full ${searchCategory === category.value
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                      }`}
                  >
                    <Text className={`text-sm font-medium ${searchCategory === category.value
                      ? 'text-white'
                      : 'text-gray-700'
                      }`}>
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <TextInput
            placeholder={`Search by ${searchCategories.find(c => c.value === searchCategory)?.label.toLowerCase()}...`}
            value={searchText}
            onChangeText={setSearchText}
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800 mb-4"
            autoFocus
            onSubmitEditing={handleSearch}
          />

          <View className="flex-row space-x-3">
            <Pressable
              onPress={clearSearch}
              className="flex-1 bg-gray-300 py-3 rounded-xl mx-1"
            >
              <Text className="text-gray-800 font-medium text-center">Clear</Text>
            </Pressable>
            <Pressable
              onPress={handleSearch}
              disabled={!searchText.trim()}
              className={`flex-1 py-3 rounded-xl mx-1 ${searchText.trim() ? 'bg-blue-500' : 'bg-blue-300'
                }`}
            >
              <Text className="text-white font-medium text-center">Search</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default function PartnerLanding() {
  // State declarations
  const [online, setOnline] = useState(true);
  const [mode, setMode] = useState("full");
  const [partSlot, setPartSlot] = useState(null);
  const [nowTick, setNowTick] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState(new Set());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ROLE, setROLE] = useState('');
  const [USER, setUSER] = useState('');
  const [isModeChanging, setIsModeChanging] = useState(false);
  const { setLoading: setGlobalLoading } = useLoading();

  // New state for filters and search
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [data, setData] = useState(null);

  const navigation = useNavigation();



  const route = useRoute();
  const { partnerid, partnername } = route.params;
  console.log("Received params - partnerid:", partnerid, "partnername:", partnername);
  const getData = async () => {
    const data = await Storage.getData("DATA");
    setData(data);
  }

  useEffect(() => { getData() }, []);

  const allFilterOptions = useMemo(
    () => ['Daily Milk', 'Fast Grocery Delivery', 'Food Delivery', 'Demo Daily Milk', 'Milk'],
    []
  );

  const getOrderColor = (type) => {
    return TYPE_STYLES[type] || TYPE_STYLES['Demo Daily Milk'];
  };

  const intervalRef = useRef(null);
  const pollRef = useRef(null);

  // Get user role
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const role = await Storage.getData("ROLE");
        const user = await Storage.getData("USER");
        setROLE("ADMIN");
        console.log("User role:", role);
        setUSER(user || 'PARTNER USER NOT FOUND');;
      } catch (error) {
        log("Error getting user role:", error);
      }
    };
    getUserRole();
  }, []);

  // Time-based logic
  useEffect(() => {
    intervalRef.current = setInterval(() => setNowTick((x) => x + 1), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const istMin = getISTMinutes();
  const morningActive = inRange(istMin, 7 * 60, 10 * 60);
  const eveningActive = inRange(istMin, 16 * 60, 21 * 60);
  const canUsePartNow = morningActive || eveningActive;

  const onToggleOnline = useCallback((value) => {
    setIsModeChanging(true);
    React.startTransition(() => {
      setOnline(value);
      if (!value) {
        setMode(null);
        setPartSlot(null);
      }
      setTimeout(() => setIsModeChanging(false), 300);
    });
  }, []);

  const fetchOrders = useCallback(async (opts = { showSpinner: false }) => {
    try {
      if (opts.showSpinner) setLoading(true);
      const USERDATA = await Storage.getData("DATA");
      const USER = USERDATA?.transid;

      console.log("USERDATA", USER);

      log("Fetching orders from endpoint: ProductOrder");
      const res = await API.GET("ProductOrder/pending_orders_with_dailymilk");

      var responsebeforefilter = res.Response;
      var apiresponse = []

      apiresponse = responsebeforefilter.filter(order => order.mappedpartnerid === partnerid && order.orderdelivered !== 1);




      const updatedData = apiresponse.map(order => {
        let type = '';

        switch (order.isdailymilkuser) {
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
          default:
            type = 'Unknown';
        }

        return { ...order, type };
      });

      // ---------- SORTING LOGIC ----------
      // 1) Type priority: Milk first, then others
      const getTypePriority = (o) => (o.type === 'Milk' ? 0 : 1);

      // 2) Status priority inside each type:
      // Out for Delivery -> Packed -> others -> Delivered
      const getStatusPriority = (o) => {
        switch (o.orderstatus) { // make sure this matches your field name
          case 'Out for Delivery':
            return 0;
          case 'Packed':
            return 1;
          case 'Delivered':
            return 3; // last
          default:
            return 2; // any other status
        }
      };

      const sortedData = [...updatedData].sort((a, b) => {
        // First: Milk vs others
        const typeDiff = getTypePriority(a) - getTypePriority(b);
        if (typeDiff !== 0) return typeDiff;

        // Then: orderstatus priority
        return getStatusPriority(a) - getStatusPriority(b);
      });
      // ---------- END SORTING LOGIC ----------

      setOrders(sortedData || []);
    } catch (error) {
      log("Error fetching orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      if (opts.showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders({ showSpinner: true });
  }, [fetchOrders]);

  const partSlotIsValidNow =
    (partSlot === 'morning' && morningActive) || (partSlot === 'evening' && eveningActive);

  const timingChosen =
    mode === 'full' || (mode === 'part' && partSlot && partSlotIsValidNow);

  useEffect(() => {
    const shouldPoll = online && timingChosen;
    if (shouldPoll) {
      fetchOrders({ showSpinner: false });
      pollRef.current = setInterval(() => fetchOrders({ showSpinner: false }), 300_000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [online, timingChosen, fetchOrders]);

  // Helper function to get current status of an order
  const getCurrentStatus = (order) => {
    if (order?.ordercancelled === 1) return 'Cancelled';
    if (order?.orderdelivered === 1) return 'Delivered';
    if (order?.orderoutofdelivery === 1) return 'Out for Delivery';
    if (order?.orderpacked === 1) return 'Packed';
    if (order?.orderconfirmed === 1) return 'Confirmed';
    if (order?.orderplaced === 1) return 'Order Placed';
    return 'Pending';
  };

  // Enhanced filtering logic with status and search
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply type filters
    if (selectedFilters.size > 0) {
      filtered = filtered.filter((o) => selectedFilters.has(o.type));
    }

    // Apply status filter
    if (selectedStatus !== 'All') {
      filtered = filtered.filter((order) => getCurrentStatus(order) === selectedStatus);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((order) => {
        switch (searchCategory) {
          case 'orderId':
            return order.productorderid?.toLowerCase().includes(query);
          case 'customerName':
            return order.name?.toLowerCase().includes(query);
          case 'phone':
            return order.user_mobile?.includes(query);
          case 'address':
            return order.deliveryaddress?.toLowerCase().includes(query);
          case 'all':
          default:
            return (
              order.productorderid?.toLowerCase().includes(query) ||
              order.name?.toLowerCase().includes(query) ||
              order.user_mobile?.includes(query) ||
              order.deliveryaddress?.toLowerCase().includes(query)
            );
        }
      });
    }

    return filtered;
  }, [orders, selectedFilters, selectedStatus, searchQuery, searchCategory]);

  const toggleFilter = (f) => {
    React.startTransition(() => {
      setSelectedFilters((prev) => {
        const next = new Set(prev);
        if (next.has(f)) next.delete(f);
        else next.add(f);
        return next;
      });
    });
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  const handleSearch = (query, category) => {
    setSearchQuery(query);
    setSearchCategory(category);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchCategory('all');
  };

  const showOrders = online && timingChosen;

  useEffect(() => {
    fetchOrders({ showSpinner: true });
  }, []);

  const MilkDeliveryModal = React.memo(({
    visible,
    onClose,
    onConfirm,
    order
  }) => {
    const [containerStatus, setContainerStatus] = useState(0); // 0: Returned, 1: Damaged, 2: Not Returned
    const [selectedOption, setSelectedOption] = useState(null);

    const handleConfirm = () => {
      if (selectedOption === null) {
        Alert.alert(
          "Container Status Required",
          "Please select the container status before confirming delivery.",
          [
            { text: "OK", style: "cancel" }
          ]
        );
        return;
      }

      onConfirm(containerStatus);
    };

    const containerOptions = [
      { id: 1, label: "Can Returned", description: "Container was returned in good condition", color: "#10b981" },
      { id: 2, label: "Can Damaged", description: "Container was returned but damaged", color: "#f59e0b" },
      { id: 0, label: "Can Not Returned", description: "Container was not returned by customer", color: "#ef4444" }
    ];

    const handleOptionSelect = (optionId) => {
      setContainerStatus(optionId);
      setSelectedOption(optionId);
    };

    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 16,
        }}>
          <View className="bg-white w-full rounded-xl p-6" style={{ maxWidth: 400 }}>
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Deliver Milk Confirmation
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Customer: {order?.name}
              </Text>
              <Text className="text-sm text-gray-600">
                Order ID: #{order?.productorderid?.slice(-5).toUpperCase()}
              </Text>
            </View>

            {/* Container Status Options */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-3">
                Container Status *
              </Text>

              {containerOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleOptionSelect(option.id)}
                  className={`flex-row items-center p-4 mb-2 rounded-lg border-2 ${selectedOption === option.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-gray-50'
                    }`}
                >
                  <View
                    className="w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center"
                    style={{
                      borderColor: selectedOption === option.id ? option.color : '#9ca3af',
                      backgroundColor: selectedOption === option.id ? option.color : 'transparent'
                    }}
                  >
                    {selectedOption === option.id && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">
                      {option.label}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </Text>
                  </View>

                  {selectedOption === option.id && (
                    <View
                      className="w-2 h-4 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 bg-gray-300 p-3 rounded-lg"
              >
                <Text className="text-gray-800 font-medium text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                className="flex-1 bg-purple-600 p-3 rounded-lg"
              >
                <Text className="text-white font-medium text-center">
                  Confirm Delivery
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  });

  // Enhanced OrderCard Component
  const OrderCard = React.memo(({ order, onOrderUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showMilkDeliveryModal, setShowMilkDeliveryModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const style = getOrderColor(order?.type);

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
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

    const getCurrentStatus = () => {
      if (order?.ordercancelled === 1) return 'Cancelled';
      if (order?.orderdelivered === 1) return 'Delivered';
      if (order?.orderoutofdelivery === 1) return 'Out for Delivery';
      if (order?.orderpacked === 1) return 'Packed';
      if (order?.orderconfirmed === 1) return 'Confirmed';
      if (order?.orderplaced === 1) return 'Order Placed';
      return 'Pending';
    };

    const isStatusCompleted = (status) => {
      switch (status) {
        case 'Order Placed':
          return order?.orderplaced === 1;
        case 'Confirmed':
          return order?.orderconfirmed === 1;
        case 'Packed':
          return order?.orderpacked === 1;
        case 'Out for Delivery':
          return order?.orderoutofdelivery === 1;
        case 'Delivered':
          return order?.orderdelivered === 1;
        case 'Cancelled':
          return order?.ordercancelled === 1;
        default:
          return false;
      }
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

    const getStatusButtonConfig = (status) => {
      switch (status) {
        case 'Confirmed':
          return { icon: 'check-circle-outline', color: '#3b82f6', text: 'Confirm Order' };
        case 'Packed':
          return { icon: 'package-variant', color: '#f59e0b', text: 'Mark as Packed' };
        case 'Out for Delivery':
          return { icon: 'truck-delivery', color: '#a855f7', text: 'Out for Delivery' };
        case 'Delivered':
          return { icon: 'check-circle', color: '#10b981', text: 'Mark as Delivered' };
        default:
          return { icon: 'update', color: '#6b7280', text: 'Update Status' };
      }
    };

    const updateOrderStatus = async (newStatus) => {
      if (!newStatus) return;

      try {
        setGlobalLoading(true, `Updating order to ${newStatus}...`);

        let endpoint = '';
        let payload = {
          productorderid: order.productorderid,
          luu: USER
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
        console.log("Updating order status with payload:", `ProductOrder/${endpoint}`, payload);
        const response = await API.PUT(`ProductOrder/${endpoint}`, payload);

        Alert.alert("Success", response.message || `Order status updated to ${newStatus}`);

        if (onOrderUpdate) {
          onOrderUpdate();
        }
      } catch (error) {
        log("Error updating order status:", error);
        Alert.alert("Error", "Failed to update order status");
      } finally {
        setGlobalLoading(false);
      }
    };

    // Special function for Milk Delivery
    const handleMilkDelivery = async (containerReturned, notes) => {
      try {
        setGlobalLoading(true, "Marking milk as delivered...");

        const payload = {
          transid: order.productorderid,
          received: 1,
          cans_returned: containerReturned,
          luu: USER
        };

        const response = await API.PUT('DailyMilkStatus', payload);

        Alert.alert("Success", response.message || "Milk delivered successfully!");
        setShowMilkDeliveryModal(false);

        if (onOrderUpdate) {
          onOrderUpdate();
        }
      } catch (error) {
        log("Error delivering milk:", error);
        Alert.alert("Error", "Failed to mark milk as delivered");
      } finally {
        setGlobalLoading(false);
      }
    };

    const cancelOrder = async () => {
      if (!cancelReason.trim()) {
        Alert.alert("Error", "Please provide a cancellation reason");
        return;
      }

      try {
        setGlobalLoading(true, "Cancelling order...");

        const payload = {
          productorderid: order.productorderid,
          ordercalcelledby: USER,
          ordercancelledreason: cancelReason,
          luu: USER
        };

        const response = await API.PUT('DailyMilkStatus', payload);

        Alert.alert("Success", response.message || "Order cancelled successfully");
        setShowCancelModal(false);
        setCancelReason('');

        if (onOrderUpdate) {
          onOrderUpdate();
        }
      } catch (error) {
        log("Error cancelling order:", error);
        Alert.alert("Error", "Failed to cancel order");
      } finally {
        setGlobalLoading(false);
      }
    };

    const getImageUri = (imagePath) => {
      if (imagePath === null || imagePath === undefined) return null;
      if (imagePath === "") return null;

      if (typeof imagePath !== "string") {
        console.warn("getImageUri expected a string but got:", typeof imagePath, imagePath);
        return null;
      }

      if (imagePath.startsWith("file://")) return imagePath;
      if (imagePath.startsWith("http")) return imagePath;




      return (
        "https://dev.dine360.ca/backend/" +
        imagePath.replace(/^\/+/, "").replace("~/", "")
      );
    };

    const parseOrderData = () => {
      try {
        if (typeof order?.orderdata === 'string') {
          return JSON.parse(order.orderdata);
        }
        return order?.orderdata || [];
      } catch (error) {
        return [];
      }
    };

    const parseDailyMilkData = () => {
      try {
        if (typeof order?.dailymilk_json === 'string') {
          return JSON.parse(order.dailymilk_json);
        }
        return order?.dailymilk_json || [];
      } catch (error) {
        return [];
      }
    };

    const calculateItemTotal = (item) => {
      if (item.price !== undefined && item.orderquantity !== undefined) {
        return item.price * item.orderquantity;
      }
      if (item.amount !== undefined && item.quantity !== undefined) {
        return item.amount * item.quantity;
      }
      return 0;
    };

    const orderItems = parseOrderData();
    const dailyMilkItems = parseDailyMilkData();

    const totalItems = orderItems.length + dailyMilkItems.length;
    const totalAmount = (order?.itemtotal || 0) + (order?.deliverycharge || 0) + (order?.tax || 0);

    const openMaps = (lat, lng) => {
      if (!lat || !lng) {
        Alert.alert("Location not available");
        return;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url).catch((err) => {
        log("Error opening maps:", err);
        Alert.alert("Error", "Could not open maps app");
      });
    };

    const calculateBottleCount = (quantity) => {
      const fullBottles = Math.floor(quantity);
      const halfBottle = quantity % 1 !== 0;

      if (fullBottles > 0 && halfBottle) {
        return `${fullBottles} × 1L + 1 × 0.5L Bottles`;
      } else if (fullBottles > 0) {
        return `${fullBottles} × 1L Bottle${fullBottles > 1 ? 's' : ''}`;
      } else if (halfBottle) {
        return `1 × 0.5L Bottle`;
      } else {
        return `${quantity}L Bottles`;
      }
    };

    // Special Milk Delivery Actions
    const MilkDeliveryActions = () => {
      if (order?.isdailymilkuser !== 3 || ROLE !== 'ADMIN') {
        return null;
      }

      const currentStatus = getCurrentStatus();

      if (currentStatus === 'Cancelled' || currentStatus === 'Delivered') {
        return null;
      }

      return (
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowMilkDeliveryModal(true)}
            style={{
              flex: 1,
              backgroundColor: '#8b5cf6',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="bottle-tonic" size={20} color="white" />
            <Text className="text-white text-base font-semibold ml-2">Deliver Milk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowCancelModal(true)}
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cancel" size={20} color="white" />
            <Text className="text-white text-base font-semibold ml-2">Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    };

    // Regular Admin Actions for non-milk orders
    const AdminActions = () => {
      if (ROLE !== 'ADMIN' || order?.isdailymilkuser === 3) {
        return null;
      }

      const currentStatus = getCurrentStatus();
      const nextStatus = getNextStatus();

      if (currentStatus === 'Cancelled' || currentStatus === 'Delivered') {
        return null;
      }

      if (currentStatus !== 'Out for Delivery') {
        return null;
      }


      const buttonConfig = nextStatus ? getStatusButtonConfig(nextStatus) : null;

      return (
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          {buttonConfig && (
            <TouchableOpacity
              onPress={() => updateOrderStatus(nextStatus)}
              style={{
                flex: 1,
                backgroundColor: buttonConfig.color,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={buttonConfig.icon} size={20} color="white" />
              <Text className="text-white text-sm font-semibold ml-2">{buttonConfig.text}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowCancelModal(true)}
            style={{
              flex: buttonConfig ? 1 : 1,
              backgroundColor: '#ef4444',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cancel" size={20} color="white" />
            <Text className="text-white text-sm font-semibold ml-2">Cancel Order</Text>
          </TouchableOpacity>
        </View>
      );
    };

    const renderOrderTimeline = () => (
      <View className="mt-4">
        <Text className="text-sm font-semibold text-gray-800 mb-3">Order Timeline</Text>
        <View style={{ gap: 16 }}>
          {/* Order Placed */}
          {isStatusCompleted('Order Placed') && (
            <View className="flex-row">
              <Icon name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-sm text-gray-700">Order Placed</Text>
                <Text className="text-xs text-gray-500">{formatDate(order?.orderpalcedtime)}</Text>
                <Text className="text-xs text-green-600">✓ Completed</Text>
              </View>
            </View>
          )}

          {/* Order Confirmed */}
          {isStatusCompleted('Confirmed') && (
            <View className="flex-row">
              <Icon name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-sm text-gray-700">Order Confirmed</Text>
                <Text className="text-xs text-gray-500">{formatDate(order?.orderconfirmedtime)}</Text>
                {isStatusCompleted('Order Placed') && (
                  <Text className="text-xs text-blue-600">
                    Time taken: {getTimeDifference(order?.orderpalcedtime, order?.orderconfirmedtime)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Order Packed */}
          {isStatusCompleted('Packed') && (
            <View className="flex-row">
              <Icon name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-sm text-gray-700">Packed</Text>
                <Text className="text-xs text-gray-500">{formatDate(order?.orderpackedtime)}</Text>
                {isStatusCompleted('Confirmed') && (
                  <Text className="text-xs text-blue-600">
                    Time taken: {getTimeDifference(order?.orderconfirmedtime, order?.orderpackedtime)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Out for Delivery */}
          {isStatusCompleted('Out for Delivery') && (
            <View className="flex-row">
              <Icon name="truck" size={16} color="#3B82F6" style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-sm text-gray-700">Out for Delivery</Text>
                <Text className="text-xs text-gray-500">{formatDate(order?.orderoutofdeliverytime)}</Text>
                {isStatusCompleted('Packed') && (
                  <Text className="text-xs text-blue-600">
                    Time taken: {getTimeDifference(order?.orderpackedtime, order?.orderoutofdeliverytime)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Delivered */}
          {isStatusCompleted('Delivered') && (
            <View className="flex-row">
              <Icon name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-sm text-gray-700">
                  {order?.isdailymilkuser === 3 ? 'Milk Delivered' : 'Delivered'}
                </Text>
                <Text className="text-xs text-gray-500">{formatDate(order?.orderdeliveredtime)}</Text>
                {isStatusCompleted('Out for Delivery') && (
                  <Text className="text-xs text-green-600">
                    Delivered in: {getTimeDifference(order?.orderoutofdeliverytime, order?.orderdeliveredtime)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Cancelled */}
          {isStatusCompleted('Cancelled') && (
            <View className="flex-row">
              <Icon name="close-circle" size={16} color="#EF4444" style={{ marginTop: 2 }} />
              <View className="ml-2 flex-1">
                <Text className="text-sm text-gray-700">Cancelled</Text>
                <Text className="text-xs text-gray-500">{formatDate(order?.ordercancelledtime)}</Text>
                {order?.ordercancelledreason && (
                  <Text className="text-xs text-red-500">
                    Reason: {order?.ordercancelledreason}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );

    // Special UI for Milk Orders (isdailymilkuser == 3)
    if (order?.isdailymilkuser === 3) {
      return (
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            marginBottom: 12,
            borderWidth: 3,
            borderColor: style.borderColor,
            overflow: 'hidden',
          }}
        >
          {/* Milk Order Header */}
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            className="p-4 border-b border-gray-100"
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Icon name="bottle-tonic" size={20} color={style.textColor} />
                  <Text className="text-base font-bold text-gray-900 ml-2">
                    Milk Delivery
                  </Text>
                </View>
                <Text className="text-sm text-gray-500">
                  Order ID: #{order?.dailymilkorderid?.replace("-20", "-") || order?.productorderid?.slice(-5).toUpperCase()}
                </Text>
              </View>

              <View style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                backgroundColor: style.bgColor,
                borderColor: style.borderColor,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: style.textColor, textTransform: 'capitalize' }}>
                  {getCurrentStatus()}
                </Text>
              </View>
            </View>

            {/* Customer Info with Call Button */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Icon name="account" size={16} color="#6B7280" />
                  <Text className="text-sm font-medium text-gray-900 ml-2">
                    {order?.name}
                  </Text>
                </View>
                {order?.user_mobile && (
                  <View className="flex-row items-center">
                    <Icon name="phone" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-2">
                      {order.user_mobile}
                    </Text>
                  </View>
                )}
              </View>

              {order?.user_mobile && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${order.user_mobile}`)}
                  className="flex-row items-center bg-green-500 px-3 py-2 rounded-lg ml-2"
                >
                  <Icon name="phone" size={16} color="#ffffff" />
                  <Text className="text-white font-medium ml-1">Call</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pregnancy Status Notice */}
            {order?.pregnancy_status === 1 && (
              <View className="mb-3 p-2 bg-pink-50 border border-pink-200 rounded-lg">
                <View className="flex-row items-center">
                  <Icon name="heart" size={16} color="#DB2777" />
                  <Text className="text-sm font-medium text-pink-700 ml-2">
                    Pregnancy Care - Complementary 250ml Milk
                  </Text>
                </View>
                <Text className="text-xs text-pink-600 mt-1 ml-6">
                  Extra 250ml milk provided as complementary support
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">
                {formatDate(order?.ordertime)}
              </Text>

              {/* <Text className="text-sm font-bold text-gray-900">
                Daily Milk Subscription
              </Text> */}
            </View>

            {/* Milk Delivery Specific Info */}
            <View className="mt-1">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Icon name="calendar" size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">
                    Regular Delivery
                  </Text>
                </View>

                {/* Maps Button */}
                {order?.latitude && order?.longitude && order?.orderdelivered !== 1 && ROLE === "ADMIN" && (
                  <TouchableOpacity
                    onPress={() => openMaps(order.latitude, order.longitude)}
                    className="flex-row items-center bg-blue-100 px-3 py-1.5 rounded-full"
                  >
                    <Icon name="map-marker" size={14} color="#3B82F6" />
                    <Text className="text-xs text-blue-600 ml-1">View on Map</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Milk Delivery Actions */}
            <MilkDeliveryActions />
          </TouchableOpacity>

          {/* Expanded Milk Details */}
          {expanded && (
            <View className="p-4 bg-gray-50">
              {/* Delivery Address */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-800 mb-2">Delivery Address</Text>
                <View className="bg-white p-3 rounded-lg border border-gray-200">
                  <Text className="text-sm text-gray-700">{order?.deliveryaddress}</Text>
                  <Text className="text-sm text-gray-700">
                    {order?.deliverycity}, {order?.deliverystate} - {order?.deliverypincode}
                  </Text>
                  {order?.latitude && order?.longitude && (
                    <TouchableOpacity
                      onPress={() => openMaps(order.latitude, order.longitude)}
                      className="flex-row items-center mt-2"
                    >
                      <Icon name="map-marker" size={14} color="#3B82F6" />
                      <Text className="text-xs text-blue-600 ml-1">Open in Google Maps</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Customer Contact in Expanded View */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-800 mb-2">Customer Contact</Text>
                <View className="bg-white p-3 rounded-lg border border-gray-200">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <View className="flex-row items-center mb-2">
                        <Icon name="account" size={16} color="#6B7280" />
                        <Text className="text-sm font-medium text-gray-900 ml-2">
                          {order?.name}
                        </Text>
                      </View>
                      {order?.user_mobile && (
                        <View className="flex-row items-center">
                          <Icon name="phone" size={16} color="#6B7280" />
                          <Text className="text-sm text-gray-700 ml-2">
                            {order.user_mobile}
                          </Text>
                        </View>
                      )}
                    </View>

                    {order?.user_mobile && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${order.user_mobile}`)}
                        className="flex-row items-center bg-green-500 px-4 py-2 rounded-lg"
                      >
                        <Icon name="phone" size={18} color="#ffffff" />
                        <Text className="text-white font-medium ml-2">Call Customer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>



              {dailyMilkItems.map((item, index) => {
                const extra = item.extra || 0;
                const totalQuantity = item.quantity + extra;
                const perLiterPrice = item.amount / item.quantity; // Price per liter from regular milk
                const regularMilkPrice = item.amount; // Already includes regular milk price
                const extraMilkPrice = extra * perLiterPrice; // Calculate extra milk price
                const milkTotal = regularMilkPrice + extraMilkPrice; // Total milk price
                const totalPrice = milkTotal + (item?.tax || 0) + (item.deliverycharge || 0);

                return (
                  <View key={`milk-${index}`} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                    <View className="flex-row items-center">
                      <Image
                        source={{
                          uri: getImageUri(item.imageurl) || 'https://placehold.co/60x60/png?text=Milk'
                        }}
                        style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                              Daily Milk
                            </Text>
                            <Text className="text-xs text-gray-500">
                              Date: {item.date} • Qty: {item.quantity}L
                              {extra > 0 && ` + ${extra}L Extra`}
                              {totalQuantity > 0 && ` (Total: ${totalQuantity}L)`}
                            </Text>
                          </View>
                          {item.cancelled ? (
                            <Text className="text-xs text-red-500">Cancelled</Text>
                          ) : (
                            <Text className="text-sm font-semibold text-gray-900">
                              ₹{totalPrice.toFixed(2)}
                            </Text>
                          )}
                        </View>

                        {/* Bottle Count Calculation */}
                        {!item.cancelled && totalQuantity > 0 && (
                          <View className="mt-1">
                            {/* Regular milk bottles */}
                            {item.quantity > 0 && (
                              <Text className="text-xs text-blue-600 font-medium">
                                {calculateBottleCount(item.quantity)} (Regular)
                              </Text>
                            )}

                            {/* Extra milk bottles */}
                            {extra > 0 && (
                              <Text className="text-xs text-green-600 font-medium">
                                {calculateBottleCount(extra)} (Extra)
                              </Text>
                            )}

                            {/* Total bottles if both regular and extra */}
                            {(item.quantity > 0 && extra > 0) && (
                              <Text className="text-xs text-gray-700 font-medium">
                                Total: {calculateBottleCount(totalQuantity)}
                              </Text>
                            )}
                          </View>
                        )}

                        {/* Price breakdown - CORRECTED */}
                        <View className="mt-1 space-y-1">
                          {/* Regular Milk */}
                          {item.quantity > 0 && (
                            <View className="flex-row justify-between">
                              <Text className="text-xs text-gray-500">
                                Milk: ₹{perLiterPrice.toFixed(2)} × {item.quantity}L
                              </Text>
                              <Text className="text-xs text-gray-700">
                                ₹{regularMilkPrice.toFixed(2)}
                              </Text>
                            </View>
                          )}

                          {/* Extra Milk */}
                          {extra > 0 && (
                            <View className="flex-row justify-between">
                              <Text className="text-xs text-gray-500">
                                Extra Milk: ₹{perLiterPrice.toFixed(2)} × {extra}L
                              </Text>
                              <Text className="text-xs text-green-600">
                                + ₹{extraMilkPrice.toFixed(2)}
                              </Text>
                            </View>
                          )}

                          {/* Subtotal for milk */}
                          {(item.quantity > 0 || extra > 0) && (
                            <View className="flex-row justify-between">
                              {/* <Text className="text-xs text-gray-500 font-medium">Milk Subtotal</Text>
                              <Text className="text-xs text-gray-700 font-medium">
                                ₹{milkTotal.toFixed(2)}
                              </Text> */}
                            </View>
                          )}

                          {item?.tax > 0 && (
                            <View className="flex-row justify-between">
                              <Text className="text-xs text-gray-500">Tax</Text>
                              <Text className="text-xs text-gray-700">+ ₹{item.tax.toFixed(2)}</Text>
                            </View>
                          )}

                          {item.deliverycharge > 0 && (
                            <View className="flex-row justify-between">
                              <Text className="text-xs text-gray-500">Delivery Charge</Text>
                              <Text className="text-xs text-gray-700">+ ₹{item.deliverycharge.toFixed(2)}</Text>
                            </View>
                          )}

                          {/* Total line */}
                          <View className="flex-row justify-between border-t border-gray-100 pt-1">
                            <Text className="text-xs font-medium text-gray-900">Total</Text>
                            <Text className="text-xs font-medium text-gray-900">
                              ₹{totalPrice.toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {/* Bottle returned status */}
                        {item.cans_returned !== null && item.cans_returned !== undefined && (
                          <View className="mt-1">
                            <Text className="text-xs text-gray-500">
                              Bottles Returned: {item.cans_returned}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Milk Delivery Timeline */}
              {renderOrderTimeline()}
            </View>
          )}

          {/* Milk Delivery Modal */}
          <MilkDeliveryModal
            visible={showMilkDeliveryModal}
            onClose={() => setShowMilkDeliveryModal(false)}
            onConfirm={handleMilkDelivery}
            order={order}
          />

          {/* Cancel Order Modal */}
          <Modal visible={showCancelModal} transparent animationType="slide">
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: 16,
            }}>
              <View className="bg-white w-full rounded-xl p-6" style={{ maxWidth: 400 }}>
                <Text className="text-xl font-bold text-gray-800 mb-4">Cancel Milk Delivery</Text>

                <Text className="text-sm text-gray-600 mb-4">
                  Are you sure you want to cancel this milk delivery? This action cannot be undone.
                </Text>

                <Text className="text-sm font-medium text-gray-700 mb-2">Cancellation Reason:</Text>
                <TextInput
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="Enter reason for cancellation"
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    padding: 12,
                    color: '#1f2937',
                    marginBottom: 16,
                    textAlignVertical: 'top',
                  }}
                />

                <View className="flex-row" style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowCancelModal(false)}
                    className="flex-1 bg-gray-300 p-3 rounded-lg"
                  >
                    <Text className="text-gray-800 font-medium text-center">Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelOrder}
                    className="flex-1 bg-red-600 p-3 rounded-lg"
                  >
                    <Text className="text-white font-medium text-center">Confirm Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Footer Actions */}
          <View className="p-4 bg-gray-50 border-t border-gray-100">
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              className="flex-row items-center justify-center"
            >
              <Text className="text-purple-600 font-medium mr-2">
                {expanded ? 'Show Less' : 'View Details'}
              </Text>
              <Icon
                name={expanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#8b5cf6"
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Regular Order Card for other types
    return (
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          marginBottom: 12,
          borderWidth: 2,
          borderColor: style.borderColor,
          overflow: 'hidden',
        }}
      >
        {/* Order Header */}
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          className="p-4 border-b border-gray-100"
        >
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Order ID:</Text>
              <Text className="text-sm  text-gray-500">
                #{order?.dailymilkorderid?.replace("-20", "-") || (order?.productorderid && order.productorderid.length > 20 ? order.productorderid.slice(-5).toUpperCase() : order.productorderid?.toString().replace("-20", "-").replace("369", "").toUpperCase())}
              </Text>
            </View>

            <View className="flex-row items-center">
              <View style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                backgroundColor: style.bgColor,
                borderColor: style.borderColor,
                marginRight: 8,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: style.textColor, textTransform: 'capitalize' }}>
                  {getCurrentStatus()}
                </Text>
              </View>

              {order?.isdailymilkuser === 1 && (
                <Icon name="cow" size={20} color="#8B4513" />
              )}
            </View>
          </View>

          {/* Customer Info with Call Button */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Icon name="account" size={16} color="#6B7280" />
                <Text className="text-sm font-medium text-gray-900 ml-2">
                  {order?.name}
                </Text>
              </View>
              {order?.user_mobile && (
                <View className="flex-row items-center">
                  <Icon name="phone" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">
                    {order.user_mobile}
                  </Text>
                </View>
              )}
            </View>

            {order?.user_mobile && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${order.user_mobile}`)}
                className="flex-row items-center bg-green-500 px-3 py-2 rounded-lg ml-2"
              >
                <Icon name="phone" size={16} color="#ffffff" />
                <Text className="text-white font-medium ml-1">Call</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm text-gray-600">
              {formatDate(order?.ordertime)}
            </Text>

            {order?.isdailymilkuser === 2 ? (
              <View className="flex-row items-center bg-blue-100 px-2 py-1 rounded-full">
                <Text className="text-sm text-gray-900">
                  Daily Milk Demo
                </Text>
              </View>
            ) : (
              <Text className="text-lg font-bold text-gray-900">
                ₹{order?.itemtotal + order?.tax + order?.deliverycharge || 0}
              </Text>
            )}
          </View>

          {/* Order Preview */}
          <View className="mt-1">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Icon name="package-variant" size={16} color="#6B7280" />
                {order?.isdailymilkuser === 2 ? (
                  <Text className="text-sm text-gray-600 ml-2">
                    0.5L Milk ({order?.orderdata})
                  </Text>
                ) : (
                  <Text className="text-sm text-gray-600 ml-2">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {/* Maps Button */}
              {order?.latitude && order?.longitude && order?.orderdelivered !== 1 && ROLE === "ADMIN" && (
                <TouchableOpacity
                  onPress={() => openMaps(order.latitude, order.longitude)}
                  className="flex-row items-center bg-blue-100 px-3 py-1.5 rounded-full"
                >
                  <Icon name="map-marker" size={14} color="#3B82F6" />
                  <Text className="text-xs text-blue-600 ml-1">View on Map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Admin Actions */}
          <AdminActions />
        </TouchableOpacity>

        {/* Expanded Details */}
        {expanded && (
          <View className="p-4 bg-gray-50">
            {/* Delivery Address */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-800 mb-2">Delivery Address</Text>
              <View className="bg-white p-3 rounded-lg border border-gray-200">
                <Text className="text-sm text-gray-700">{order?.deliveryaddress}</Text>
                <Text className="text-sm text-gray-700">
                  {order?.deliverycity}, {order?.deliverystate} - {order?.deliverypincode}
                </Text>
                {order?.latitude && order?.longitude && (
                  <TouchableOpacity
                    onPress={() => openMaps(order.latitude, order.longitude)}
                    className="flex-row items-center mt-2"
                  >
                    <Icon name="map-marker" size={14} color="#3B82F6" />
                    <Text className="text-xs text-blue-600 ml-1">Open in Google Maps</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Customer Contact in Expanded View */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-800 mb-2">Customer Contact</Text>
              <View className="bg-white p-3 rounded-lg border border-gray-200">
                <View className="flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center mb-2">
                      <Icon name="account" size={16} color="#6B7280" />
                      <Text className="text-sm font-medium text-gray-900 ml-2">
                        {order?.name}
                      </Text>
                    </View>
                    {order?.user_mobile && (
                      <View className="flex-row items-center">
                        <Icon name="phone" size={16} color="#6B7280" />
                        <Text className="text-sm text-gray-700 ml-2">
                          {order.user_mobile}
                        </Text>
                      </View>
                    )}
                  </View>

                  {order?.user_mobile && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${order.user_mobile}`)}
                      className="flex-row items-center bg-green-500 px-4 py-2 rounded-lg"
                    >
                      <Icon name="phone" size={18} color="#ffffff" />
                      <Text className="text-white font-medium ml-2">Call Customer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Order Items with Detailed Pricing */}
            {order?.isdailymilkuser === 2 ? (
              <>
                {renderOrderTimeline()}
              </>
            ) : (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-800 mb-2">
                    Order Items ({totalItems})
                  </Text>

                  {/* Render regular order items */}
                  {orderItems.map((item, index) => {
                    const itemTotal = calculateItemTotal(item);
                    return (
                      <View key={`order-${index}`} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                        <View className="flex-row items-center">
                          <Image
                            source={{
                              uri: getImageUri(item.imageurl) || getImageUri(item.product?.imageurl) || 'https://placehold.co/60x60/png?text=No+Image'
                            }}
                            style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
                            resizeMode="cover"
                          />
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                              {item.productname}
                            </Text>
                            {item.variantname && (
                              <Text className="text-xs text-gray-500">Variant: {item.variantname}</Text>
                            )}
                            <View className="flex-row justify-between mt-1">
                              <Text className="text-xs text-gray-500">₹{item.price} × {item.orderquantity}</Text>
                              <Text className="text-sm font-semibold text-gray-900">₹{itemTotal}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Render daily milk items */}
                  {dailyMilkItems.map((item, index) => {
                    const itemTotal = calculateItemTotal(item);
                    return (
                      <View key={`milk-${index}`} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                        <View className="flex-row items-center">
                          <Image
                            source={{
                              uri: getImageUri(item.imageurl) || 'https://placehold.co/60x60/png?text=Milk'
                            }}
                            style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
                            resizeMode="cover"
                          />
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                              Daily Milk
                            </Text>
                            <Text className="text-xs text-gray-500">
                              Date: {item.date} • Qty: {item.quantity}L
                            </Text>
                            {item.cancelled && (
                              <Text className="text-xs text-red-500">Cancelled</Text>
                            )}
                            <View className="flex-row justify-between mt-1">
                              <Text className="text-xs text-gray-500">₹{item.amount} × {item.quantity}L</Text>
                              <Text className="text-sm font-semibold text-gray-900">₹{itemTotal}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Price Breakdown */}
                <View className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
                  <Text className="text-sm font-semibold text-gray-800 mb-2">Price Details</Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-600">Item Total</Text>
                    <Text className="text-sm text-gray-600">₹{order?.itemtotal || 0}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-600">Delivery Charge</Text>
                    <Text className="text-sm text-gray-600">₹{order?.deliverycharge || 0}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-600">Tax</Text>
                    <Text className="text-sm text-gray-600">₹{order?.tax || 0}</Text>
                  </View>
                  <View className="border-t border-gray-200 pt-2 mt-2">
                    <View className="flex-row justify-between">
                      <Text className="text-base font-semibold text-gray-900">Total Amount</Text>
                      <Text className="text-base font-semibold text-gray-900">
                        ₹{totalAmount}
                      </Text>
                    </View>
                  </View>
                </View>
                {renderOrderTimeline()}
              </>
            )}
          </View>
        )}

        {/* Cancel Order Modal */}
        <Modal visible={showCancelModal} transparent animationType="slide">
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: 16,
          }}>
            <View className="bg-white w-full rounded-xl p-6" style={{ maxWidth: 400 }}>
              <Text className="text-xl font-bold text-gray-800 mb-4">Cancel Order</Text>

              <Text className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel this order? This action cannot be undone.
              </Text>

              <Text className="text-sm font-medium text-gray-700 mb-2">Cancellation Reason:</Text>
              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Enter reason for cancellation"
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 12,
                  padding: 12,
                  color: '#1f2937',
                  marginBottom: 16,
                  textAlignVertical: 'top',
                }}
              />

              <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-300 p-3 rounded-lg"
                >
                  <Text className="text-gray-800 font-medium text-center">Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelOrder}
                  className="flex-1 bg-red-600 p-3 rounded-lg"
                >
                  <Text className="text-white font-medium text-center">Confirm Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  });

  return (
    <View className="flex-1 bg-gray-50">
      {/* Loading overlay for mode switching */}
      {isModeChanging && (
        <View className="absolute inset-0 bg-white bg-opacity-50 items-center justify-center z-10">
          <ActivityIndicator size="large" color="#111827" />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onManualRefresh}
            colors={['#000']}
            tintColor="#000"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header */}
        {/* <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Partner Dashboard</Text>
              <StatusBadge online={online} timingChosen={timingChosen} />
            </View>
            <Pressable
              onPress={onManualRefresh}
              className="bg-gray-100 rounded-xl px-4 py-2.5 active:bg-gray-200"
            >
              <Text className="text-gray-700 font-medium">
                {loading ? '🔄' : '↻'} Refresh
              </Text>
            </Pressable>
          </View>
        </View> */}



        {/* Enhanced Orders Section */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">
              {showOrders ? `Available Orders for ${partnername}` : 'Get Started'}
            </Text>
            {showOrders && filteredOrders.length > 0 && (
              <Text className="text-sm text-gray-500">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {!showOrders ? (
            <View className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 items-center">
              <Text className="text-4xl mb-4">🚴</Text>
              <Text className="text-lg font-medium text-gray-700 text-center mb-2">
                Ready to Start Delivering?
              </Text>
              <Text className="text-gray-500 text-center text-sm">
                Switch to <Text className="font-semibold">Online</Text> and choose your availability to see orders here.
              </Text>
            </View>
          ) : (
            <>
              {/* Search and Filter Section */}
              <View className="mb-4">
                <View className=" items-center space-x-3">
                  {/* Search Button */}
                  <Pressable
                    onPress={() => setIsSearchModalVisible(true)}
                    className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3 flex-1"
                  >
                    <Search size={20} color="#6b7280" />
                    <Text className="text-gray-500 ml-2 flex-1">
                      {searchQuery ? `Search: ${searchQuery}` : 'Search orders...'}
                    </Text>
                    {searchQuery && (
                      <Pressable onPress={clearSearch} className="p-1">
                        <X size={16} color="#6b7280" />
                      </Pressable>
                    )}
                  </Pressable>

                  {/* Status Filter */}
                  <View className="w-full mt-2">
                    <StatusFilterDropdown
                      selectedStatus={selectedStatus}
                      onStatusChange={handleStatusChange}
                      isOpen={isStatusDropdownOpen}
                      onToggle={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    />
                  </View>
                </View>

                {/* Active Filters Badge */}
                {(selectedStatus !== 'All' || searchQuery) && (
                  <View className="flex-row items-center flex-wrap mt-2">
                    <Text className="text-sm text-gray-600 mr-2">Active filters:</Text>
                    {selectedStatus !== 'All' && (
                      <View className="bg-blue-100 px-3 py-1 rounded-full mr-2 mb-1">
                        <Text className="text-blue-700 text-sm">Status: {selectedStatus}</Text>
                      </View>
                    )}
                    {searchQuery && (
                      <View className="bg-green-100 px-3 py-1 rounded-full mr-2 mb-1">
                        <Text className="text-green-700 text-sm">Search: {searchQuery}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => {
                        setSelectedStatus('All');
                        clearSearch();
                      }}
                      className="bg-gray-200 px-3 py-1 rounded-full mb-1"
                    >
                      <Text className="text-gray-700 text-sm">Clear All</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <Filters
                allFilterOptions={allFilterOptions}
                selectedFilters={selectedFilters}
                toggleFilter={toggleFilter}
                getOrderColor={getOrderColor}
              />

              <View className="mt-4">
                <FlatList
                  data={filteredOrders}
                  keyExtractor={(it) => it.productorderid + it.itemtotal || it.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => <OrderCard order={item} onOrderUpdate={fetchOrders} />}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                  windowSize={10}
                  ListEmptyComponent={
                    <View className="rounded-2xl border border-gray-200 bg-white p-8 items-center">
                      <Text className="text-3xl mb-3">🔍</Text>
                      <Text className="text-gray-700 font-medium mb-1">No orders found</Text>
                      <Text className="text-gray-500 text-center text-sm">
                        {selectedStatus !== 'All' || searchQuery || selectedFilters.size > 0
                          ? 'Try adjusting your filters or search criteria.'
                          : 'No orders available at the moment. Check back later.'}
                      </Text>
                      {(selectedStatus !== 'All' || searchQuery || selectedFilters.size > 0) && (
                        <Pressable
                          onPress={() => {
                            setSelectedStatus('All');
                            clearSearch();
                            setSelectedFilters(new Set());
                          }}
                          className="mt-3 bg-blue-500 px-4 py-2 rounded-lg"
                        >
                          <Text className="text-white font-medium">Clear All Filters</Text>
                        </Pressable>
                      )}
                    </View>
                  }
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Search Modal */}
      <SearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        onSearch={handleSearch}
      />


    </View>
  );
}