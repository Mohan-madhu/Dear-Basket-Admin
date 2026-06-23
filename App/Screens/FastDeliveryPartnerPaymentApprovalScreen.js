import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

const STATUS_OPTIONS = ["All", "Applied", "Approved", "Paid", "Verified", "Rejected", "Cancelled"];

const parseNumber = (value) => Number(value || 0);
const formatCurrency = (value) => `₹${parseNumber(value).toFixed(2)}`;
const formatShortApplicationId = (value) => {
  const id = String(value || "").trim();
  return id ? `#${id.slice(0, 5).toUpperCase()}` : "-";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const getField = (row, properKey, typoKey) =>
  row?.[properKey] ?? row?.[typoKey] ?? null;

const getApplicationOrderIds = (row) => {
  const raw =
    row?.payoutapplicationkitchenorderids ||
    row?.payoutapplicationorderids ||
    row?.orderids ||
    row?.productorderids ||
    "";
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeStatus = (row) =>
  String(row?.payoutapplicationstatus || row?.payputapplicationstatus || "Applied");

const statusMeta = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "verified" };
  if (s === "paid") return { bg: "#ecfeff", border: "#a5f3fc", text: "#0e7490", icon: "payments" };
  if (s === "verified") return { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", icon: "task-alt" };
  if (s === "rejected") return { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", icon: "block" };
  if (s === "cancelled") return { bg: "#f3f4f6", border: "#d1d5db", text: "#374151", icon: "cancel" };
  return { bg: "#fffbeb", border: "#fde68a", text: "#b45309", icon: "pending-actions" };
};

const FastDeliveryPartnerPaymentApprovalScreen = ({ navigation }) => {
  const { setLoading } = useLoading();
  const { height } = useWindowDimensions();
  const loadingRef = useRef(setLoading);
  const detailScrollMaxHeight = Math.max(220, height * 0.52);

  const [adminId, setAdminId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [applications, setApplications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [expandedPartners, setExpandedPartners] = useState({});
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);

  useEffect(() => {
    loadingRef.current = setLoading;
  }, [setLoading]);

  useEffect(() => {
    const loadSession = async () => {
      const data = await Storage.getData("DATA");
      setAdminId(String(data?.transid || ""));
      setAdminName(String(data?.name || ""));
    };
    loadSession();
  }, []);

  const fetchApplications = useCallback(async () => {
    const res = await API.GET("PartnerPayoutApplication");
    const rows = Array.isArray(res?.Response) ? res.Response : [];
    return [...rows].sort((a, b) => new Date(b?.rcm || 0) - new Date(a?.rcm || 0));
  }, []);

  const loadAll = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoadingPage(true);
          loadingRef.current?.(true, "Loading payout applications...");
        }
        const rows = await fetchApplications();
        setApplications(rows);
      } finally {
        setLoadingPage(false);
        setRefreshing(false);
        loadingRef.current?.(false);
      }
    },
    [fetchApplications]
  );

  useEffect(() => {
    loadAll(true);
  }, [loadAll]);

  const summary = useMemo(() => {
    return applications.reduce(
      (acc, row) => {
        const amount = parseNumber(row?.totalamount);
        const status = normalizeStatus(row).toLowerCase();
        acc.totalApplications += 1;
        acc.totalAmount += amount;
        if (status === "applied") acc.applied += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "paid") acc.paid += 1;
        if (status === "verified") acc.verified += 1;
        if (status === "rejected") acc.rejected += 1;
        if (status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      {
        totalApplications: 0,
        totalAmount: 0,
        applied: 0,
        approved: 0,
        paid: 0,
        verified: 0,
        rejected: 0,
        cancelled: 0,
      }
    );
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let rows = applications;
    if (selectedStatus !== "All") {
      rows = rows.filter((row) => normalizeStatus(row) === selectedStatus);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const id = String(row?.payoutapplicationid || "").toLowerCase();
      const shortId = formatShortApplicationId(row?.payoutapplicationid).toLowerCase();
      const partnerid = String(row?.partnerid || "").toLowerCase();
      const partnername = String(row?.partnername || "").toLowerCase();
      const status = String(normalizeStatus(row) || "").toLowerCase();
      return (
        id.includes(q) ||
        shortId.includes(q) ||
        partnerid.includes(q) ||
        partnername.includes(q) ||
        status.includes(q)
      );
    });
  }, [applications, selectedStatus, search]);

  const groupedPartners = useMemo(() => {
    const map = new Map();
    filteredApplications.forEach((row) => {
      const partnerid = String(row?.partnerid || "UNKNOWN");
      const partnername = row?.partnername || "Unknown Partner";
      const existing = map.get(partnerid) || {
        partnerid,
        partnername,
        count: 0,
        totalAmount: 0,
        openCount: 0,
        applications: [],
      };
      const status = normalizeStatus(row).toLowerCase();
      existing.count += 1;
      existing.totalAmount += parseNumber(row?.totalamount);
      if (["applied", "approved", "paid"].includes(status)) existing.openCount += 1;
      existing.applications.push(row);
      map.set(partnerid, existing);
    });
    return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredApplications]);

  useEffect(() => {
    setExpandedPartners((prev) => {
      const next = { ...prev };
      groupedPartners.forEach((partner) => {
        if (next[partner.partnerid] === undefined) {
          next[partner.partnerid] = true;
        }
      });
      return next;
    });
  }, [groupedPartners]);

  const syncKitchenPayoutOrders = async (row, status, updaterId) => {
    const orderIds = getApplicationOrderIds(row);
    if (!orderIds.length) return;

    await Promise.all(
      orderIds.map((orderid) =>
        API.PUT("DearKitchen/Orders", {
          orderid,
          partnerpayoutapplicationid: row?.payoutapplicationid,
          partnerpayoutapplicationstatus: status,
          partnerpayoutpaid: status === "Paid" ? "1" : "0",
          luu: updaterId || "ADMIN",
        }).catch(() => null)
      )
    );
  };

  const runAction = async (label, apiPath, payload, row = null, kitchenStatus = null) => {
    try {
      setActionLoading(true);
      loadingRef.current?.(true, `${label}...`);
      await API.PUT(apiPath, payload);
      if (row && kitchenStatus) {
        await syncKitchenPayoutOrders(row, kitchenStatus, payload?.luu);
      }
      await loadAll(false);
      if (selectedApplication?.payoutapplicationid === payload?.payoutapplicationid) {
        const updated = (await fetchApplications()).find(
          (x) => x?.payoutapplicationid === payload?.payoutapplicationid
        );
        if (updated) setSelectedApplication(updated);
      }
      Alert.alert("Success", `${label} successful.`);
    } catch (error) {
      Alert.alert("Error", error?.message || `Failed to ${label.toLowerCase()}.`);
    } finally {
      setActionLoading(false);
      loadingRef.current?.(false);
    }
  };

  const onApprove = (row) => {
    Alert.alert("Approve", "Approve this payout application?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () =>
          runAction("Approve", "PartnerPayoutApplication/approve", {
            payoutapplicationid: row?.payoutapplicationid,
            payoutapplicationapprovedby: adminId || adminName || "ADMIN",
            luu: adminId || "ADMIN",
          }, row, "Approved"),
      },
    ]);
  };

  const openReject = (row) => {
    setRejectTarget(row);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectTarget?.payoutapplicationid) return;
    if (!rejectReason.trim()) {
      Alert.alert("Validation", "Please enter reject reason.");
      return;
    }
    setShowRejectModal(false);
    await runAction("Reject", "PartnerPayoutApplication/reject", {
      payoutapplicationid: rejectTarget?.payoutapplicationid,
      payoutapplicationrejectedby: adminId || adminName || "ADMIN",
      payputapplicationrejectedreason: rejectReason.trim(),
      luu: adminId || "ADMIN",
    }, rejectTarget, "Rejected");
    setRejectTarget(null);
    setRejectReason("");
  };

  const onMarkPaid = (row) => {
    Alert.alert("Mark as Paid", "Mark this application as paid?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () =>
          runAction("Mark Paid", "PartnerPayoutApplication/paid", {
            payoutapplicationid: row?.payoutapplicationid,
            payoutapplicationamountpaidby: adminId || adminName || "ADMIN",
            luu: adminId || "ADMIN",
          }, row, "Paid"),
      },
    ]);
  };

  const onCancel = (row) => {
    Alert.alert("Cancel Application", "Cancel this payout application?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () =>
          runAction("Cancel", "PartnerPayoutApplication/cancel", {
            payoutapplicationid: row?.payoutapplicationid,
            payoutapplicationcancelledby: adminId || adminName || "ADMIN",
            luu: adminId || "ADMIN",
          }, row, "Cancelled"),
      },
    ]);
  };

  const renderActions = (row) => {
    const status = normalizeStatus(row).toLowerCase();
    if (status === "applied") {
      return (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              disabled={actionLoading}
              onPress={() => onApprove(row)}
              style={{ flex: 1, backgroundColor: actionLoading ? "#93c5fd" : "#2563eb", borderRadius: 10, paddingVertical: 9, marginRight: 5 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 12 }}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={actionLoading}
              onPress={() => openReject(row)}
              style={{ flex: 1, backgroundColor: actionLoading ? "#fca5a5" : "#ef4444", borderRadius: 10, paddingVertical: 9, marginLeft: 5 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 12 }}>Reject</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            disabled={actionLoading}
            onPress={() => onCancel(row)}
            style={{ backgroundColor: actionLoading ? "#d1d5db" : "#4b5563", borderRadius: 10, paddingVertical: 9, marginTop: 8 }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (status === "approved") {
      return (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              disabled={actionLoading}
              onPress={() => onMarkPaid(row)}
              style={{ flex: 1, backgroundColor: actionLoading ? "#5eead4" : "#0d9488", borderRadius: 10, paddingVertical: 9, marginRight: 5 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 12 }}>Mark Paid</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={actionLoading}
              onPress={() => openReject(row)}
              style={{ flex: 1, backgroundColor: actionLoading ? "#fca5a5" : "#ef4444", borderRadius: 10, paddingVertical: 9, marginLeft: 5 }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 12 }}>Reject</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            disabled={actionLoading}
            onPress={() => onCancel(row)}
            style={{ backgroundColor: actionLoading ? "#d1d5db" : "#4b5563", borderRadius: 10, paddingVertical: 9, marginTop: 8 }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (status === "paid") {
      return (
        <View style={{ marginTop: 10 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#a5f3fc",
              backgroundColor: "#ecfeff",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 11, color: "#0e7490", fontWeight: "700" }}>
              Payment verification is partner-only. After paid, admin cannot cancel or verify this application.
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll(false);
  };

  const togglePartnerExpand = (partnerid) => {
    setExpandedPartners((prev) => ({
      ...prev,
      [partnerid]: !prev[partnerid],
    }));
  };

  if (loadingPage && !applications.length) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: "#4b5563" }}>Loading payout approvals...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View
        style={{
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" }}
        >
          <Icon name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" }}>
            Partner Payout Approval
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center" }}
        >
          <Icon name="refresh" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          <View style={{ width: "48.5%", backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "700" }}>Applications</Text>
            <Text style={{ marginTop: 6, fontSize: 20, color: "#111827", fontWeight: "900" }}>{summary.totalApplications}</Text>
          </View>
          <View style={{ width: "48.5%", backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "700" }}>Total Amount</Text>
            <Text style={{ marginTop: 6, fontSize: 20, color: "#111827", fontWeight: "900" }}>{formatCurrency(summary.totalAmount)}</Text>
          </View>
          <View style={{ width: "32%", backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 12, padding: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 10, color: "#92400e", fontWeight: "700" }}>Applied</Text>
            <Text style={{ marginTop: 4, fontSize: 16, color: "#92400e", fontWeight: "900" }}>{summary.applied}</Text>
          </View>
          <View style={{ width: "32%", backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 12, padding: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 10, color: "#1d4ed8", fontWeight: "700" }}>Approved</Text>
            <Text style={{ marginTop: 4, fontSize: 16, color: "#1d4ed8", fontWeight: "900" }}>{summary.approved}</Text>
          </View>
          <View style={{ width: "32%", backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#a5f3fc", borderRadius: 12, padding: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 10, color: "#0e7490", fontWeight: "700" }}>Paid</Text>
            <Text style={{ marginTop: 4, fontSize: 16, color: "#0e7490", fontWeight: "900" }}>{summary.paid}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, padding: 12, marginTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 10 }}>
            <Icon name="search" size={16} color="#6b7280" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by app id, partner, status..."
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, fontSize: 12, color: "#111827", paddingVertical: 9, marginLeft: 6 }}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {STATUS_OPTIONS.map((item) => {
              const active = selectedStatus === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedStatus(item)}
                  style={{
                    marginRight: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "#111827" : "#d1d5db",
                    backgroundColor: active ? "#111827" : "white",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "white" : "#374151" }}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827", marginBottom: 8 }}>
            Partner Wise Applications ({groupedPartners.length})
          </Text>

          {!groupedPartners.length ? (
            <View style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 14 }}>
              <Text style={{ color: "#6b7280", textAlign: "center" }}>No applications match your filters.</Text>
            </View>
          ) : (
            groupedPartners.map((partner) => {
              const expanded = !!expandedPartners[partner.partnerid];
              return (
                <View
                  key={partner.partnerid}
                  style={{
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => togglePartnerExpand(partner.partnerid)}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#111827" }}>{partner.partnername}</Text>
                      <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{partner.partnerid}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", marginRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>{formatCurrency(partner.totalAmount)}</Text>
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>{partner.count} applications</Text>
                    </View>
                    <Icon name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color="#374151" />
                  </TouchableOpacity>

                

                  {expanded ? (
                    <View style={{ marginTop: 10 }}>
                      {partner.applications.map((row) => {
                        const s = normalizeStatus(row);
                        const m = statusMeta(s);
                        return (
                          <TouchableOpacity
                            key={row?.payoutapplicationid}
                            activeOpacity={0.9}
                            onPress={() => {
                              setSelectedApplication(row);
                              setShowDetailModal(true);
                            }}
                            style={{
                              backgroundColor: "#f9fafb",
                              borderWidth: 1,
                              borderColor: "#e5e7eb",
                              borderRadius: 12,
                              padding: 11,
                              marginBottom: 8,
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={{ fontSize: 12, color: "#6b7280" }}>App ID</Text>
                                <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginTop: 1 }}>
                                  {formatShortApplicationId(row?.payoutapplicationid)}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: m.bg,
                                  borderColor: m.border,
                                  borderWidth: 1,
                                  borderRadius: 999,
                                  paddingHorizontal: 9,
                                  paddingVertical: 4,
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                              >
                                <Icon name={m.icon} size={13} color={m.text} />
                                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: "800", color: m.text }}>{s}</Text>
                              </View>
                            </View>

                            <Text style={{ marginTop: 6, fontSize: 17, fontWeight: "900", color: "#111827" }}>
                              {formatCurrency(row?.totalamount)}
                            </Text>
                            <Text style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>
                              {row?.nooforders || 0} orders • {row?.payouttype || "-"}
                            </Text>
                            <Text style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>
                              Applied at: {formatDateTime(getField(row, "payoutapplicationappliedat", "payputapplicationappliedat") || row?.rcm)}
                            </Text>

                            {renderActions(row)}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <SafeAreaView style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" }}>
          <View style={{ padding: 14, paddingBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>Payout Application</Text>

            {selectedApplication ? (
              <ScrollView
                style={{ marginTop: 8, maxHeight: detailScrollMaxHeight }}
                contentContainerStyle={{ paddingBottom: 14 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>Application ID</Text>
                  <Text style={{ fontSize: 13, color: "#111827", fontWeight: "800", marginTop: 2 }}>
                    {formatShortApplicationId(selectedApplication?.payoutapplicationid)}
                  </Text>
                  <Text style={{ fontSize: 22, color: "#111827", fontWeight: "900", marginTop: 10 }}>
                    {formatCurrency(selectedApplication?.totalamount)}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    {selectedApplication?.partnername || "-"} • {selectedApplication?.partnerid || "-"}
                  </Text>
                </View>

                <View style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12, marginTop: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827", marginBottom: 6 }}>Timeline</Text>
                  <Text style={{ fontSize: 12, color: "#374151" }}>
                    Applied: {formatDateTime(getField(selectedApplication, "payoutapplicationappliedat", "payputapplicationappliedat") || selectedApplication?.rcm)}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>
                    Approved: {formatDateTime(getField(selectedApplication, "payoutapplicationapprovedat", "payputapplicationapprovedat"))}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>
                    Paid: {formatDateTime(getField(selectedApplication, "payoutapplicationamountpaidat", "payputapplicationamountpaidat"))}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>
                    Verified: {formatDateTime(getField(selectedApplication, "payoutapplicationpaymentverifiedat", "payputapplicationpaymentverifiedat"))}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>
                    Cancelled: {formatDateTime(getField(selectedApplication, "payoutapplicationcancelledat", "payputapplicationcancelledat"))}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>
                    Rejected: {formatDateTime(getField(selectedApplication, "payoutapplicationrejectedat", "payputapplicationrejectedat"))}
                  </Text>
                  {getField(selectedApplication, "payoutapplicationrejectedreason", "payputapplicationrejectedreason") ? (
                    <Text style={{ fontSize: 12, color: "#be123c", marginTop: 5 }}>
                      Reject Reason: {getField(selectedApplication, "payoutapplicationrejectedreason", "payputapplicationrejectedreason")}
                    </Text>
                  ) : null}
                </View>

                <View style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 12, marginTop: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827", marginBottom: 6 }}>Payout Details</Text>
                  <Text style={{ fontSize: 12, color: "#374151" }}>Type: {selectedApplication?.payouttype || "-"}</Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>GPay: {selectedApplication?.payoutgpaynumber || "-"}</Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>Bank: {selectedApplication?.payoutbankname || "-"}</Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>Account: {selectedApplication?.payoutaccountnumber || "-"}</Text>
                  <Text style={{ fontSize: 12, color: "#374151", marginTop: 5 }}>IFSC: {selectedApplication?.payoutifsc || "-"}</Text>
                </View>

              </ScrollView>
            ) : null}

            {selectedApplication ? (
              <View style={{ paddingTop: 4 }}>
                {renderActions(selectedApplication)}
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={{ marginTop: 12, backgroundColor: "#e5e7eb", borderRadius: 12, paddingVertical: 12 }}
            >
              <Text style={{ textAlign: "center", color: "#1f2937", fontWeight: "800" }}>Close</Text>
            </TouchableOpacity>
          </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: "#111827" }}>Reject Application</Text>
            <Text style={{ marginTop: 5, fontSize: 12, color: "#6b7280" }}>
              Enter reason before rejecting this payout request.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Reject reason"
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 10,
                fontSize: 12,
                color: "#111827",
                backgroundColor: "#f9fafb",
              }}
            />
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                style={{ flex: 1, backgroundColor: "#e5e7eb", borderRadius: 10, paddingVertical: 11, marginRight: 5 }}
              >
                <Text style={{ textAlign: "center", color: "#1f2937", fontWeight: "800" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={actionLoading}
                onPress={submitReject}
                style={{ flex: 1, backgroundColor: actionLoading ? "#fca5a5" : "#ef4444", borderRadius: 10, paddingVertical: 11, marginLeft: 5 }}
              >
                <Text style={{ textAlign: "center", color: "white", fontWeight: "800" }}>Submit Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FastDeliveryPartnerPaymentApprovalScreen;
