import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
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
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getRegularQty = (row) => toNumber(row?.regular_quantity ?? row?.quantity);
const getExtraQty = (row) => toNumber(row?.extra_quantity ?? row?.extra);
const getPregnancyQty = (row) => toNumber(row?.pregnancy_quantity);
const getCancelledQty = (row) => toNumber(row?.cancelled_quantity);
const getTotalQty = (row) => {
  const total = toNumber(row?.total_quantity);
  if (total > 0 || getCancelledQty(row) > 0 || Number(row?.cancelled) === 1) {
    return total;
  }
  return getRegularQty(row) + getExtraQty(row) + getPregnancyQty(row);
};
const getUnitPrice = (row) => {
  const regularQty = getRegularQty(row);
  const amount = toNumber(row?.amount);
  return regularQty > 0 ? amount / regularQty : 0;
};
const getEffectiveAmount = (row) => getUnitPrice(row) * getTotalQty(row);
const getQtyByFilter = (row, filterType) => {
  if (filterType === "daily") return isCancelledRow(row) ? 0 : getRegularQty(row);
  if (filterType === "extra") return isCancelledRow(row) ? 0 : getExtraQty(row);
  if (filterType === "pregnancy") return isCancelledRow(row) ? 0 : getPregnancyQty(row);
  if (filterType === "cancelled") return getCancelledQty(row);
  return getTotalQty(row);
};
const getAmountByFilter = (row, filterType) => {
  if (filterType === "pregnancy") return 0;
  if (filterType === "all") {
    return getUnitPrice(row) * (getRegularQty(row) + getExtraQty(row));
  }
  return getUnitPrice(row) * getQtyByFilter(row, filterType);
};

const isCancelledRow = (row) => Number(row?.cancelled) === 1 || getCancelledQty(row) > 0;
const hasExtraQty = (row) => getExtraQty(row) > 0;
const hasPregnancyQty = (row) => getPregnancyQty(row) > 0;
const hasRegularQty = (row) => getRegularQty(row) > 0;

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

const matchesEntryFilter = (row, filterType) => {
  if (filterType === "all") return true;
  if (filterType === "cancelled") return isCancelledRow(row);
  if (filterType === "extra") return !isCancelledRow(row) && hasExtraQty(row);
  if (filterType === "pregnancy") return !isCancelledRow(row) && hasPregnancyQty(row);
  if (filterType === "daily") return !isCancelledRow(row) && hasRegularQty(row);
  return true;
};

const normalizeDeliveryType = (value) =>
  `${value || ""}`.trim().toLowerCase().replace(/[\s_-]+/g, "");

const matchesSessionFilter = (row, filterType) => {
  if (filterType === "all") return true;

  const deliveryType = normalizeDeliveryType(row?.milkdeliverytype);

  if (filterType === "other") {
    return deliveryType === "other";
  }

  return deliveryType === filterType;
};

const getStatusMetaByType = (entryType) => {
  if (entryType === "cancelled") {
    return {
      text: "Cancelled",
      wrap: "bg-red-50 border-red-100",
      textColor: "text-red-700",
      icon: "cancel",
      iconColor: "#ef4444",
    };
  }

  if (entryType === "extra") {
    return {
      text: "Extra Milk",
      wrap: "bg-amber-50 border-amber-100",
      textColor: "text-amber-700",
      icon: "add-circle",
      iconColor: "#f59e0b",
    };
  }

  if (entryType === "pregnancy") {
    return {
      text: "Pregnancy Free",
      wrap: "bg-pink-50 border-pink-100",
      textColor: "text-pink-700",
      icon: "favorite",
      iconColor: "#ec4899",
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

const splitRowToEntries = (row) => {
  const entries = [];
  const regularQty = getRegularQty(row);
  const extraQty = getExtraQty(row);
  const pregnancyQty = getPregnancyQty(row);
  const cancelledQty = getCancelledQty(row);
  const unitPrice = getUnitPrice(row);

  if (isCancelledRow(row)) {
    if (cancelledQty > 0) {
      entries.push({
        ...row,
        entryType: "cancelled",
        displayQuantity: cancelledQty,
        displayAmount: unitPrice * cancelledQty,
      });
    }
    return entries;
  }

  if (regularQty > 0) {
    entries.push({
      ...row,
      entryType: "daily",
      displayQuantity: regularQty,
      displayAmount: unitPrice * regularQty,
    });
  }

  if (extraQty > 0) {
    entries.push({
      ...row,
      entryType: "extra",
      displayQuantity: extraQty,
      displayAmount: unitPrice * extraQty,
    });
  }

  if (pregnancyQty > 0) {
    entries.push({
      ...row,
      entryType: "pregnancy",
      displayQuantity: pregnancyQty,
      displayAmount: 0,
    });
  }

  if (!entries.length) {
    entries.push({
      ...row,
      entryType: "daily",
      displayQuantity: getTotalQty(row),
      displayAmount: getEffectiveAmount(row),
    });
  }

  return entries;
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
  { key: "pregnancy", label: "Pregnancy", icon: "favorite" },
  { key: "cancelled", label: "Cancelled", icon: "cancel" },
];

const SESSION_FILTERS = [
  { key: "all", label: "All", icon: "apps" },
  { key: "morning", label: "Morning", icon: "wb-sunny" },
  { key: "evening", label: "Evening", icon: "nights-stay" },
  { key: "other", label: "Other", icon: "more-horiz" },
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
            className={`mr-3 rounded-full border flex-row items-center ${isActive
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
              className={`ml-2 font-semibold ${isActive ? "text-white text-xs" : "text-gray-700 text-xs"
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
            className={`mr-2 rounded-full border flex-row items-center ${isActive
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
              className={`ml-2 text-xs font-semibold ${isActive ? "text-white" : "text-gray-700"
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
    <View className="flex-1 bg-white border border-gray-200 rounded-2xl px-3 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[11px] text-gray-500 font-medium">{title}</Text>
        <Icon name={icon} size={15} color={tint} />
      </View>
      <Text className="text-base font-bold text-gray-900">{value}</Text>
      <Text className="text-[11px] text-gray-500 mt-0.5">{subValue}</Text>
    </View>
  );
};

const DashboardSummary = ({ data, entryFilter, rangeLabel, fromDate, toDate }) => {
  const summary = useMemo(() => {
    const visibleEntries = (data || [])
      .flatMap((row) => splitRowToEntries(row))
      .filter((entry) => entryFilter === "all" || entry.entryType === entryFilter);

    const entriesByType = (entryType) =>
      visibleEntries.filter((entry) => entry.entryType === entryType);

    const uniqueCount = (entries) => new Set(entries.map((x) => x.userid)).size;
    const sumQty = (entries) =>
      entries.reduce((sum, entry) => sum + toNumber(entry.displayQuantity), 0);

    const dailyEntries = entriesByType("daily");
    const extraEntries = entriesByType("extra");
    const pregnancyEntries = entriesByType("pregnancy");
    const cancelledEntries = entriesByType("cancelled");

    const dailyMilkUsers = uniqueCount(dailyEntries);
    const extraMilkUsers = uniqueCount(extraEntries);
    const pregnancyMilkUsers = uniqueCount(pregnancyEntries);
    const cancelledUsers = uniqueCount(cancelledEntries);

    const dailyMilkLitres = sumQty(dailyEntries);
    const extraMilkLitres = sumQty(extraEntries);
    const pregnancyMilkLitres = sumQty(pregnancyEntries);
    const cancelledLitres = sumQty(cancelledEntries);
    const totalFinalLitres = sumQty(visibleEntries);

    return {
      dailyMilkUsers,
      extraMilkUsers,
      pregnancyMilkUsers,
      cancelledUsers,
      dailyMilkLitres,
      extraMilkLitres,
      pregnancyMilkLitres,
      cancelledLitres,
      totalFinalLitres,
    };
  }, [data, entryFilter]);

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
          <View className="flex-1 mr-2">
            <CompactStatCard
              title="Daily"
              value={summary.dailyMilkUsers}
              subValue={litresText(summary.dailyMilkLitres)}
              icon="local-drink"
              tint="#10b981"
            />
          </View>
          <View className="flex-1">
            <CompactStatCard
              title="Extra"
              value={summary.extraMilkUsers}
              subValue={litresText(summary.extraMilkLitres)}
              icon="add-circle"
              tint="#f59e0b"
            />
          </View>
        </View>

        <View className="flex-row">
          <View className="flex-1 mr-2">
            <CompactStatCard
              title="Pregnancy"
              value={summary.pregnancyMilkUsers}
              subValue={`${litresText(summary.pregnancyMilkLitres)} free`}
              icon="favorite"
              tint="#ec4899"
            />
          </View>
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

const SessionFilters = ({ selectedFilter, onChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 pt-0 pb-3"
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {SESSION_FILTERS.map((item) => {
        const isActive = selectedFilter === item.key;

        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            onPress={() => onChange(item.key)}
            className={`mr-2 rounded-full border flex-row items-center ${isActive
              ? "bg-indigo-600 border-indigo-600 px-4 py-2.5"
              : "bg-white border-gray-200 px-4 py-2.5"
              }`}
          >
            <Icon
              name={item.icon}
              size={14}
              color={isActive ? "#fff" : "#6b7280"}
            />
            <Text
              className={`ml-2 text-xs font-semibold ${isActive ? "text-white" : "text-gray-700"
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

/* ----------------------------- ROW CARD ----------------------------- */

const DailyEntryCard = ({ entry, showMeta = true }) => {
  const status = getStatusMetaByType(entry.entryType);

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      layout={Layout.springify()}
      className="bg-white border border-gray-100 rounded-xl px-2.5 py-2 mb-2"
    >
      {showMeta ? (
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-bold text-gray-900">
              {formatDate(entry.date)}
            </Text>
            <Text className="text-[10px] text-gray-500 mt-0.5">
              {entry.orderid || "N/A"}
            </Text>
          </View>

          <View className={`px-2.5 py-1 rounded-full border ${status.wrap}`}>
            <Text className={`text-[10px] font-semibold ${status.textColor}`}>
              {status.text}
            </Text>
          </View>
        </View>
      ) : (
        <View className="items-end mb-1.5">
          <View className={`px-2.5 py-1 rounded-full border ${status.wrap}`}>
            <Text className={`text-[10px] font-semibold ${status.textColor}`}>
              {status.text}
            </Text>
          </View>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] text-gray-600">
          Qty <Text className="font-bold text-gray-900">{litresText(entry.displayQuantity)}</Text>
        </Text>
        <Text className="text-[11px] text-gray-600">
          Amt <Text className={`font-bold ${entry.entryType === "pregnancy" ? "text-pink-700" : "text-gray-900"}`}>
            {entry.entryType === "pregnancy" ? "Free" : amountText(entry.displayAmount)}
          </Text>
        </Text>
      </View>
    </Animated.View>
  );
};

/* ----------------------------- USER DETAILS ----------------------------- */

const UserDetailsCard = ({ userData, entryFilter }) => {
  const filteredEntries = useMemo(() => {
    const allEntries = (userData.rows || []).flatMap((row) => splitRowToEntries(row));
    if (entryFilter === "all") return allEntries;
    return allEntries.filter((entry) => entry.entryType === entryFilter);
  }, [userData.rows, entryFilter]);

  const summary = useMemo(() => {
    const regularLitres = filteredEntries
      .filter((x) => x.entryType === "daily")
      .reduce((sum, x) => sum + toNumber(x.displayQuantity), 0);

    const extraLitres = filteredEntries
      .filter((x) => x.entryType === "extra")
      .reduce((sum, x) => sum + toNumber(x.displayQuantity), 0);

    const pregnancyLitres = filteredEntries
      .filter((x) => x.entryType === "pregnancy")
      .reduce((sum, x) => sum + toNumber(x.displayQuantity), 0);

    const cancelledLitres = filteredEntries
      .filter((x) => x.entryType === "cancelled")
      .reduce((sum, x) => sum + toNumber(x.displayQuantity), 0);

    const totalAmount = filteredEntries.reduce(
      (sum, x) => sum + toNumber(x.displayAmount),
      0
    );

    return {
      regularLitres,
      extraLitres,
      pregnancyLitres,
      cancelledLitres,
      totalAmount,
    };
  }, [filteredEntries]);

  const isSameEntryGroup = (current, previous) => {
    if (!current || !previous) return false;
    if (current.transid && previous.transid) {
      return current.transid === previous.transid;
    }
    return (
      current.userid === previous.userid &&
      current.orderid === previous.orderid &&
      current.date === previous.date
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      layout={Layout.springify()}
      className="mx-3 mb-3 mt-1 bg-white border border-gray-200 rounded-2xl overflow-hidden"
    >
      <View className="p-2.5">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-gray-900">
              {userData.username || "Unknown User"}
            </Text>
            <Text className="text-[10px] text-gray-500 mt-0.5">
              {userData.userid || "N/A"} • {userData.partnername || "Unknown Partner"} ({userData.mappedpartnerid || "N/A"})
            </Text>
          </View>
          <Text className="text-[11px] font-bold text-blue-700">
            {amountText(summary.totalAmount)}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center mb-2">
          <View className="bg-emerald-50 px-2 py-1 rounded-full mr-1.5">
            <Text className="text-[10px] font-semibold text-emerald-700">D {litresText(summary.regularLitres)}</Text>
          </View>
          <View className="bg-amber-50 px-2 py-1 rounded-full mr-1.5">
            <Text className="text-[10px] font-semibold text-amber-700">E {litresText(summary.extraLitres)}</Text>
          </View>
          <View className="bg-pink-50 px-2 py-1 rounded-full mr-1.5">
            <Text className="text-[10px] font-semibold text-pink-700">P {litresText(summary.pregnancyLitres)}</Text>
          </View>
          <View className="bg-red-50 px-2 py-1 rounded-full">
            <Text className="text-[10px] font-semibold text-red-700">C {litresText(summary.cancelledLitres)}</Text>
          </View>
        </View>

        {filteredEntries.length === 0 ? (
          <View className="bg-gray-50 border border-gray-100 rounded-xl py-4 items-center">
            <Text className="text-gray-500 text-xs">No entries in this filter</Text>
          </View>
        ) : (
          filteredEntries.map((entry, index) => {
            const prevEntry = filteredEntries[index - 1];
            const showMeta = index === 0 || !isSameEntryGroup(entry, prevEntry);

            return (
              <DailyEntryCard
                key={`${entry.orderid}-${entry.date}-${entry.entryType}-${index}`}
                entry={entry}
                showMeta={showMeta}
              />
            );
          })
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
    return (rows || []).filter((row) => matchesEntryFilter(row, entryFilter));
  }, [rows, entryFilter]);

  // const groupedPartners = useMemo(() => {
  //   const partnerMap = {};

  //   filteredRows.forEach((row) => {
  //     const partnerKey = row.mappedpartnerid || "NO_PARTNER";

  //     if (!partnerMap[partnerKey]) {
  //       partnerMap[partnerKey] = {
  //         mappedpartnerid: row.mappedpartnerid,
  //         partnername: row.partnername || "Unknown Partner",
  //         usersMap: {},
  //       };
  //     }

  //     const userKey = row.userid || "NO_USER";

  //     if (!partnerMap[partnerKey].usersMap[userKey]) {
  //       partnerMap[partnerKey].usersMap[userKey] = {
  //         userid: row.userid,
  //         username: row.username || "Unknown User",
  //         mappedpartnerid: row.mappedpartnerid,
  //         partnername: row.partnername || "Unknown Partner",
  //         rows: [],
  //       };
  //     }

  //     partnerMap[partnerKey].usersMap[userKey].rows.push(row);
  //   });

  //   console.log("Partner Map:", partnerMap['369DP-B'].usersMap['369DU-E']);



  //   return Object.values(partnerMap).map((partner) => {
  //     const users = Object.values(partner.usersMap || {}).map((user) => {
  //       const totalLitres = (user.rows || []).reduce(
  //         (sum, x) => sum + Number(x.quantity || 0),
  //         0
  //       );

  //       const totalAmount = (user.rows || []).reduce(
  //         (sum, x) => sum + Number(x.amount || 0),
  //         0
  //       );

  //       return {
  //         ...user,
  //         totalLitres,
  //         totalAmount,
  //       };
  //     });

  //     const partnerDailyLitres = users.reduce((sum, u) => {
  //       const userDaily = (u.rows || [])
  //         .filter((row) => Number(row.cancelled) !== 1 && Number(row.extra) !== 1)
  //         .reduce(
  //           (innerSum, row) =>
  //             innerSum + Number(row.regular_quantity || row.quantity || 0),
  //           0
  //         );

  //       return sum + userDaily;
  //     }, 0);

  //     const partnerExtraLitres = users.reduce((sum, u) => {
  //       const userExtra = (u.rows || [])
  //         .filter((row) => Number(row.cancelled) !== 1 && Number(row.extra) === 1)
  //         .reduce(
  //           (innerSum, row) =>
  //             innerSum + Number(row.extra_quantity || row.quantity || 0),
  //           0
  //         );

  //       return sum + userExtra;
  //     }, 0);

  //     const partnerCancelledLitres = users.reduce((sum, u) => {
  //       const userCancelled = (u.rows || [])
  //         .filter((row) => Number(row.cancelled) === 1)
  //         .reduce(
  //           (innerSum, row) =>
  //             innerSum + Number(row.cancelled_quantity || row.quantity || 0),
  //           0
  //         );

  //       return sum + userCancelled;
  //     }, 0);

  //     const partnerTotalLitres = partnerDailyLitres + partnerExtraLitres;

  //     return {
  //       mappedpartnerid: partner.mappedpartnerid,
  //       partnername: partner.partnername,
  //       users,
  //       partnerDailyLitres,
  //       partnerExtraLitres,
  //       partnerCancelledLitres,
  //       partnerTotalLitres,
  //     };
  //   });
  // }, [filteredRows]);


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
      const users = Object.values(partner.usersMap || {}).map((user) => {
        const totals = (user.rows || []).reduce((acc, row) => {
          acc.totalLitres += getQtyByFilter(row, entryFilter);
          acc.totalAmount += getAmountByFilter(row, entryFilter);
          return acc;
        }, { totalLitres: 0, totalAmount: 0 });
        const visibleEntries = (user.rows || [])
          .flatMap((row) => splitRowToEntries(row))
          .filter((entry) => entryFilter === "all" || entry.entryType === entryFilter);

        return {
          ...user,
          totalLitres: totals.totalLitres,
          totalAmount: totals.totalAmount,
          entriesCount: visibleEntries.length,
        };
      });

      const partnerDailyLitres = users.reduce((sum, u) => {
        const userDaily = (u.rows || [])
          .reduce((innerSum, row) => innerSum + (isCancelledRow(row) ? 0 : getRegularQty(row)), 0);

        return sum + userDaily;
      }, 0);

      const partnerExtraLitres = users.reduce((sum, u) => {
        const userExtra = (u.rows || [])
          .reduce((innerSum, row) => innerSum + (isCancelledRow(row) ? 0 : getExtraQty(row)), 0);

        return sum + userExtra;
      }, 0);

      const partnerPregnancyLitres = users.reduce((sum, u) => {
        const userPregnancy = (u.rows || [])
          .reduce((innerSum, row) => innerSum + (isCancelledRow(row) ? 0 : getPregnancyQty(row)), 0);

        return sum + userPregnancy;
      }, 0);

      const partnerCancelledLitres = users.reduce((sum, u) => {
        const userCancelled = (u.rows || [])
          .reduce((innerSum, row) => innerSum + getCancelledQty(row), 0);

        return sum + userCancelled;
      }, 0);

      const partnerTotalLitres = users.reduce((sum, u) => sum + Number(u.totalLitres || 0), 0);

      const partnerTotalAmount = users.reduce(
        (sum, u) => sum + Number(u.totalAmount || 0),
        0
      );

      return {
        mappedpartnerid: partner.mappedpartnerid,
        partnername: partner.partnername,
        users,
        partnerDailyLitres,
        partnerExtraLitres,
        partnerPregnancyLitres,
        partnerCancelledLitres,
        partnerTotalLitres,
        partnerTotalAmount,
      };
    });
  }, [filteredRows, entryFilter]);

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

                <View className="items-end">
                  <View className="flex-row items-center mb-1.5">
                    <View className="bg-gray-100 px-3 py-1.5 rounded-full mr-2">
                      <Text className="text-[11px] font-semibold text-gray-700">
                        {partner.users.length} users
                      </Text>
                    </View>

                    <View className="bg-blue-50 px-3 py-1.5 rounded-full mr-2">
                      <Text className="text-[11px] font-semibold text-blue-700">
                        {litresText(partner.partnerTotalLitres)}
                      </Text>
                    </View>

                    <Icon
                      name={isPartnerExpanded ? "expand-less" : "expand-more"}
                      size={24}
                      color="#4b5563"
                    />
                  </View>

                  <View className="flex-row flex-wrap justify-end">
                    <View className="bg-emerald-50 px-2.5 py-1 rounded-full mr-1.5">
                      <Text className="text-[10px] font-semibold text-emerald-700">
                        D {litresText(partner.partnerDailyLitres)}
                      </Text>
                    </View>

                    <View className="bg-amber-50 px-2.5 py-1 rounded-full mr-1.5">
                      <Text className="text-[10px] font-semibold text-amber-700">
                        E {litresText(partner.partnerExtraLitres)}
                      </Text>
                    </View>

                    <View className="bg-pink-50 px-2.5 py-1 rounded-full mr-1.5">
                      <Text className="text-[10px] font-semibold text-pink-700">
                        P {litresText(partner.partnerPregnancyLitres)}
                      </Text>
                    </View>

                    <View className="bg-red-50 px-2.5 py-1 rounded-full">
                      <Text className="text-[10px] font-semibold text-red-700">
                        C {litresText(partner.partnerCancelledLitres)}
                      </Text>
                    </View>
                  </View>
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
                              {user.entriesCount} entries
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
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("all");
  const [selectedRange, setSelectedRange] = useState(getDateRangeByType("today"));
  const { setLoading } = useLoading();

  const fetchDashboardData = async (filterType) => {
    try {
      const range = getDateRangeByType(filterType);
      setSelectedRange(range);

      setLoading(true, `Fetching dashboard (${range.label})...`);

      console.log(  `DailyMilkStatus/Dashboard?from=${range.from}&to=${range.to}`)
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

  const sessionFilteredRows = useMemo(() => {
    return (dashboardRows || []).filter((row) =>
      matchesSessionFilter(row, selectedSessionFilter)
    );
  }, [dashboardRows, selectedSessionFilter]);

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
          data={sessionFilteredRows}
          entryFilter={selectedEntryFilter}
          rangeLabel={selectedRange.label}
          fromDate={selectedRange.from}
          toDate={selectedRange.to}
        />

        {/* Entry Type Filter */}
        <EntryTypeFilters
          selectedFilter={selectedEntryFilter}
          onChange={setSelectedEntryFilter}
        />

        {/* Session Filter */}
        <SessionFilters
          selectedFilter={selectedSessionFilter}
          onChange={setSelectedSessionFilter}
        />

        {/* Grouped Content */}
        <PartnerWiseDashboardList
          rows={sessionFilteredRows}
          entryFilter={selectedEntryFilter}
        />
      </ScrollView>
    </View>
  );
};

export default DailyMilk_Dashboard_Admin;
