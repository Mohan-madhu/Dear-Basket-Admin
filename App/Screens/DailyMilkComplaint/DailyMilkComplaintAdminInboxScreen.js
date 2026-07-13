import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MessageCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import Storage from "../../../App_Utils/Services/StorageService";
import { getUserFacingErrorMessage } from "../../../App_Utils/Services/APIService";
import { complaintChatApi } from "./complaintChatApi";

const POLL_INTERVAL_MS = 8000;

const parseServerDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatInboxTime = (value) => {
  const date = parseServerDate(value);
  if (!date) return "";
  const now = new Date();
  const sameDay = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  if (sameDay.format(date) === sameDay.format(now)) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const getInitials = (name) => {
  const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
};

export default function DailyMilkComplaintAdminInboxScreen() {
  const navigation = useNavigation();
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const searchRef = useRef("");
  const [admin, setAdmin] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    mountedRef.current = true;
    Storage.getData("DATA").then((data) => {
      if (mountedRef.current) setAdmin(data || null);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadConversations = useCallback(
    async ({ silent = false, searchText = searchRef.current } = {}) => {
      if (!admin?.transid || loadingRef.current) return;
      loadingRef.current = true;
      if (!silent) setErrorMessage("");

      try {
        const response = await complaintChatApi.getAdminConversations({
          adminid: admin.transid,
          search: searchText.trim(),
        });
        if (!mountedRef.current) return;
        const rows = response?.Response || response?.response || [];
        setConversations(Array.isArray(rows) ? rows : []);
        setErrorMessage("");
      } catch (error) {
        if (!mountedRef.current || silent) return;
        setErrorMessage(
          getUserFacingErrorMessage(error, "Unable to load Daily Milk complaints.")
        );
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [admin?.transid]
  );

  useFocusEffect(
    useCallback(() => {
      if (!admin?.transid) return undefined;
      loadConversations();
      const timer = setInterval(
        () => loadConversations({ silent: true }),
        POLL_INTERVAL_MS
      );
      return () => clearInterval(timer);
    }, [admin?.transid, loadConversations])
  );

  useEffect(() => {
    if (!admin?.transid) return undefined;
    const timer = setTimeout(
      () => loadConversations({ searchText: search }),
      350
    );
    return () => clearTimeout(timer);
  }, [admin?.transid, loadConversations, search]);

  const unreadTotal = useMemo(
    () => conversations.reduce((total, item) => total + Number(item.unreadcount || 0), 0),
    [conversations]
  );

  const visibleConversations = useMemo(() => {
    if (filter === "UNREAD") {
      return conversations.filter((item) => Number(item.unreadcount || 0) > 0);
    }
    return conversations;
  }, [conversations, filter]);

  const openConversation = (item) => {
    navigation.navigate("DailyMilkComplaintChat", {
      mode: "admin",
      user: item,
    });
  };

  const renderConversation = ({ item }) => {
    const unread = Number(item.unreadcount || 0);
    const name = item.username || item.name || item.userid || "Daily Milk User";
    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() => openConversation(item)}
        activeOpacity={0.78}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.conversationBody}>
          <View style={styles.conversationTopRow}>
            <Text style={[styles.userName, unread > 0 && styles.unreadName]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.messageTime, unread > 0 && styles.unreadTime]}>
              {formatInboxTime(item.lastmessagetime)}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.messagePreview, unread > 0 && styles.unreadPreview]} numberOfLines={1}>
              {String(item.lastsenderrole || "").toUpperCase() === "ADMIN" ? "You: " : ""}
              {item.lastmessage || "Complaint started"}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            )}
          </View>
          <Text style={styles.userMeta} numberOfLines={1}>
            {item.usermobile || "No mobile"}  •  {item.userid}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Daily Milk Complaints</Text>
          <Text style={styles.headerSubtitle}>
            {conversations.length} conversations  •  {unreadTotal} unread
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setRefreshing(true);
            loadConversations();
          }}
          accessibilityLabel="Refresh complaints"
        >
          <RefreshCw size={19} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, mobile or user ID"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          {!!search && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearch("")} accessibilityLabel="Clear search">
              <X size={17} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, filter === "ALL" && styles.filterButtonActive]}
            onPress={() => setFilter("ALL")}
          >
            <Text style={[styles.filterText, filter === "ALL" && styles.filterTextActive]}>
              All {conversations.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === "UNREAD" && styles.filterButtonActive]}
            onPress={() => setFilter("UNREAD")}
          >
            <Text style={[styles.filterText, filter === "UNREAD" && styles.filterTextActive]}>
              Unread {conversations.filter((item) => Number(item.unreadcount || 0) > 0).length}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!errorMessage && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {initialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0891b2" />
          <Text style={styles.loadingText}>Loading complaint conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => String(item.conversationid)}
          contentContainerStyle={visibleConversations.length ? styles.list : styles.emptyList}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadConversations();
              }}
              tintColor="#0891b2"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MessageCircle size={30} color="#0891b2" />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === "UNREAD" ? "No unread complaints" : "No complaint conversations"}
              </Text>
              <Text style={styles.emptyText}>
                {search
                  ? "No complaint user matches your search."
                  : "Users will appear here only after they send their first Daily Milk complaint message."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: { minHeight: 68, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, marginLeft: 4 },
  headerTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
  headerSubtitle: { color: "#94a3b8", fontSize: 11, marginTop: 3 },
  controls: { backgroundColor: "#ffffff", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchBox: { height: 46, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14, marginLeft: 9 },
  clearButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  filterButton: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  filterButtonActive: { backgroundColor: "#cffafe", borderColor: "#22d3ee" },
  filterText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#0e7490" },
  list: { backgroundColor: "#ffffff" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  conversationRow: { minHeight: 92, flexDirection: "row", alignItems: "center", paddingLeft: 14, backgroundColor: "#ffffff" },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#164e63" },
  avatarText: { color: "#ecfeff", fontSize: 16, fontWeight: "900" },
  conversationBody: { flex: 1, minHeight: 92, justifyContent: "center", marginLeft: 12, paddingRight: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#cbd5e1" },
  conversationTopRow: { flexDirection: "row", alignItems: "center" },
  userName: { flex: 1, color: "#334155", fontSize: 15, fontWeight: "700", marginRight: 8 },
  unreadName: { color: "#0f172a", fontWeight: "900" },
  messageTime: { color: "#94a3b8", fontSize: 10 },
  unreadTime: { color: "#0891b2", fontWeight: "800" },
  previewRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  messagePreview: { flex: 1, color: "#64748b", fontSize: 13, marginRight: 8 },
  unreadPreview: { color: "#334155", fontWeight: "700" },
  unreadBadge: { minWidth: 21, height: 21, paddingHorizontal: 5, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#06b6d4" },
  unreadBadgeText: { color: "#083344", fontSize: 10, fontWeight: "900" },
  userMeta: { color: "#94a3b8", fontSize: 10, marginTop: 5 },
  errorBar: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fee2e2", borderBottomWidth: 1, borderBottomColor: "#fecaca" },
  errorText: { color: "#991b1b", fontSize: 11, textAlign: "center" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#64748b", fontSize: 13, marginTop: 10 },
  emptyState: { alignItems: "center", paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#cffafe" },
  emptyTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900", marginTop: 15 },
  emptyText: { color: "#64748b", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
});
