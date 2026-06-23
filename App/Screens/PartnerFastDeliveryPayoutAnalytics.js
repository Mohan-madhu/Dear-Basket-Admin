import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
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
  } catch {
    return [];
  }
};

const buildKitchenPayoutPartner = (rows = [], partnerId, partnerName) => {
  const users = [];

  rows.forEach((row) => {
    const userId = String(row?.userid || "NO_USER").trim();
    let user = users.find((item) => String(item?.userid || "") === userId);

    if (!user) {
      user = {
        userid: userId,
        username: row?.username || row?.name || "Client",
        name: row?.username || row?.name || "Client",
        mobile: row?.usermobile || row?.user_mobile || "",
        orders: [],
      };
      users.push(user);
    }

    user.orders.push({
      ...row,
      productorderid: row?.productorderid || row?.orderid,
      orderid: row?.orderid || row?.productorderid,
      isdailymilkuser: 4,
      order_type: "kitchen_order",
      type: "Food Delivery",
      orderdelivered: Number(row?.orderdelivered ?? 1),
      ordergrandtotal: parseNumber(row?.ordergrandtotal ?? row?.totalamount),
    });
  });

  if (!users.length) return null;

  return {
    mappedpartnerid: partnerId,
    partnername: partnerName || partnerId || "Partner",
    users,
  };
};

const isFastDeliveryOrder = (order) => Number(order?.isdailymilkuser) === 0;

const isDeliveredOrder = (order) => {
  const status = String(order?.orderstatus || "").toLowerCase();
  return (
    (isFastDeliveryOrder(order) || Number(order?.isdailymilkuser) === 4) &&
    (Boolean(order?.orderdelivered) || status.includes("delivered"))
  );
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

  const payoutPaidFlag = String(order?.partnerpayoutpaid ?? "0");
  const isPaidFromBackend = payoutPaidFlag === "1";

  const rawPaidAmount = isPaidFromBackend
    ? totalPayout
    : parseNumber(
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
    order?.partnerpayoutapplicationstatus ??
    order?.partnerpaymentstatus ??
      order?.paymentstatus ??
      order?.partnerpayoutstatus ??
      ""
  ).toLowerCase();

  const applicationStatusText = String(
    order?.partnerpayoutapplicationstatus || ""
  );
  const hasAppliedForPayout =
    applicationStatusText.trim().length > 0 &&
    !applicationStatusText.toLowerCase().includes("not applied");

  const isProcessed =
    isPaidFromBackend ||
    Boolean(order?.partnerpaymentprocessed) ||
    Boolean(order?.paymentprocessed) ||
    Boolean(order?.partnerpayoutprocessed) ||
    rawStatus.includes("paid") ||
    rawStatus.includes("settled") ||
    rawStatus.includes("processed") ||
    rawStatus.includes("complete") ||
    (pendingAmount === 0 && totalPayout > 0);

  const isPaid = pendingAmount === 0 && totalPayout > 0;
  const isPartial = paidAmount > 0 && pendingAmount > 0;

  let label = "Not Applied";
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
  } else if (hasAppliedForPayout || isPartial || isProcessed) {
    label = "Applied";
    icon = "assignment-turned-in";
    bg = "#eff6ff";
    text = "#2563eb";
    border = "#bfdbfe";
  }

  return {
    totalPayout,
    paidAmount,
    pendingAmount,
    isProcessed,
    label,
    icon,
    bg,
    text,
    border,
    rawStatus:
      order?.partnerpayoutapplicationstatus ||
      order?.partnerpaymentstatus ||
      order?.paymentstatus ||
      order?.partnerpayoutstatus ||
      "",
    applicationId:
      order?.partnerpayoutapplicationid || "Partner Not Applied for Payout",
    hasAppliedForPayout,
    processedAt:
      order?.partnerpaymentprocessedtime ||
      order?.paymentprocessedtime ||
      order?.partnerpayoutprocessedtime ||
      order?.partnerpaymentpaidtime ||
      order?.paidtime ||
      null,
  };
};

const normalizePartnerData = (partner, partnerId, partnerName) => {
  if (!partner) {
    return {
      mappedpartnerid: partnerId,
      partnername: partnerName,
      users: [],
      totalusers: 0,
      totalorders: 0,
      totalamount: 0,
      totalpayout: 0,
      paidpayoutamount: 0,
      pendingpayoutamount: 0,
      processedorders: 0,
      paidorders: 0,
      pendingorders: 0,
    };
  }

  const users = (partner?.users || [])
    .map((user, userIndex) => {
      const deliveredOrders = (user?.orders || [])
        .filter(isDeliveredOrder)
        .map((order) => {
          const paymentmeta = getOrderPaymentMeta(order);
          return {
            ...order,
            paymentmeta,
            payoutamount: paymentmeta.totalPayout,
          };
        });

      if (!deliveredOrders.length) {
        return null;
      }

      const usergrandtotal = deliveredOrders.reduce(
        (sum, order) => sum + parseNumber(order?.ordergrandtotal),
        0
      );
      const payoutamount = deliveredOrders.reduce(
        (sum, order) => sum + parseNumber(order?.paymentmeta?.totalPayout),
        0
      );
      const paidpayoutamount = deliveredOrders.reduce(
        (sum, order) => sum + parseNumber(order?.paymentmeta?.paidAmount),
        0
      );
      const pendingpayoutamount = deliveredOrders.reduce(
        (sum, order) => sum + parseNumber(order?.paymentmeta?.pendingAmount),
        0
      );
      const processedorders = deliveredOrders.filter(
        (order) => order?.paymentmeta?.isProcessed
      ).length;
      const paidorders = deliveredOrders.filter(
        (order) => order?.paymentmeta?.label === "Paid"
      ).length;

      return {
        ...user,
        userid: user?.userid || `NO_USER_${userIndex}`,
        orders: deliveredOrders,
        userordercount: deliveredOrders.length,
        usergrandtotal,
        payoutamount,
        paidpayoutamount,
        pendingpayoutamount,
        processedorders,
        paidorders,
        pendingorders: deliveredOrders.length - paidorders,
      };
    })
    .filter(Boolean);

  const totalorders = users.reduce(
    (sum, user) => sum + parseNumber(user?.userordercount),
    0
  );
  const totalamount = users.reduce(
    (sum, user) => sum + parseNumber(user?.usergrandtotal),
    0
  );
  const totalpayout = users.reduce(
    (sum, user) => sum + parseNumber(user?.payoutamount),
    0
  );
  const paidpayoutamount = users.reduce(
    (sum, user) => sum + parseNumber(user?.paidpayoutamount),
    0
  );
  const pendingpayoutamount = users.reduce(
    (sum, user) => sum + parseNumber(user?.pendingpayoutamount),
    0
  );
  const processedorders = users.reduce(
    (sum, user) => sum + parseNumber(user?.processedorders),
    0
  );
  const paidorders = users.reduce(
    (sum, user) => sum + parseNumber(user?.paidorders),
    0
  );

  return {
    ...partner,
    mappedpartnerid: partner?.mappedpartnerid || partnerId,
    partnername: partner?.partnername || partnerName || "Partner",
    users,
    totalusers: users.length,
    totalorders,
    totalamount,
    totalpayout,
    paidpayoutamount,
    pendingpayoutamount,
    processedorders,
    paidorders,
    pendingorders: totalorders - paidorders,
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
        </View>
      ))}
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
        <Text style={{ fontSize: 13, color: paymentMeta.text, fontWeight: "800" }}>
          Payment Status: {paymentMeta.label}
        </Text>
        <Text style={{ fontSize: 12, color: paymentMeta.text, marginTop: 6 }}>
          Total {formatCurrency(paymentMeta.totalPayout)} | Paid{" "}
          {formatCurrency(paymentMeta.paidAmount)} | Pending{" "}
          {formatCurrency(paymentMeta.pendingAmount)}
        </Text>
        <Text style={{ fontSize: 12, color: paymentMeta.text, marginTop: 4 }}>
          Application: {paymentMeta.applicationId}
        </Text>
        <Text style={{ fontSize: 12, color: paymentMeta.text, marginTop: 4 }}>
          Backend Status: {paymentMeta.rawStatus || "Pending"}
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
          Grand Total: {formatCurrency(order?.ordergrandtotal || 0)}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Item Count: {order?.itemcount || 0} | Item Qty: {order?.itemqty || 0}
        </Text>
      </View>

      <ProductList orderdata={order?.orderdata} />
    </View>
  );
};

const ClientWiseOrders = ({ users }) => {
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

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

  if (!users?.length) {
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
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 18 }}>
      <SectionTitle title="Client Wise Payouts" rightText={`${users.length} Clients`} />
      {users.map((user, userIndex) => {
        const userKey = user?.userid || `NO_USER_${userIndex}`;
        const isUserExpanded = expandedUser === userKey;

        return (
          <View
            key={userKey}
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 16,
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onToggleUser(userKey)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "#f9fafb",
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
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#111827" }}>
                    {user?.username || "Unknown User"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
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
                    name={isUserExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
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
                  const paymentMeta = order?.paymentmeta || getOrderPaymentMeta(order);

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
                          paddingVertical: 12,
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
                            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                              Date: {formatDateOnly(order?.orderdate)}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                              Items: {order?.itemcount || 0} | Qty: {order?.itemqty || 0}
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
                              <Icon name={paymentMeta.icon} size={13} color={paymentMeta.text} />
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
                                fontSize: 11,
                                color: "#047857",
                                fontWeight: "800",
                                marginTop: 6,
                              }}
                            >
                              Payable: {formatCurrency(paymentMeta.totalPayout)}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#2563eb",
                                fontWeight: "800",
                                marginTop: 2,
                              }}
                            >
                              Pending: {formatCurrency(paymentMeta.pendingAmount)}
                            </Text>
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
  );
};

const PartnerFastDeliveryPayoutAnalytics = ({ partnerid, partnername }) => {
  const { setLoading } = useLoading();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("TODAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rawPartner, setRawPartner] = useState(null);

  const partnerData = useMemo(
    () => normalizePartnerData(rawPartner, partnerid, partnername),
    [rawPartner, partnerid, partnername]
  );

  const summary = useMemo(
    () => ({
      totalclients: partnerData?.totalusers || 0,
      deliveredorders: partnerData?.totalorders || 0,
      deliveredamount: partnerData?.totalamount || 0,
      totalpayout: partnerData?.totalpayout || 0,
      paidpayoutamount: partnerData?.paidpayoutamount || 0,
      pendingpayoutamount: partnerData?.pendingpayoutamount || 0,
      processedorders: partnerData?.processedorders || 0,
      paidorders: partnerData?.paidorders || 0,
      pendingorders: partnerData?.pendingorders || 0,
    }),
    [partnerData]
  );

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.append("orderType", "FASTDELIVERY");
    params.append("filterType", filterType);
    if (partnerid) {
      params.append("mappedPartnerId", partnerid);
    }
    if (filterType === "CUSTOM") {
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
    }
    return `ProductOrder/GroceryOrdersDashboard?${params.toString()}`;
  };

  const buildKitchenPayoutUrl = () => {
    const params = new URLSearchParams();
    params.append("payout", "1");
    params.append("filterType", filterType);
    if (partnerid) {
      params.append("mappedpartnerid", partnerid);
    }
    if (filterType === "CUSTOM") {
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
    }
    return `DearKitchen/Orders?${params.toString()}`;
  };

  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!partnerid) return;

      try {
        if (filterType === "CUSTOM" && (!fromDate || !toDate)) {
          setRawPartner(null);
          return;
        }

        if (showLoader) {
          setLoading(true, "Fetching payout analytics...");
        }

        const [res, kitchenRes] = await Promise.all([
          API.GET(buildUrl()),
          API.GET(buildKitchenPayoutUrl()),
        ]);
        const partners = Array.isArray(res?.partners) ? res.partners : [];
        const matchedPartner =
          partners.find(
            (partner) =>
              String(partner?.mappedpartnerid || "") === String(partnerid)
          ) || null;
        const kitchenPartner = buildKitchenPayoutPartner(
          kitchenRes?.Response || [],
          partnerid,
          partnername
        );

        setRawPartner({
          ...(matchedPartner || {}),
          mappedpartnerid: matchedPartner?.mappedpartnerid || partnerid,
          partnername: matchedPartner?.partnername || partnername,
          users: [
            ...((matchedPartner && Array.isArray(matchedPartner?.users)) ? matchedPartner.users : []),
            ...((kitchenPartner && Array.isArray(kitchenPartner?.users)) ? kitchenPartner.users : []),
          ],
        });
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to fetch payout analytics");
      } finally {
        if (showLoader) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [filterType, fromDate, partnerid, setLoading, toDate]
  );

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  useEffect(() => {
    if (filterType !== "CUSTOM") {
      setFromDate("");
      setToDate("");
    }
  }, [filterType]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
          Payout Analytics
        </Text>
        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
          Delivered fast-delivery orders for {partnername || "this partner"} only.
        </Text>
      </View>

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
        <Text style={{ fontSize: 12, color: "#065f46", fontWeight: "700" }}>
          Payout configured per delivered fast-delivery order
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
      </View>

      <DurationFilterBar selected={filterType} onChange={setFilterType} />

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
            onPress={() => fetchData(true)}
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

      <View style={{ marginBottom: 18 }}>
        <SectionTitle title="Partner Summary" />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <SummaryCard
            title="Delivered Orders"
            value={summary.deliveredorders || 0}
            icon="check-circle"
          />
          <SummaryCard
            title="Clients"
            value={summary.totalclients || 0}
            icon="people"
          />
          <SummaryCard
            title="Total Payable"
            value={formatCurrency(summary.totalpayout || 0)}
            icon="payments"
          />
          <SummaryCard
            title="Paid Amount"
            value={formatCurrency(summary.paidpayoutamount || 0)}
            icon="paid"
          />
          <SummaryCard
            title="Pending Amount"
            value={formatCurrency(summary.pendingpayoutamount || 0)}
            icon="hourglass-top"
          />
          <SummaryCard
            title="Delivered Value"
            value={formatCurrency(summary.deliveredamount || 0)}
            icon="receipt-long"
          />
        </View>
      </View>

      <ClientWiseOrders users={partnerData?.users || []} />
    </ScrollView>
  );
};

export default PartnerFastDeliveryPayoutAnalytics;
