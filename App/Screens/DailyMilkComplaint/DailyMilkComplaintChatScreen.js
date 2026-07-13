import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MessageCircle, RefreshCw, Send } from "lucide-react-native";
import Storage from "../../../App_Utils/Services/StorageService";
import { getUserFacingErrorMessage } from "../../../App_Utils/Services/APIService";
import { complaintChatApi } from "./complaintChatApi";

const POLL_INTERVAL_MS = 5000;
const MAX_MESSAGE_LENGTH = 2000;

const parseServerDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (value) => {
  const date = parseServerDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const dateKey = (value) => {
  const date = parseServerDate(value);
  if (!date) return "unknown";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatDateLabel = (value) => {
  const date = parseServerDate(value);
  if (!date) return "Earlier";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const key = dateKey(value);
  const localKey = (item) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(item);

  if (key === localKey(today)) return "Today";
  if (key === localKey(yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const normalizeMessages = (response) => {
  const rows = response?.Messages || response?.messages || response?.Response || [];
  return Array.isArray(rows) ? rows : [];
};

export default function DailyMilkComplaintChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const listRef = useRef(null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const [identity, setIdentity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = String(route.params?.mode || "").toLowerCase() === "admin";
  const targetUser = route.params?.user || {};
  const userid = isAdmin
    ? targetUser.userid
    : route.params?.userid || identity?.transid;
  const readerRole = isAdmin ? "ADMIN" : "USER";
  const readerId = identity?.transid;
  const title = isAdmin
    ? targetUser.username || targetUser.name || targetUser.userid || "Daily Milk User"
    : "Daily Milk Support";
  const subtitle = isAdmin
    ? targetUser.usermobile || targetUser.mobile || targetUser.userid || "Complaint conversation"
    : "Admin assistance";

  useEffect(() => {
    mountedRef.current = true;
    Storage.getData("DATA").then((data) => {
      if (mountedRef.current) setIdentity(data || null);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const markIncomingAsRead = useCallback(
    async (rows) => {
      const hasUnreadIncoming = rows.some(
        (message) =>
          String(message.senderrole || "").toUpperCase() !== readerRole &&
          Number(message.isread || 0) === 0
      );
      if (!hasUnreadIncoming || !userid || !readerId) return;
      try {
        await complaintChatApi.markRead({
          userid,
          readerid: readerId,
          readerrole: readerRole,
        });
      } catch (error) {
        console.log("Complaint read update failed:", error?.message || error);
      }
    },
    [readerId, readerRole, userid]
  );

  const loadConversation = useCallback(
    async ({ silent = false } = {}) => {
      if (!userid || !readerId || loadingRef.current) return;
      loadingRef.current = true;
      if (!silent) setErrorMessage("");

      try {
        const response = await complaintChatApi.getConversation({
          userid,
          readerid: readerId,
          readerrole: readerRole,
        });
        if (!mountedRef.current) return;

        const nextMessages = normalizeMessages(response);
        setMessages(nextMessages);
        setConversation(response?.Conversation || response?.conversation || null);
        setErrorMessage("");
        markIncomingAsRead(nextMessages);
      } catch (error) {
        if (!mountedRef.current || silent) return;
        setErrorMessage(
          getUserFacingErrorMessage(error, "Unable to load this conversation.")
        );
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [markIncomingAsRead, readerId, readerRole, userid]
  );

  useFocusEffect(
    useCallback(() => {
      if (!userid || !readerId) return undefined;
      loadConversation();
      const timer = setInterval(
        () => loadConversation({ silent: true }),
        POLL_INTERVAL_MS
      );
      return () => clearInterval(timer);
    }, [loadConversation, readerId, userid])
  );

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const displayItems = useMemo(() => {
    const items = [];
    let previousDate = null;
    messages.forEach((message) => {
      const currentDate = dateKey(message.createdat);
      if (currentDate !== previousDate) {
        items.push({
          type: "date",
          id: `date-${currentDate}`,
          label: formatDateLabel(message.createdat),
        });
        previousDate = currentDate;
      }
      items.push({
        type: "message",
        id: `message-${message.messageid}`,
        message,
      });
    });
    return items;
  }, [messages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !userid || !readerId || sending) return;

    setSending(true);
    setErrorMessage("");
    try {
      const response = await complaintChatApi.sendMessage({
        userid,
        senderid: readerId,
        senderrole: readerRole,
        message: text,
      });
      if (!mountedRef.current) return;
      setDraft("");

      const sentMessage = response?.Response || response?.response;
      if (sentMessage?.messageid) {
        setMessages((current) => {
          if (current.some((item) => item.messageid === sentMessage.messageid)) return current;
          return [...current, sentMessage];
        });
      }
      setConversation(response?.Conversation || conversation);
      await loadConversation({ silent: true });
    } catch (error) {
      if (mountedRef.current) {
        setErrorMessage(
          getUserFacingErrorMessage(error, "Unable to send the message.")
        );
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      );
    }

    const message = item.message;
    const mine = String(message.senderrole || "").toUpperCase() === readerRole;
    return (
      <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}>
        <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, mine ? styles.mineText : styles.theirText]}>
            {message.messagetext}
          </Text>
          <View style={styles.messageMeta}>
            <Text style={[styles.timeText, mine ? styles.mineTime : styles.theirTime]}>
              {formatTime(message.createdat)}
            </Text>
            {mine && (
              <Text style={[styles.readText, Number(message.isread || 0) === 1 && styles.readTextSeen]}>
                {Number(message.isread || 0) === 1 ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#f8fafc" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <MessageCircle size={20} color="#083344" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setRefreshing(true);
            loadConversation();
          }}
          accessibilityLabel="Refresh conversation"
        >
          <RefreshCw size={19} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {initialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#0891b2" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={displayItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messageList,
              !displayItems.length && styles.emptyMessageList,
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadConversation();
                }}
                tintColor="#0891b2"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MessageCircle size={28} color="#0891b2" />
                </View>
                <Text style={styles.emptyTitle}>
                  {isAdmin ? "No messages in this complaint" : "How can we help?"}
                </Text>
                <Text style={styles.emptyText}>
                  {isAdmin
                    ? "Send a reply to start assisting this user."
                    : "Describe your Daily Milk issue. Your message will go directly to the admin team."}
                </Text>
              </View>
            }
          />
        )}

        {!!errorMessage && (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type your message"
            placeholderTextColor="#64748b"
            style={styles.input}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!draft.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!draft.trim() || sending}
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#083344" />
            ) : (
              <Send size={20} color="#083344" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0f172a" },
  keyboardView: { flex: 1, backgroundColor: "#e7edf1" },
  header: {
    minHeight: 64,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22d3ee",
  },
  headerText: { flex: 1, marginLeft: 10 },
  headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "800" },
  headerSubtitle: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  messageList: { paddingHorizontal: 12, paddingVertical: 14, flexGrow: 1 },
  emptyMessageList: { justifyContent: "center" },
  dateRow: { alignItems: "center", marginVertical: 9 },
  dateText: {
    color: "#475569",
    backgroundColor: "#ffffff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "700",
    elevation: 1,
  },
  messageRow: { flexDirection: "row", marginVertical: 3 },
  mineRow: { justifyContent: "flex-end" },
  theirRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", minWidth: 74, paddingHorizontal: 11, paddingTop: 8, paddingBottom: 5, borderRadius: 8 },
  mineBubble: { backgroundColor: "#cffafe", borderTopRightRadius: 2 },
  theirBubble: { backgroundColor: "#ffffff", borderTopLeftRadius: 2 },
  messageText: { fontSize: 14, lineHeight: 20 },
  mineText: { color: "#164e63" },
  theirText: { color: "#1e293b" },
  messageMeta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 2, gap: 3 },
  timeText: { fontSize: 9 },
  mineTime: { color: "#0e7490" },
  theirTime: { color: "#94a3b8" },
  readText: { color: "#64748b", fontSize: 10, fontWeight: "800" },
  readTextSeen: { color: "#0284c7" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#475569", fontSize: 13, marginTop: 10 },
  emptyState: { alignItems: "center", paddingHorizontal: 30 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#cffafe", alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900", marginTop: 14 },
  emptyText: { color: "#64748b", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  errorBar: { backgroundColor: "#fee2e2", borderTopWidth: 1, borderTopColor: "#fecaca", paddingHorizontal: 14, paddingVertical: 8 },
  errorText: { color: "#991b1b", fontSize: 11, textAlign: "center" },
  composer: {
    minHeight: 62,
    maxHeight: 130,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#cbd5e1",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 23,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    fontSize: 14,
  },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#22d3ee", alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: "#cbd5e1" },
});
