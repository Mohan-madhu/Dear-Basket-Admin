import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";

/* ----------------------------- HELPERS ----------------------------- */

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const toISODate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const litresText = (value) => `${Number(value || 0).toFixed(2)}L`;
const amountText = (value) => `₹${Number(value || 0).toFixed(2)}`;

const getDateRangeByType = (type) => {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const yesterday = new Date(base);
  yesterday.setDate(base.getDate() - 1);

  const tomorrow = new Date(base);
  tomorrow.setDate(base.getDate() + 1);

  const next2 = new Date(base);
  next2.setDate(base.getDate() + 2);

  const last7Start = new Date(base);
  last7Start.setDate(base.getDate() - 6);

  switch (type) {
    case "yesterday":
      return { from: toISODate(yesterday), to: toISODate(yesterday), label: "Yesterday" };
    case "today":
      return { from: toISODate(base), to: toISODate(base), label: "Today" };
    case "tomorrow":
      return { from: toISODate(tomorrow), to: toISODate(tomorrow), label: "Tomorrow" };
    case "next2days":
      return { from: toISODate(base), to: toISODate(next2), label: "Next 2 Days" };
    case "last7days":
      return { from: toISODate(last7Start), to: toISODate(base), label: "Last 7 Days" };
    default:
      return { from: toISODate(base), to: toISODate(base), label: "Today" };
  }
};

const getEntryType = (row) => {
  if (Number(row.cancelled) === 1) return "cancelled";
  if (Number(row.extra) === 1) return "extra";
  return "daily";
};

const getStatusMeta = (row) => {
  if (Number(row.cancelled) === 1) {
    return {
      text: "Cancelled",
      wrap: "bg-red-50 border-red-100",
      textColor: "text-red-700",
      icon: "cancel",
      iconColor: "#ef4444",
    };
  }

  if (Number(row.extra) === 1) {
    return {
      text: "Extra Milk",
      wrap: "bg-amber-50 border-amber-100",
      textColor: "text-amber-700",
      icon: "add-circle",
      iconColor: "#f59e0b",
    };
  }

  return {
    text: "Daily Milk",
    wrap: "bg-emerald-50 border-emerald-100",
    textColor: "text-emerald-700",
    icon: "local-drink",
    iconColor: "#10b981",
  };
};

/* ----------------------------- FILTERS ----------------------------- */

const DATE_FILTERS = [
  { key: "yesterday", label: "Yesterday", icon: "history" },
  { key: "today", label: "Today", icon: "today" },
  { key: "tomorrow", label: "Tomorrow", icon: "event" },
  { key: "next2days", label: "Next 2 Days", icon: "date-range" },
  { key: "last7days", label: "Last 7 Days", icon: "view-week" },
];

const ENTRY_FILTERS = [
  { key: "all", label: "All", icon: "apps" },
  { key: "daily", label: "Daily", icon: "local-drink" },
  { key: "extra", label: "Extra", icon: "add-circle" },
  { key: "cancelled", label: "Cancelled", icon: "cancel" },
];

const QuickDateFilters = ({ selectedFilter, onChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 pt-3 pb-2"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {DATE_FILTERS.map((item) => {
        const isActive = selectedFilter === item.key;

        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            onPress={() => onChange(item.key)}
            className={`mr-3 rounded-full border flex-row items-center ${
              isActive
                ? "bg-blue-600 border-blue-600 px-4 py-2.5"
                : "bg-white border-gray-200 px-4 py-2.5"
            }`}
          >
            <Icon
              name={item.icon}
              size={isActive ? 15 : 15}
              color={isActive ? "#fff" : "#6b7280"}
            />
            <Text
              className={`ml-2 font-semibold ${
                isActive ? "text-white text-xs" : "text-gray-700 text-xs"
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const EntryTypeFilters = ({ selectedFilter, onChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 pt-2 pb-3"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {ENTRY_FILTERS.map((item) => {
        const isActive = selectedFilter === item.key;

        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            onPress={() => onChange(item.key)}
            className={`mr-2 rounded-full border flex-row items-center ${
              isActive
                ? "bg-gray-900 border-gray-900 px-4 py-2.5"
                : "bg-gray-50 border-gray-200 px-4 py-2.5"
            }`}
          >
            <Icon
              name={item.icon}
              size={14}
              color={isActive ? "#fff" : "#6b7280"}
            />
            <Text
              className={`ml-2 text-xs font-semibold ${
                isActive ? "text-white" : "text-gray-700"
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

/* ----------------------------- SUMMARY ----------------------------- */

const CompactStatCard = ({ title, value, subValue, icon, tint }) => {
  return (
    <View className="flex-1 bg-white border border-gray-200 rounded-2xl px-3 py-3 mr-2">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[11px] text-gray-500 font-medium">{title}</Text>
        <Icon name={icon} size={15} color={tint} />
      </View>
      <Text className="text-base font-bold text-gray-900">{value}</Text>
      <Text className="text-[11px] text-gray-500 mt-0.5">{subValue}</Text>
    </View>
  );
};

const DashboardSummary = ({ data, rangeLabel, fromDate, toDate }) => {
  const summary = useMemo(() => {
    const dailyRows = data.filter(
      (x) => Number(x.cancelled) !== 1 && Number(x.extra) !== 1
    );
    const extraRows = data.filter(
      (x) => Number(x.cancelled) !== 1 && Number(x.extra) === 1
    );
    const cancelledRows = data.filter((x) => Number(x.cancelled) === 1);

    const uniqueCount = (rows) => new Set(rows.map((x) => x.userid)).size;
    const sumQty = (rows, key) =>
      rows.reduce((sum, row) => sum + Number(row[key] || row.quantity || 0), 0);

    const dailyMilkUsers = uniqueCount(dailyRows);
    const extraMilkUsers = uniqueCount(extraRows);
    const cancelledUsers = uniqueCount(cancelledRows);

    const dailyMilkLitres = sumQty(dailyRows, "regular_quantity");
    const extraMilkLitres = sumQty(extraRows, "extra_quantity");
    const cancelledLitres = sumQty(cancelledRows, "cancelled_quantity");
    const totalFinalLitres = dailyMilkLitres + extraMilkLitres;

    return {
      dailyMilkUsers,
      extraMilkUsers,
      cancelledUsers,
      dailyMilkLitres,
      extraMilkLitres,
      cancelledLitres,
      totalFinalLitres,
    };
  }, [data]);

  return (
    <View className="px-4 pt-2 pb-2">
      <View className="bg-white border border-gray-200 rounded-3xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1 pr-2">
            <Text className="text-base font-bold text-gray-900">
              Daily Milk Dashboard
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              {rangeLabel}: {fromDate} to {toDate}
            </Text>
          </View>

          <View className="bg-blue-50 px-3 py-2 rounded-2xl border border-blue-100">
            <Text className="text-[11px] text-blue-600 font-medium">Total</Text>
            <Text className="text-base font-bold text-blue-800">
              {litresText(summary.totalFinalLitres)}
            </Text>
          </View>
        </View>

        <View className="flex-row mb-2">
          <CompactStatCard
            title="Daily"
            value={summary.dailyMilkUsers}
            subValue={litresText(summary.dailyMilkLitres)}
            icon="local-drink"
            tint="#10b981"
          />
          <CompactStatCard
            title="Extra"
            value={summary.extraMilkUsers}
            subValue={litresText(summary.extraMilkLitres)}
            icon="add-circle"
            tint="#f59e0b"
          />
          <View className="flex-1">
            <CompactStatCard
              title="Cancelled"
              value={summary.cancelledUsers}
              subValue={litresText(summary.cancelledLitres)}
              icon="cancel"
              tint="#ef4444"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

/* ----------------------------- ROW CARD ----------------------------- */

const DailyEntryCard = ({ row }) => {
  const status = getStatusMeta(row);

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      layout={Layout.springify()}
      className="bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-2.5"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-bold text-gray-900">
            {formatDate(row.date)}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-1">
            {row.orderid || "N/A"}
          </Text>
        </View>

        <View className={`px-3 py-1.5 rounded-full border ${status.wrap}`}>
          <Text className={`text-[11px] font-semibold ${status.textColor}`}>
            {status.text}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between">
        <View className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex-1 mr-2">
          <Text className="text-[11px] text-gray-500">Quantity</Text>
          <Text className="text-sm font-bold text-gray-900 mt-1">
            {litresText(row.quantity)}
          </Text>
        </View>

        <View className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex-1">
          <Text className="text-[11px] text-gray-500">Amount</Text>
          <Text className="text-sm font-bold text-gray-900 mt-1">
            {amountText(row.amount)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

/* ----------------------------- USER DETAILS ----------------------------- */

const UserDetailsCard = ({ userData, entryFilter }) => {
  const filteredRows = useMemo(() => {
    if (entryFilter === "all") return userData.rows || [];
    return (userData.rows || []).filter((row) => getEntryType(row) === entryFilter);
  }, [userData.rows, entryFilter]);

  const summary = useMemo(() => {
    const regularLitres = filteredRows
      .filter((x) => Number(x.cancelled) !== 1 && Number(x.extra) !== 1)
      .reduce((sum, x) => sum + Number(x.regular_quantity || x.quantity || 0), 0);

    const extraLitres = filteredRows
      .filter((x) => Number(x.cancelled) !== 1 && Number(x.extra) === 1)
      .reduce((sum, x) => sum + Number(x.extra_quantity || x.quantity || 0), 0);

    const cancelledLitres = filteredRows
      .filter((x) => Number(x.cancelled) === 1)
      .reduce((sum, x) => sum + Number(x.cancelled_quantity || x.quantity || 0), 0);

    const totalAmount = filteredRows.reduce(
      (sum, x) => sum + Number(x.amount || 0),
      0
    );

    return {
      regularLitres,
      extraLitres,
      cancelledLitres,
      totalAmount,
    };
  }, [filteredRows]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      layout={Layout.springify()}
      className="mx-3 mb-3 mt-1 bg-white border border-gray-200 rounded-2xl overflow-hidden"
    >
      <View className="p-3">
        <View className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-3">
          <View className="flex-row items-center mb-2">
            <Icon name="person" size={16} color="#2563eb" />
            <Text className="text-sm font-semibold text-gray-900 ml-2">
              {userData.username || "Unknown User"}
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <Icon name="badge" size={15} color="#8b5cf6" />
            <Text className="text-xs text-gray-600 ml-2">
              User ID: {userData.userid || "N/A"}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Icon name="groups" size={15} color="#10b981" />
            <Text className="text-xs text-gray-600 ml-2 flex-1">
              {userData.partnername || "Unknown Partner"} ({userData.mappedpartnerid || "N/A"})
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-3">
          <View className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mr-2">
            <Text className="text-[10px] text-gray-500">Daily</Text>
            <Text className="text-sm font-bold text-gray-900 mt-1">
              {litresText(summary.regularLitres)}
            </Text>
          </View>

          <View className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mr-2">
            <Text className="text-[10px] text-gray-500">Extra</Text>
            <Text className="text-sm font-bold text-gray-900 mt-1">
              {litresText(summary.extraLitres)}
            </Text>
          </View>

          <View className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <Text className="text-[10px] text-gray-500">Cancelled</Text>
            <Text className="text-sm font-bold text-gray-900 mt-1">
              {litresText(summary.cancelledLitres)}
            </Text>
          </View>
        </View>

        <View className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-3">
          <Text className="text-[11px] text-blue-600">Total Amount</Text>
          <Text className="text-sm font-bold text-blue-800 mt-1">
            {amountText(summary.totalAmount)}
          </Text>
        </View>

        <Text className="text-sm font-bold text-gray-900 mb-2">Entries</Text>

        {filteredRows.length === 0 ? (
          <View className="bg-gray-50 border border-gray-100 rounded-xl py-5 items-center">
            <Text className="text-gray-500 text-sm">No entries in this filter</Text>
          </View>
        ) : (
          filteredRows.map((row, index) => (
            <DailyEntryCard
              key={`${row.orderid}-${row.date}-${index}`}
              row={row}
            />
          ))
        )}
      </View>
    </Animated.View>
  );
};

/* ----------------------------- PARTNER / USER LIST ----------------------------- */

const PartnerWiseDashboardList = ({ rows, entryFilter }) => {
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  const filteredRows = useMemo(() => {
    if (entryFilter === "all") return rows || [];
    return (rows || []).filter((row) => getEntryType(row) === entryFilter);
  }, [rows, entryFilter]);

  const groupedPartners = useMemo(() => {
    const partnerMap = {};

    filteredRows.forEach((row) => {
      const partnerKey = row.mappedpartnerid || "NO_PARTNER";

      if (!partnerMap[partnerKey]) {
        partnerMap[partnerKey] = {
          mappedpartnerid: row.mappedpartnerid,
          partnername: row.partnername || "Unknown Partner",
          usersMap: {},
        };
      }

      const userKey = row.userid || "NO_USER";

      if (!partnerMap[partnerKey].usersMap[userKey]) {
        partnerMap[partnerKey].usersMap[userKey] = {
          userid: row.userid,
          username: row.username || "Unknown User",
          mappedpartnerid: row.mappedpartnerid,
          partnername: row.partnername || "Unknown Partner",
          rows: [],
        };
      }

      partnerMap[partnerKey].usersMap[userKey].rows.push(row);
    });

    return Object.values(partnerMap).map((partner) => {
      const users = Object.values(partner.usersMap).map((user) => {
        const totalLitres = user.rows.reduce(
          (sum, x) => sum + Number(x.quantity || 0),
          0
        );
        const totalAmount = user.rows.reduce(
          (sum, x) => sum + Number(x.amount || 0),
          0
        );

        return {
          ...user,
          totalLitres,
          totalAmount,
        };
      });

      return {
        mappedpartnerid: partner.mappedpartnerid,
        partnername: partner.partnername,
        users,
      };
    });
  }, [filteredRows]);

  const onTogglePartner = (partnerId) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null);
      setExpandedUser(null);
    } else {
      setExpandedPartner(partnerId);
      setExpandedUser(null);
    }
  };

  const onToggleUser = (userId) => {
    setExpandedUser((prev) => (prev === userId ? null : userId));
  };

  if (!groupedPartners.length) {
    return (
      <View className="px-4 pb-10">
        <Animated.View
          entering={FadeIn.duration(200)}
          className="bg-white border border-gray-200 rounded-3xl py-10 items-center mt-2"
        >
          <View className="bg-gray-100 p-5 rounded-full">
            <Icon name="inventory-2" size={38} color="#9ca3af" />
          </View>
          <Text className="text-gray-700 text-base mt-4 font-semibold">
            No dashboard data found
          </Text>
          <Text className="text-gray-400 text-sm mt-1">
            Try changing date or type filter
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="px-4 pb-10">
      {groupedPartners.map((partner, partnerIndex) => {
        const isPartnerExpanded = expandedPartner === partner.mappedpartnerid;

        return (
          <Animated.View
            key={partner.mappedpartnerid || `partner-${partnerIndex}`}
            entering={FadeIn.delay(70 * partnerIndex)}
            exiting={FadeOut}
            layout={Layout.springify()}
            className="bg-white border border-gray-200 rounded-3xl mb-4 overflow-hidden"
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onTogglePartner(partner.mappedpartnerid)}
              className="px-4 py-4"
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-bold text-gray-900">
                    {partner.mappedpartnerid || "No Partner"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {partner.partnername}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View className="bg-gray-100 px-3 py-1.5 rounded-full mr-2">
                    <Text className="text-[11px] font-semibold text-gray-700">
                      {partner.users.length} users
                    </Text>
                  </View>
                  <Icon
                    name={isPartnerExpanded ? "expand-less" : "expand-more"}
                    size={24}
                    color="#4b5563"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {isPartnerExpanded && (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                layout={Layout.springify()}
                className="px-3 pb-3"
              >
                {partner.users.map((user, userIndex) => {
                  const isUserExpanded = expandedUser === user.userid;

                  return (
                    <Animated.View
                      key={user.userid || `${partner.mappedpartnerid}-${userIndex}`}
                      layout={Layout.springify()}
                      className="mb-3 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden"
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => onToggleUser(user.userid)}
                        className="px-4 py-4"
                      >
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 pr-3">
                            <Text className="text-sm font-bold text-gray-900">
                              {user.username || "Unknown User"}
                            </Text>
                            <Text className="text-[11px] text-gray-500 mt-1">
                              {user.userid || "N/A"}
                            </Text>
                            <Text className="text-[11px] text-gray-500 mt-1">
                              {user.rows.length} entries
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="text-sm font-bold text-gray-900">
                              {litresText(user.totalLitres)}
                            </Text>
                            <Text className="text-[11px] text-gray-500 mt-1">
                              {amountText(user.totalAmount)}
                            </Text>
                            <Icon
                              name={
                                isUserExpanded
                                  ? "keyboard-arrow-up"
                                  : "keyboard-arrow-down"
                              }
                              size={22}
                              color="#6b7280"
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isUserExpanded && (
                        <UserDetailsCard
                          userData={user}
                          entryFilter={entryFilter}
                        />
                      )}
                    </Animated.View>
                  );
                })}
              </Animated.View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
};

/* ----------------------------- MAIN PAGE ----------------------------- */

const DailyMilk_Dashboard_Admin = () => {
  const [dashboardRows, setDashboardRows] = useState([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState("today");
  const [selectedEntryFilter, setSelectedEntryFilter] = useState("all");
  const [selectedRange, setSelectedRange] = useState(getDateRangeByType("today"));
  const { setLoading } = useLoading();

  const fetchDashboardData = async (filterType) => {
    try {
      const range = getDateRangeByType(filterType);
      setSelectedRange(range);

      setLoading(true, `Fetching dashboard (${range.label})...`);

      const res = await API.GET(
        `DailyMilkStatus/Dashboard?from=${range.from}&to=${range.to}`
      );

      setDashboardRows(res.Response || []);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedDateFilter);
  }, []);

  const onDateFilterChange = (filterType) => {
    setSelectedDateFilter(filterType);
    fetchDashboardData(filterType);
  };

  const filteredSummaryRows = useMemo(() => {
    return dashboardRows || [];
  }, [dashboardRows]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Header */}
        <View className="px-4 pt-5 pb-2">
          <View className="bg-white border border-gray-200 rounded-3xl px-4 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center">
                <Icon name="analytics" size={22} color="#2563eb" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  Daily Milk Dashboard
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Admin overview by date and entry type
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Date Filters */}
        <QuickDateFilters
          selectedFilter={selectedDateFilter}
          onChange={onDateFilterChange}
        />

        {/* Summary */}
        <DashboardSummary
          data={filteredSummaryRows}
          rangeLabel={selectedRange.label}
          fromDate={selectedRange.from}
          toDate={selectedRange.to}
        />

        {/* Entry Type Filter */}
        <EntryTypeFilters
          selectedFilter={selectedEntryFilter}
          onChange={setSelectedEntryFilter}
        />

        {/* Grouped Content */}
        <PartnerWiseDashboardList
          rows={dashboardRows}
          entryFilter={selectedEntryFilter}
        />
      </ScrollView>
    </View>
  );
};

export default DailyMilk_Dashboard_Admin;