import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";

const Tab = createMaterialTopTabNavigator();

const DURATION_FILTERS = [
  { key: "TODAY", label: "Today" },
  { key: "TOMORROW", label: "Tomorrow" },
  { key: "WEEK", label: "Week" },
  { key: "MONTH", label: "Month" },
  { key: "YEAR", label: "Year" },
  { key: "ALL", label: "All" },
  { key: "CUSTOM", label: "Custom" },
];

const parseNumber = (value) => Number(value || 0);

const formatCurrency = (value) => `₹${parseNumber(value).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

const getStatusMeta = (status, order) => {
  const value = (status || "").toLowerCase();

  if (order?.ordercancelled) {
    return {
      label: "Cancelled",
      icon: "cancel",
      bg: "#fef2f2",
      text: "#dc2626",
      border: "#fecaca",
    };
  }

  if (order?.orderdelivered || value.includes("delivered")) {
    return {
      label: "Delivered",
      icon: "check-circle",
      bg: "#ecfdf5",
      text: "#059669",
      border: "#a7f3d0",
    };
  }

  if (order?.orderoutofdelivery || value.includes("out")) {
    return {
      label: "Out for Delivery",
      icon: "local-shipping",
      bg: "#f5f3ff",
      text: "#7c3aed",
      border: "#ddd6fe",
    };
  }

  if (order?.orderpacked || value.includes("pack")) {
    return {
      label: "Packed",
      icon: "inventory-2",
      bg: "#fff7ed",
      text: "#ea580c",
      border: "#fed7aa",
    };
  }

  if (order?.orderconfirmed || value.includes("confirm")) {
    return {
      label: "Confirmed",
      icon: "verified",
      bg: "#eff6ff",
      text: "#2563eb",
      border: "#bfdbfe",
    };
  }

  return {
    label: status || "Placed",
    icon: "pending-actions",
    bg: "#fefce8",
    text: "#a16207",
    border: "#fde68a",
  };
};

const safeParseOrderData = (orderdata) => {
  if (!orderdata) return [];
  if (Array.isArray(orderdata)) return orderdata;

  try {
    const parsed = JSON.parse(orderdata);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const SummaryCard = ({ title, value, icon, subValue }) => {
  return (
    <View
      style={{
        width: "48.5%",
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600" }}>
            {title}
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: "#111827",
              fontWeight: "800",
              marginTop: 6,
            }}
          >
            {value}
          </Text>
          {subValue ? (
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              {subValue}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={18} color="#374151" />
        </View>
      </View>
    </View>
  );
};

const SectionTitle = ({ title, rightText }) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    }}
  >
    <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
      {title}
    </Text>
    {rightText ? (
      <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600" }}>
        {rightText}
      </Text>
    ) : null}
  </View>
);

const DurationFilterBar = ({ selected, onChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 12 }}
      style={{ marginBottom: 14 }}
    >
      {DURATION_FILTERS.map((item) => {
        const active = selected === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            onPress={() => onChange(item.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              marginRight: 10,
              backgroundColor: active ? "#2563eb" : "white",
              borderWidth: 1,
              borderColor: active ? "#2563eb" : "#d1d5db",
            }}
          >
            <Text
              style={{
                color: active ? "white" : "#374151",
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const PartnerFilterBar = ({ partners, selectedPartnerId, onSelectPartner }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 12 }}
      style={{ marginBottom: 14 }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectPartner(null)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 999,
          marginRight: 10,
          backgroundColor: selectedPartnerId === null ? "#111827" : "white",
          borderWidth: 1,
          borderColor: selectedPartnerId === null ? "#111827" : "#d1d5db",
        }}
      >
        <Text
          style={{
            color: selectedPartnerId === null ? "white" : "#374151",
            fontSize: 13,
            fontWeight: "700",
          }}
        >
          All Partners
        </Text>
      </TouchableOpacity>

      {(partners || []).map((partner) => {
        const key = partner?.mappedpartnerid ?? "NO_PARTNER";
        const active = selectedPartnerId === partner?.mappedpartnerid;

        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => onSelectPartner(partner?.mappedpartnerid ?? null)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              marginRight: 10,
              backgroundColor: active ? "#dbeafe" : "white",
              borderWidth: 1,
              borderColor: active ? "#60a5fa" : "#d1d5db",
            }}
          >
            <Text
              style={{
                color: active ? "#1d4ed8" : "#374151",
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {partner?.mappedpartnerid || partner?.orderdeliveredby || partner?.orderoutofdeliveryby || "No Partner"} ({partner?.totalorders || 0})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const DashboardSummary = ({ summary }) => {
  const cards = [
    {
      title: "Total Orders",
      value: summary?.totalorders || 0,
      icon: "receipt-long",
    },
    {
      title: "Total Users",
      value: summary?.totalusers || 0,
      icon: "people",
    },
    {
      title: "Partners",
      value: summary?.totalpartners || 0,
      icon: "storefront",
    },
    {
      title: "Items",
      value: summary?.totalitems || 0,
      icon: "inventory-2",
      subValue: `Qty: ${summary?.totalitemqty || 0}`,
    },
    {
      title: "Gross Amount",
      value: formatCurrency(summary?.grossitemtotal || 0),
      icon: "account-balance-wallet",
    },
    {
      title: "Delivery Charge",
      value: formatCurrency(summary?.totaldeliverycharge || 0),
      icon: "local-shipping",
    },
    {
      title: "Tax",
      value: formatCurrency(summary?.totaltax || 0),
      icon: "receipt",
    },
    {
      title: "Grand Total",
      value: formatCurrency(summary?.grandtotal || 0),
      icon: "payments",
      subValue: `Avg: ${formatCurrency(summary?.avgordervalue || 0)}`,
    },
    {
      title: "Delivered",
      value: summary?.deliveredorders || 0,
      icon: "check-circle",
    },
    {
      title: "Pending",
      value: summary?.pendingorders || 0,
      icon: "pending-actions",
    },
    {
      title: "Cancelled",
      value: summary?.cancelledorders || 0,
      icon: "cancel",
    },
    {
      title: "Out for Delivery",
      value: summary?.outfordeliveryorders || 0,
      icon: "two-wheeler",
    },
  ];

  return (
    <View style={{ marginBottom: 18 }}>
      <SectionTitle title="Dashboard Summary" />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {cards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </View>
    </View>
  );
};

const ProductList = ({ orderdata }) => {
  const items = useMemo(() => safeParseOrderData(orderdata), [orderdata]);

  if (!items.length) {
    return (
      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
        No product details available
      </Text>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "800",
          color: "#111827",
          marginBottom: 8,
        }}
      >
        Products
      </Text>

      {items.map((item, index) => (
        <View
          key={`${item?.productid || index}-${index}`}
          style={{
            backgroundColor: "#f9fafb",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 12,
            padding: 10,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>
            {item?.productname || "Unknown Product"}
          </Text>

          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Variant: {item?.variantname || "-"}
          </Text>

          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Qty: {item?.orderquantity || 0} × {formatCurrency(item?.price || 0)}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: "#111827",
              fontWeight: "700",
              marginTop: 4,
            }}
          >
            Total: {formatCurrency((item?.orderquantity || 0) * (item?.price || 0))}
          </Text>
        </View>
      ))}
    </View>
  );
};

const OrderDetailsCard = ({ order }) => {
  const status = getStatusMeta(order?.orderstatus, order);

  return (
    <View
      style={{
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
        padding: 14,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          {/* <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>
            {order?.productorderid || "-"}
          </Text> */}
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Ordered: {formatDateTime(order?.ordertime)}
          </Text>
        </View>

        {/* <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: status.bg,
            borderWidth: 1,
            borderColor: status.border,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Icon name={status.icon} size={14} color={status.text} />
          <Text
            style={{
              marginLeft: 5,
              fontSize: 11,
              fontWeight: "700",
              color: status.text,
            }}
          >
            {status.label}
          </Text>
        </View> */}
      </View>

      <View
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700" }}>
          Amount Details
        </Text>

        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Item Total: {formatCurrency(order?.itemtotal || 0)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Delivery Charge: {formatCurrency(order?.deliverycharge || 0)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Tax: {formatCurrency(order?.tax || 0)}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#111827",
            marginTop: 6,
            fontWeight: "800",
          }}
        >
          Grand Total: {formatCurrency(order?.ordergrandtotal || 0)}
        </Text>

        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Item Count: {order?.itemcount || 0}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Item Qty: {order?.itemqty || 0}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700" }}>
          Delivery Address
        </Text>

        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          {order?.deliveryaddress || "-"}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          {order?.deliverycity || "-"}, {order?.deliverystate || "-"} -{" "}
          {order?.deliverypincode || "-"}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700" }}>
          Order Timeline
        </Text>

        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Placed: {formatDateTime(order?.orderplacedtime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Confirmed: {formatDateTime(order?.orderconfirmedtime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Packed: {formatDateTime(order?.orderpackedtime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Out for Delivery: {formatDateTime(order?.orderoutofdeliverytime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Delivered: {formatDateTime(order?.orderdeliveredtime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Cancelled: {formatDateTime(order?.ordercancelledtime)}
        </Text>
      </View>

      <ProductList orderdata={order?.orderdata} />
    </View>
  );
};

const PartnerWiseGroupedOrders = ({ partners, navigation }) => {
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const onTogglePartner = (partnerId) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null);
      setExpandedUser(null);
      setExpandedOrder(null);
      return;
    }

    setExpandedPartner(partnerId);
    setExpandedUser(null);
    setExpandedOrder(null);
  };

  const onToggleUser = (userKey) => {
    if (expandedUser === userKey) {
      setExpandedUser(null);
      setExpandedOrder(null);
      return;
    }

    setExpandedUser(userKey);
    setExpandedOrder(null);
  };

  const onToggleOrder = (orderKey) => {
    setExpandedOrder((prev) => (prev === orderKey ? null : orderKey));
  };

  if (!partners?.length) {
    return (
      <View
        style={{
          marginTop: 30,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
        }}
      >
        <View
          style={{
            backgroundColor: "#f3f4f6",
            width: 80,
            height: 80,
            borderRadius: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="receipt-long" size={42} color="#9ca3af" />
        </View>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#6b7280",
            marginTop: 14,
          }}
        >
          No orders found
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: "#9ca3af",
            marginTop: 6,
            textAlign: "center",
          }}
        >
          No partner, user, or order data available for the selected filter
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 30 }}>
      <SectionTitle title="Partner Wise Orders" rightText={`${partners.length} Partners`} />

      {partners.map((partner, partnerIndex) => {
        const partnerKey = partner?.mappedpartnerid ?? `NO_PARTNER_${partnerIndex}`;
        const isPartnerExpanded = expandedPartner === partnerKey;

        return (
          <View
            key={partnerKey}
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 18,
              marginBottom: 14,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onTogglePartner(partnerKey)}
              style={{
                backgroundColor: "#eff6ff",
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: "800", color: "#1f2937" }}
                  >
                    {partner?.mappedpartnerid || "No Partner"}{" "}
                    {partner?.partnername ? `- ${partner.partnername}` : ""}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 5,
                      fontWeight: "600",
                    }}
                  >
                    Users: {partner?.totalusers || 0} | Orders: {partner?.totalorders || 0}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#2563eb",
                      marginTop: 4,
                      fontWeight: "700",
                    }}
                  >
                    Amount: {formatCurrency(partner?.totalamount || 0)}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: "white",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#2563eb",
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      {partner?.users?.length || 0} Users
                    </Text>
                  </View>

                  <Icon
                    name={isPartnerExpanded ? "expand-less" : "expand-more"}
                    size={28}
                    color="#2563eb"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {isPartnerExpanded && (
              <View style={{ padding: 10 }}>
                {(partner?.users || []).map((user, userIndex) => {
                  const userKey = `${partnerKey}_${user?.userid || userIndex}`;
                  const isUserExpanded = expandedUser === userKey;

                  return (
                    <View
                      key={userKey}
                      style={{
                        borderWidth: 1,
                        borderColor: "#f3f4f6",
                        borderRadius: 14,
                        overflow: "hidden",
                        marginBottom: 10,
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => onToggleUser(userKey)}
                        style={{
                          backgroundColor: "#f9fafb",
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "800",
                                color: "#111827",
                              }}
                            >
                              {user?.username || "Unknown User"}
                            </Text>

                            <Text
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                marginTop: 4,
                              }}
                            >
                              User ID: {user?.userid || "-"}
                            </Text>

                            <Text
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                marginTop: 4,
                              }}
                            >
                              Orders: {user?.userordercount || 0}
                            </Text>
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            {(() => {
                              const orderTypeCode = Number(user?.isdailymilkuser);
                              const isKitchenOrder = orderTypeCode === 4 || String(user?.order_type || "").toLowerCase() === "kitchen_order";
                              const isDailyMilkOrder = [1, 2, 3].includes(orderTypeCode);
                              const badgeBg = isKitchenOrder ? "#fdf2f8" : isDailyMilkOrder ? "#ecfdf5" : "#eff6ff";
                              const badgeBorder = isKitchenOrder ? "#fbcfe8" : isDailyMilkOrder ? "#a7f3d0" : "#bfdbfe";
                              const badgeText = isKitchenOrder ? "#be185d" : isDailyMilkOrder ? "#059669" : "#2563eb";
                              const badgeLabel = isKitchenOrder ? "Kitchen Order" : isDailyMilkOrder ? "Daily Milk" : "Fast Delivery";

                              return (
                            <View
                              style={{
                                backgroundColor: badgeBg,
                                borderWidth: 1,
                                borderColor: badgeBorder,
                                borderRadius: 999,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "800",
                                  color: badgeText,
                                }}
                              >
                                {badgeLabel}
                              </Text>
                            </View>
                              );
                            })()}

                            <Text
                              style={{
                                fontSize: 13,
                                color: "#111827",
                                fontWeight: "800",
                                marginTop: 8,
                              }}
                            >
                              {formatCurrency(user?.usergrandtotal || 0)}
                            </Text>

                            <Icon
                              name={
                                isUserExpanded
                                  ? "keyboard-arrow-up"
                                  : "keyboard-arrow-down"
                              }
                              size={24}
                              color="#6b7280"
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isUserExpanded && (
                        <View style={{ padding: 10, backgroundColor: "white" }}>
                          {(user?.orders || []).map((order, orderIndex) => {
                            const orderKey = `${userKey}_${order?.productorderid || orderIndex}`;
                            const isOrderExpanded = expandedOrder === orderKey;
                            const status = getStatusMeta(order?.orderstatus, order);

                            return (
                              <View
                                key={orderKey}
                                style={{
                                  borderWidth: 1,
                                  borderColor: "#e5e7eb",
                                  borderRadius: 14,
                                  overflow: "hidden",
                                  marginBottom: 10,
                                }}
                              >
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() => onToggleOrder(orderKey)}
                                  style={{
                                    backgroundColor: "#ffffff",
                                    paddingHorizontal: 14,
                                    paddingVertical: 14,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          fontWeight: "800",
                                          color: "#111827",
                                        }}
                                      >
                                        {order?.productorderid || "-"}
                                      </Text>

                                      <Text
                                        style={{
                                          fontSize: 12,
                                          color: "#6b7280",
                                          marginTop: 4,
                                        }}
                                      >
                                        Date: {formatDateOnly(order?.orderdate)}
                                      </Text>

                                      <Text
                                        style={{
                                          fontSize: 12,
                                          color: "#6b7280",
                                          marginTop: 4,
                                        }}
                                      >
                                        Items: {order?.itemcount || 0} | Qty:{" "}
                                        {order?.itemqty || 0}
                                      </Text>
                                    </View>

                                    <View style={{ alignItems: "flex-end" }}>
                                      <View
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          backgroundColor: status.bg,
                                          borderWidth: 1,
                                          borderColor: status.border,
                                          borderRadius: 999,
                                          paddingHorizontal: 10,
                                          paddingVertical: 5,
                                        }}
                                      >
                                        <Icon
                                          name={status.icon}
                                          size={13}
                                          color={status.text}
                                        />
                                        <Text
                                          style={{
                                            marginLeft: 5,
                                            fontSize: 11,
                                            fontWeight: "800",
                                            color: status.text,
                                          }}
                                        >
                                          {status.label}
                                        </Text>
                                      </View>

                                      <Text
                                        style={{
                                          fontSize: 13,
                                          color: "#111827",
                                          fontWeight: "800",
                                          marginTop: 8,
                                        }}
                                      >
                                        {formatCurrency(order?.ordergrandtotal || 0)}
                                      </Text>

                                      <Icon
                                        name={
                                          isOrderExpanded
                                            ? "keyboard-arrow-up"
                                            : "keyboard-arrow-down"
                                        }
                                        size={24}
                                        color="#6b7280"
                                      />
                                    </View>
                                  </View>
                                </TouchableOpacity>

                                {isOrderExpanded && <OrderDetailsCard order={order} />}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const GroceryTabContent = ({ navigation, orderType, onSummaryChange }) => {
  const { setLoading } = useLoading();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("TODAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [dashboardData, setDashboardData] = useState({
    summary: {},
    partners: [],
    orders: [],
  });

  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  const visiblePartners = useMemo(() => {
    const partners = dashboardData?.partners || [];

    if (!selectedPartnerId) {
      return partners;
    }

    return partners.filter(
      (partner) => String(partner?.mappedpartnerid ?? "") === String(selectedPartnerId)
    );
  }, [dashboardData?.partners, selectedPartnerId]);

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.append("orderType", orderType);
    params.append("filterType", filterType);

    if (filterType === "CUSTOM") {
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
    }

    return `ProductOrder/GroceryOrdersDashboard?${params.toString()}`;
  };

  const fetchDashboardData = async (showLoader = true) => {
    try {
      if (filterType === "CUSTOM" && (!fromDate || !toDate)) {
        setDashboardData({
          summary: {},
          partners: [],
          orders: [],
        });
        return;
      }

      if (showLoader) {
        setLoading(true, "Fetching grocery orders dashboard...");
      }

      console.log("Fetching data with URL:", buildUrl());
      const res = await API.GET(buildUrl());
      const payload = {
        summary: res?.summary || {},
        partners: res?.partners || [],
        orders: res?.orders || [],
      };

 
      setDashboardData(payload);
      onSummaryChange?.(payload.summary || {});
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch grocery orders dashboard data");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(true);
    }, [orderType, filterType, fromDate, toDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(false);
  };

  useEffect(() => {
    if (filterType !== "CUSTOM") {
      setFromDate("");
      setToDate("");
    }
  }, [filterType]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <DurationFilterBar
        selected={filterType}
        onChange={(value) => {
          setSelectedPartnerId(null);
          setFilterType(value);
        }}
      />

      {filterType === "CUSTOM" && (
        <View
          style={{
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 16,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#111827",
              marginBottom: 10,
            }}
          >
            Custom Date Range
          </Text>

          <TextInput
            placeholder="From Date (YYYY-MM-DD)"
            value={fromDate}
            onChangeText={setFromDate}
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 10,
              color: "#111827",
            }}
            placeholderTextColor="#9ca3af"
          />

          <TextInput
            placeholder="To Date (YYYY-MM-DD)"
            value={toDate}
            onChangeText={setToDate}
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#111827",
            }}
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => fetchDashboardData(true)}
            style={{
              marginTop: 12,
              backgroundColor: "#2563eb",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>
              Apply Custom Range
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <DashboardSummary summary={dashboardData?.summary || {}} />

      <SectionTitle title="Partner Filter" />
      <PartnerFilterBar
        partners={dashboardData?.partners || []}
        selectedPartnerId={selectedPartnerId}
        onSelectPartner={setSelectedPartnerId}
      />

      <PartnerWiseGroupedOrders
        partners={visiblePartners}
        navigation={navigation}
      />
    </ScrollView>
  );
};

const GroceryOrdersDashboard = ({ navigation }) => {
  const [dailyMilkSummary, setDailyMilkSummary] = useState({});
  const [fastDeliverySummary, setFastDeliverySummary] = useState({});

  const dailyCount = dailyMilkSummary?.totalorders || 0;
  const fastCount = fastDeliverySummary?.totalorders || 0;

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIndicatorStyle: {
            backgroundColor: "#3b82f6",
            height: 3,
          },
          tabBarLabelStyle: {
            fontWeight: "600",
            textTransform: "none",
            fontSize: 14,
          },
          tabBarStyle: {
            backgroundColor: "white",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          },
          tabBarItemStyle: {
            paddingHorizontal: 8,
          },
        }}
      >
        <Tab.Screen
          name="DailyMilk"
          children={() => (
            <GroceryTabContent
              navigation={navigation}
              orderType="DAILYMILK"
              onSummaryChange={setDailyMilkSummary}
            />
          )}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="local-drink" size={22} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontWeight: "600" }}>Daily Milk</Text>
                {dailyCount > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: "#2563eb",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {dailyCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="FastDelivery"
          children={() => (
            <GroceryTabContent
              navigation={navigation}
              orderType="FASTDELIVERY"
              onSummaryChange={setFastDeliverySummary}
            />
          )}
          options={{
            tabBarIcon: ({ color }) => (
              <Icon name="delivery-dining" size={22} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color, fontWeight: "600" }}>Fast Delivery</Text>
                {fastCount > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: "#10b981",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {fastCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default GroceryOrdersDashboard;
