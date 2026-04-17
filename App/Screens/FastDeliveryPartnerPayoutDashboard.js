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
import { useFocusEffect } from "@react-navigation/native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import { Config } from "../../config";

const DURATION_FILTERS = [
  { key: "TODAY", label: "Today" },
  { key: "WEEK", label: "Week" },
  { key: "MONTH", label: "Month" },
  { key: "YEAR", label: "Year" },
  { key: "ALL", label: "All" },
  { key: "CUSTOM", label: "Custom" },
];

const PAYOUT_PER_ORDER = Number(
  Config.FAST_DELIVERY_PARTNER_PAYOUT_PER_ORDER || 0
);

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

const isDeliveredOrder = (order) => {
  const status = String(order?.orderstatus || "").toLowerCase();
  return Boolean(order?.orderdelivered) || status.includes("delivered");
};

const clampAmount = (value, min, max) =>
  Math.min(Math.max(parseNumber(value), min), max);

const getOrderPaymentMeta = (order) => {
  const totalPayout = parseNumber(
    order?.partnerpaymentamount ??
      order?.partnerpayoutamount ??
      order?.orderpartnerpaymentamount ??
      order?.orderpayoutamount ??
      order?.payoutamount ??
      PAYOUT_PER_ORDER
  );

  const rawPaidAmount = parseNumber(
    order?.partnerpaymentpaidamount ??
      order?.paidpartneramount ??
      order?.partnerpaidamount ??
      order?.orderpartnerpaidamount ??
      order?.payoutpaidamount ??
      order?.paymentpaidamount ??
      0
  );

  const paidAmount = clampAmount(rawPaidAmount, 0, totalPayout);
  const pendingAmount = Math.max(totalPayout - paidAmount, 0);

  const rawStatus = String(
    order?.partnerpaymentstatus ??
      order?.paymentstatus ??
      order?.partnerpayoutstatus ??
      ""
  ).toLowerCase();

  const isExplicitlyProcessed =
    Boolean(order?.partnerpaymentprocessed) ||
    Boolean(order?.paymentprocessed) ||
    Boolean(order?.partnerpayoutprocessed) ||
    rawStatus.includes("paid") ||
    rawStatus.includes("settled") ||
    rawStatus.includes("processed") ||
    rawStatus.includes("complete");

  const isPaid = pendingAmount === 0 && totalPayout > 0;
  const isPartial = paidAmount > 0 && pendingAmount > 0;
  const isProcessed = isExplicitlyProcessed || isPaid;

  let label = "Pending";
  let icon = "hourglass-top";
  let bg = "#fefce8";
  let text = "#a16207";
  let border = "#fde68a";

  if (isPaid) {
    label = "Paid";
    icon = "paid";
    bg = "#ecfdf5";
    text = "#059669";
    border = "#a7f3d0";
  } else if (isPartial) {
    label = "Partially Paid";
    icon = "payments";
    bg = "#eff6ff";
    text = "#2563eb";
    border = "#bfdbfe";
  } else if (isProcessed) {
    label = "Processed";
    icon = "task-alt";
    bg = "#f3f4f6";
    text = "#4b5563";
    border = "#d1d5db";
  }

  return {
    totalPayout,
    paidAmount,
    pendingAmount,
    isProcessed,
    isPaid,
    isPartial,
    label,
    icon,
    bg,
    text,
    border,
    rawStatus:
      order?.partnerpaymentstatus ||
      order?.paymentstatus ||
      order?.partnerpayoutstatus ||
      "",
    processedAt:
      order?.partnerpaymentprocessedtime ||
      order?.paymentprocessedtime ||
      order?.partnerpayoutprocessedtime ||
      order?.partnerpaymentpaidtime ||
      order?.paidtime ||
      null,
  };
};

const buildDeliveredPartnerPayload = (partners) => {
  const normalizedPartners = (partners || [])
    .map((partner, partnerIndex) => {
      const deliveredUsers = (partner?.users || [])
        .map((user, userIndex) => {
          const deliveredOrders = (user?.orders || [])
            .filter(isDeliveredOrder)
            .map((order) => {
              const paymentMeta = getOrderPaymentMeta(order);
              return {
                ...order,
                payoutamount: paymentMeta.totalPayout,
                paymentmeta: paymentMeta,
              };
            });

          if (!deliveredOrders.length) {
            return null;
          }

          const deliveredValue = deliveredOrders.reduce(
            (sum, order) => sum + parseNumber(order?.ordergrandtotal),
            0
          );
          const payoutAmount = deliveredOrders.reduce(
            (sum, order) => sum + parseNumber(order?.paymentmeta?.totalPayout),
            0
          );
          const paidPayout = deliveredOrders.reduce(
            (sum, order) => sum + parseNumber(order?.paymentmeta?.paidAmount),
            0
          );
          const pendingPayout = deliveredOrders.reduce(
            (sum, order) => sum + parseNumber(order?.paymentmeta?.pendingAmount),
            0
          );
          const processedOrders = deliveredOrders.filter(
            (order) => order?.paymentmeta?.isProcessed
          ).length;
          const paidOrders = deliveredOrders.filter(
            (order) => order?.paymentmeta?.isPaid
          ).length;
          const pendingOrders = deliveredOrders.length - paidOrders;

          return {
            ...user,
            userid: user?.userid || `NO_USER_${partnerIndex}_${userIndex}`,
            orders: deliveredOrders,
            userordercount: deliveredOrders.length,
            usergrandtotal: deliveredValue,
            deliveredordercount: deliveredOrders.length,
            payoutamount: payoutAmount,
            paidpayoutamount: paidPayout,
            pendingpayoutamount: pendingPayout,
            processedorders: processedOrders,
            paidorders: paidOrders,
            pendingorders: pendingOrders,
          };
        })
        .filter(Boolean);

      if (!deliveredUsers.length) {
        return null;
      }

      const totalOrders = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.deliveredordercount),
        0
      );
      const totalAmount = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.usergrandtotal),
        0
      );
      const totalPayout = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.payoutamount),
        0
      );
      const paidPayout = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.paidpayoutamount),
        0
      );
      const pendingPayout = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.pendingpayoutamount),
        0
      );
      const processedOrders = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.processedorders),
        0
      );
      const paidOrders = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.paidorders),
        0
      );
      const pendingOrders = deliveredUsers.reduce(
        (sum, user) => sum + parseNumber(user?.pendingorders),
        0
      );

      return {
        ...partner,
        mappedpartnerid:
          partner?.mappedpartnerid ?? `NO_PARTNER_${partnerIndex}`,
        users: deliveredUsers,
        totalusers: deliveredUsers.length,
        totalorders: totalOrders,
        totalamount: totalAmount,
        totalpayout: totalPayout,
        paidpayoutamount: paidPayout,
        pendingpayoutamount: pendingPayout,
        processedorders: processedOrders,
        paidorders: paidOrders,
        pendingorders: pendingOrders,
      };
    })
    .filter(Boolean);

  const summary = normalizedPartners.reduce(
    (acc, partner) => {
      acc.totalpartners += 1;
      acc.totalclients += parseNumber(partner?.totalusers);
      acc.deliveredorders += parseNumber(partner?.totalorders);
      acc.deliveredamount += parseNumber(partner?.totalamount);
      acc.totalpayout += parseNumber(partner?.totalpayout);
      acc.paidpayoutamount += parseNumber(partner?.paidpayoutamount);
      acc.pendingpayoutamount += parseNumber(partner?.pendingpayoutamount);
      acc.processedorders += parseNumber(partner?.processedorders);
      acc.paidorders += parseNumber(partner?.paidorders);
      acc.pendingorders += parseNumber(partner?.pendingorders);
      return acc;
    },
    {
      totalpartners: 0,
      totalclients: 0,
      deliveredorders: 0,
      deliveredamount: 0,
      totalpayout: 0,
      paidpayoutamount: 0,
      pendingpayoutamount: 0,
      processedorders: 0,
      paidorders: 0,
      pendingorders: 0,
    }
  );

  summary.avgpayoutperpartner = summary.totalpartners
    ? summary.totalpayout / summary.totalpartners
    : 0;

  return {
    partners: normalizedPartners,
    summary,
  };
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

const SummaryCard = ({ title, value, icon, subValue }) => (
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

const DurationFilterBar = ({ selected, onChange }) => (
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

const PartnerFilterBar = ({ partners, selectedPartnerId, onSelectPartner }) => (
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

    {(partners || []).map((partner, index) => {
      const partnerId = partner?.mappedpartnerid ?? `NO_PARTNER_${index}`;
      const active = String(selectedPartnerId) === String(partnerId);

      return (
        <TouchableOpacity
          key={partnerId}
          activeOpacity={0.8}
          onPress={() => onSelectPartner(partnerId)}
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
            {partner?.mappedpartnerid || partner?.partnername || "No Partner"} (
            {partner?.totalorders || 0})
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

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
            Qty: {item?.orderquantity || 0} x {formatCurrency(item?.price || 0)}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: "#111827",
              fontWeight: "700",
              marginTop: 4,
            }}
          >
            Total:{" "}
            {formatCurrency(
              parseNumber(item?.orderquantity) * parseNumber(item?.price)
            )}
          </Text>
        </View>
      ))}
    </View>
  );
};

const PayoutHighlight = () => (
  <View
    style={{
      backgroundColor: "#ecfdf5",
      borderWidth: 1,
      borderColor: "#a7f3d0",
      borderRadius: 18,
      padding: 14,
      marginBottom: 14,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 12, color: "#065f46", fontWeight: "700" }}>
          Partner payout configured per delivered fast-delivery order
        </Text>
        <Text
          style={{
            fontSize: 24,
            color: "#065f46",
            fontWeight: "900",
            marginTop: 4,
          }}
        >
          {formatCurrency(PAYOUT_PER_ORDER)}
        </Text>
        <Text style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>
          Total payable = delivered orders x configured payout amount
        </Text>
      </View>

      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "#d1fae5",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="payments" size={22} color="#047857" />
      </View>
    </View>
  </View>
);

const PayoutSummary = ({ summary }) => {
  const cards = [
    {
      title: "Delivered Orders",
      value: summary?.deliveredorders || 0,
      icon: "check-circle",
    },
    {
      title: "Partners",
      value: summary?.totalpartners || 0,
      icon: "storefront",
    },
    {
      title: "Clients",
      value: summary?.totalclients || 0,
      icon: "people",
    },
    {
      title: "Payout / Order",
      value: formatCurrency(PAYOUT_PER_ORDER),
      icon: "sell",
    },
    {
      title: "Total Payable",
      value: formatCurrency(summary?.totalpayout || 0),
      icon: "account-balance-wallet",
      subValue: `Avg / Partner: ${formatCurrency(
        summary?.avgpayoutperpartner || 0
      )}`,
    },
    {
      title: "Paid Amount",
      value: formatCurrency(summary?.paidpayoutamount || 0),
      icon: "paid",
      subValue: `Paid Orders: ${summary?.paidorders || 0}`,
    },
    {
      title: "Pending Amount",
      value: formatCurrency(summary?.pendingpayoutamount || 0),
      icon: "hourglass-top",
      subValue: `Pending Orders: ${summary?.pendingorders || 0}`,
    },
    {
      title: "Delivered Value",
      value: formatCurrency(summary?.deliveredamount || 0),
      icon: "receipt-long",
      subValue: `Processed Orders: ${summary?.processedorders || 0}`,
    },
  ];

  return (
    <View style={{ marginBottom: 18 }}>
      <SectionTitle title="Payout Summary" />
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

const OrderDetailsCard = ({ order }) => {
  const paymentMeta = order?.paymentmeta || getOrderPaymentMeta(order);

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
          backgroundColor: paymentMeta.bg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: paymentMeta.border,
          padding: 12,
          marginBottom: 12,
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
            <Text style={{ fontSize: 13, color: paymentMeta.text, fontWeight: "800" }}>
              Partner Payout Settlement
            </Text>
            <Text style={{ fontSize: 12, color: paymentMeta.text, marginTop: 6 }}>
              Total: {formatCurrency(paymentMeta.totalPayout)} | Paid:{" "}
              {formatCurrency(paymentMeta.paidAmount)} | Pending:{" "}
              {formatCurrency(paymentMeta.pendingAmount)}
            </Text>
            <Text style={{ fontSize: 12, color: paymentMeta.text, marginTop: 4 }}>
              Status: {paymentMeta.label}
            </Text>
            {paymentMeta.rawStatus ? (
              <Text
                style={{ fontSize: 12, color: paymentMeta.text, marginTop: 4 }}
              >
                Raw Status: {paymentMeta.rawStatus}
              </Text>
            ) : null}
            {paymentMeta.processedAt ? (
              <Text
                style={{ fontSize: 12, color: paymentMeta.text, marginTop: 4 }}
              >
                Processed At: {formatDateTime(paymentMeta.processedAt)}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Icon name={paymentMeta.icon} size={14} color={paymentMeta.text} />
            <Text
              style={{
                marginLeft: 5,
                fontSize: 11,
                fontWeight: "800",
                color: paymentMeta.text,
              }}
            >
              {paymentMeta.label}
            </Text>
          </View>
        </View>
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
          Order Info
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Order ID: {order?.productorderid || "-"}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Ordered: {formatDateTime(order?.ordertime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Delivered: {formatDateTime(order?.orderdeliveredtime)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Status: {order?.orderstatus || "Delivered"}
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
      </View>

      <ProductList orderdata={order?.orderdata} />
    </View>
  );
};

const PartnerPayoutGroupedOrders = ({ partners }) => {
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
          <Icon name="payments" size={42} color="#9ca3af" />
        </View>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#6b7280",
            marginTop: 14,
          }}
        >
          No delivered orders found
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: "#9ca3af",
            marginTop: 6,
            textAlign: "center",
          }}
        >
          No partner payout data available for the selected duration filter
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 30 }}>
      <SectionTitle
        title="Partner Payout Breakdown"
        rightText={`${partners.length} Partners`}
      />

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
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "800", color: "#1f2937" }}
                  >
                    {partner?.mappedpartnerid || "No Partner"}{" "}
                    {partner?.partnername ? `- ${partner.partnername}` : ""}
                  </Text>

                  <Text
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      marginTop: 3,
                      fontWeight: "600",
                    }}
                  >
                    {partner?.totalusers || 0} clients | {partner?.totalorders || 0} delivered
                  </Text>

                  <Text
                    style={{
                      fontSize: 11,
                      color: "#4b5563",
                      marginTop: 3,
                      fontWeight: "600",
                    }}
                  >
                    Payable {formatCurrency(partner?.totalpayout || 0)} | Paid{" "}
                    {formatCurrency(partner?.paidpayoutamount || 0)} | Pending{" "}
                    {formatCurrency(partner?.pendingpayoutamount || 0)}
                  </Text>

                  <Text
                    style={{
                      fontSize: 10,
                      color: "#2563eb",
                      marginTop: 3,
                      fontWeight: "700",
                    }}
                  >
                    Value {formatCurrency(partner?.totalamount || 0)} | Done{" "}
                    {partner?.processedorders || 0}/{partner?.totalorders || 0}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: "#dbeafe",
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#2563eb",
                        fontSize: 10,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      Done {partner?.processedorders || 0}/{partner?.totalorders || 0}
                    </Text>
                  </View>

                  <Icon
                    name={isPartnerExpanded ? "expand-less" : "expand-more"}
                    size={24}
                    color="#2563eb"
                    style={{ marginLeft: 6 }}
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
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "800",
                                color: "#111827",
                              }}
                            >
                              {user?.username || "Unknown User"}
                            </Text>

                            <Text
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginTop: 3,
                              }}
                            >
                              ID {user?.userid || "-"} | {user?.userordercount || 0} delivered
                            </Text>

                            <Text
                              style={{
                                fontSize: 11,
                                color: "#4b5563",
                                marginTop: 3,
                                fontWeight: "600",
                              }}
                            >
                              Payable {formatCurrency(user?.payoutamount || 0)} | Paid{" "}
                              {formatCurrency(user?.paidpayoutamount || 0)} | Pending{" "}
                              {formatCurrency(user?.pendingpayoutamount || 0)}
                            </Text>
                          </View>

                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View
                              style={{
                                backgroundColor: "#ecfdf5",
                                borderWidth: 1,
                                borderColor: "#a7f3d0",
                                borderRadius: 999,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "800",
                                  color: "#059669",
                                  textAlign: "center",
                                }}
                              >
                                Done {user?.processedorders || 0}/{user?.userordercount || 0}
                              </Text>
                            </View>

                            <Icon
                              name={
                                isUserExpanded
                                  ? "keyboard-arrow-up"
                                  : "keyboard-arrow-down"
                              }
                              size={22}
                              color="#6b7280"
                              style={{ marginLeft: 6 }}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isUserExpanded && (
                        <View style={{ padding: 10, backgroundColor: "white" }}>
                          {(user?.orders || []).map((order, orderIndex) => {
                            const orderKey = `${userKey}_${order?.productorderid || orderIndex}`;
                            const isOrderExpanded = expandedOrder === orderKey;
                            const paymentMeta =
                              order?.paymentmeta || getOrderPaymentMeta(order);

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
                                          backgroundColor: paymentMeta.bg,
                                          borderWidth: 1,
                                          borderColor: paymentMeta.border,
                                          borderRadius: 999,
                                          paddingHorizontal: 10,
                                          paddingVertical: 5,
                                        }}
                                      >
                                        <Icon
                                          name={paymentMeta.icon}
                                          size={13}
                                          color={paymentMeta.text}
                                        />
                                        <Text
                                          style={{
                                            marginLeft: 5,
                                            fontSize: 11,
                                            fontWeight: "800",
                                            color: paymentMeta.text,
                                          }}
                                        >
                                          {paymentMeta.label}
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

                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: "#047857",
                                          fontWeight: "800",
                                          marginTop: 4,
                                        }}
                                      >
                                        Total: {formatCurrency(paymentMeta.totalPayout)}
                                      </Text>

                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: "#2563eb",
                                          fontWeight: "800",
                                          marginTop: 4,
                                        }}
                                      >
                                        Paid: {formatCurrency(paymentMeta.paidAmount)}
                                      </Text>

                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: "#a16207",
                                          fontWeight: "800",
                                          marginTop: 4,
                                        }}
                                      >
                                        Pending:{" "}
                                        {formatCurrency(paymentMeta.pendingAmount)}
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

const FastDeliveryPartnerPayoutDashboard = () => {
  const { setLoading } = useLoading();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("TODAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [rawPartners, setRawPartners] = useState([]);

  const processedData = useMemo(
    () => buildDeliveredPartnerPayload(rawPartners),
    [rawPartners]
  );

  const visiblePartners = useMemo(() => {
    const partners = processedData?.partners || [];

    if (!selectedPartnerId) {
      return partners;
    }

    return partners.filter(
      (partner) =>
        String(partner?.mappedpartnerid ?? "") === String(selectedPartnerId)
    );
  }, [processedData?.partners, selectedPartnerId]);

  const visibleSummary = useMemo(() => {
    if (!selectedPartnerId) {
      return processedData?.summary || {};
    }

    return visiblePartners.reduce(
      (acc, partner) => {
        acc.totalpartners += 1;
        acc.totalclients += parseNumber(partner?.totalusers);
        acc.deliveredorders += parseNumber(partner?.totalorders);
        acc.deliveredamount += parseNumber(partner?.totalamount);
        acc.totalpayout += parseNumber(partner?.totalpayout);
        acc.paidpayoutamount += parseNumber(partner?.paidpayoutamount);
        acc.pendingpayoutamount += parseNumber(partner?.pendingpayoutamount);
        acc.processedorders += parseNumber(partner?.processedorders);
        acc.paidorders += parseNumber(partner?.paidorders);
        acc.pendingorders += parseNumber(partner?.pendingorders);
        return acc;
      },
      {
        totalpartners: 0,
        totalclients: 0,
        deliveredorders: 0,
        deliveredamount: 0,
        totalpayout: 0,
        paidpayoutamount: 0,
        pendingpayoutamount: 0,
        processedorders: 0,
        paidorders: 0,
        pendingorders: 0,
        avgpayoutperpartner: 0,
      }
    );
  }, [processedData?.summary, selectedPartnerId, visiblePartners]);

  const summaryWithAverage = useMemo(() => {
    const base = visibleSummary || {};
    return {
      ...base,
      avgpayoutperpartner: base?.totalpartners
        ? parseNumber(base?.totalpayout) / parseNumber(base?.totalpartners)
        : 0,
    };
  }, [visibleSummary]);

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.append("orderType", "FASTDELIVERY");
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
        setRawPartners([]);
        return;
      }

      if (showLoader) {
        setLoading(true, "Fetching fast delivery partner payouts...");
      }

      const res = await API.GET(buildUrl());
      setRawPartners(res?.partners || []);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch partner payout dashboard data");
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
    }, [filterType, fromDate, toDate])
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
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
          Fast Delivery Payout Analytics
        </Text>
        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
          Delivered fast-delivery orders only. Use this page for payout
          calculation, settings-based tracking, and analytics from the selected
          duration up to today.
        </Text>
      </View>

      <PayoutHighlight />

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

      <PayoutSummary summary={summaryWithAverage} />

      <SectionTitle title="Partner Filter" />
      <PartnerFilterBar
        partners={processedData?.partners || []}
        selectedPartnerId={selectedPartnerId}
        onSelectPartner={setSelectedPartnerId}
      />

      <PartnerPayoutGroupedOrders partners={visiblePartners} />
    </ScrollView>
  );
};

export default FastDeliveryPartnerPayoutDashboard;
