import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Image } from "expo-image";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import QRCodeGenerator from "qrcode";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Config } from "../../config";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";

const Tab = createMaterialTopTabNavigator();
const ROLES = ["ADMIN", "PARTNER", "KITCHENPARTNER", "USER"];
const ROLE_LABELS = {
  ADMIN: "Admin",
  PARTNER: "Delivery Partner",
  KITCHENPARTNER: "Kitchen Partner",
  USER: "User",
};

const emptyForm = {
  transid: "",
  name: "",
  mobile: "",
  username: "",
  originalMobile: "",
  originalUsername: "",
  dob: "",
  address: "",
  profile: "",
  usertype: "USER",
  status: 1,
  password: "",
};

const normalize = (value) => value === null || value === undefined ? "" : String(value);
const escapeHtml = (value) =>
  normalize(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
const isDeletedAccount = (user) => Number(user?.isdeleted || 0) === 1;
const assertAccountResponse = (response, fallbackMessage) => {
  const status = response?.Status ?? response?.status;
  const responseCode = response?.ResponseCode ?? response?.responseCode;
  const failed =
    status === 0 ||
    status === false ||
    (responseCode && String(responseCode) !== "200" && String(responseCode).toLowerCase() !== "success");

  if (failed) {
    throw new Error(response?.Message || response?.message || response?.error || fallbackMessage);
  }
  return response;
};
const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN");
};

const profileUri = (value) => {
  const profile = String(value || "").trim();
  if (!profile || profile === "No File Uploaded") return null;
  if (/^https?:\/\//i.test(profile)) return profile;
  if (profile.startsWith("~/")) return `${Config.BASE_URL}${profile.slice(1)}`;
  if (profile.startsWith("/")) return `${Config.BASE_URL}${profile}`;
  return profile;
};

const RoleSelector = ({ value, onChange, disabled = false }) => (
  <View className="flex-row bg-gray-100 border border-gray-200 rounded-xl p-1">
    {ROLES.map((role) => {
      const active = value === role;
      return (
        <TouchableOpacity
          key={role}
          disabled={disabled}
          onPress={() => onChange(role)}
          className={`flex-1 min-h-10 rounded-lg items-center justify-center ${active ? "bg-blue-600" : "bg-transparent"}`}
        >
          <Text
            className={`text-xs font-bold text-center ${active ? "text-white" : "text-gray-600"}`}
            numberOfLines={2}
          >
            {ROLE_LABELS[role] || role}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  multiline,
  secureTextEntry,
  editable = true,
  helperText,
}) => (
  <View className="mb-3">
    <Text className="text-xs font-bold text-gray-700 mb-1.5">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType || "default"}
      maxLength={maxLength}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      textAlignVertical={multiline ? "top" : "center"}
      secureTextEntry={secureTextEntry}
      editable={editable}
      selectTextOnFocus={editable}
      className={`border rounded-xl px-3 text-sm ${editable ? "border-gray-300 bg-gray-50 text-gray-900" : "border-gray-200 bg-gray-100 text-gray-500"} ${multiline ? "py-3 min-h-20" : "min-h-12"}`}
    />
    {helperText ? <Text className="text-[10px] text-gray-500 mt-1">{helperText}</Text> : null}
  </View>
);

const PasswordField = ({ label, value, onChangeText, placeholder }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-3">
      <Text className="text-xs font-bold text-gray-700 mb-1.5">{label}</Text>
      <View className="border border-gray-300 bg-gray-50 rounded-xl px-3 min-h-12 flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "Enter password"}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!visible}
          className="flex-1 text-sm text-gray-900"
        />
        <TouchableOpacity onPress={() => setVisible((current) => !current)} className="pl-3 py-2">
          <Icon name={visible ? "visibility-off" : "visibility"} size={19} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const UserCard = ({
  user,
  currentAdminId,
  onEdit,
  onToggleStatus,
  onDelete,
  qrSelectable = false,
  qrSelected = false,
  onToggleQrSelect,
  onPrintQr,
  qrExporting = false,
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const image = profileUri(user?.profile);
  const active = Number(user?.status) === 1;
  const isCurrentAdmin = String(user?.transid) === String(currentAdminId);
  const password = normalize(user?.password);

  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-start">
        {image ? (
          <Image source={{ uri: image }} cachePolicy="memory-disk" contentFit="cover" style={{ width: 56, height: 56, borderRadius: 28 }} />
        ) : (
          <View className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 items-center justify-center">
            <Icon name="person" size={26} color="#6B7280" />
          </View>
        )}

        <View className="flex-1 ml-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-base font-bold text-gray-900">{user?.name || "Unnamed User"}</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>{user?.transid || "N/A"}</Text>
            </View>
            <View className="items-end">
              <View className={`px-2 py-1 rounded-full border ${active ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <Text className={`text-[10px] font-bold ${active ? "text-green-700" : "text-red-700"}`}>{active ? "Active" : "Inactive"}</Text>
              </View>
              {qrSelectable ? (
                <TouchableOpacity
                  disabled={qrExporting}
                  onPress={() => onToggleQrSelect?.(user)}
                  className={`mt-2 w-8 h-8 rounded-lg border items-center justify-center ${qrSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-300"}`}
                >
                  <Icon name={qrSelected ? "check" : "qr-code-2"} size={18} color={qrSelected ? "#FFFFFF" : "#4B5563"} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View className="mt-2">
            <Text className="text-xs text-gray-700">Mobile: {user?.mobile || "N/A"}</Text>
            <Text className="text-xs text-gray-600 mt-1">Username: {user?.username || user?.mobile || "N/A"}</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-600 flex-1">
                Password: {password ? (passwordVisible ? password : "••••••••") : "Not available"}
              </Text>
              {password ? (
                <TouchableOpacity onPress={() => setPasswordVisible((current) => !current)} className="px-2 py-1">
                  <Icon name={passwordVisible ? "visibility-off" : "visibility"} size={16} color="#2563EB" />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text className="text-xs text-gray-600 mt-1">DOB: {formatDate(user?.dob)}</Text>
            <Text className="text-xs text-gray-600 mt-1" numberOfLines={2}>Address: {user?.address || "Not provided"}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row mt-4">
        <TouchableOpacity onPress={() => onEdit(user)} className="flex-1 min-h-10 rounded-lg bg-blue-50 border border-blue-200 flex-row items-center justify-center mr-1">
          <Icon name="edit" size={16} color="#2563EB" />
          <Text className="text-xs font-bold text-blue-700 ml-1">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isCurrentAdmin}
          onPress={() => onToggleStatus(user)}
          className={`flex-1 min-h-10 rounded-lg border flex-row items-center justify-center mx-1 ${isCurrentAdmin ? "bg-gray-100 border-gray-200" : active ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}
        >
          <Icon name={active ? "lock" : "lock-open"} size={16} color={isCurrentAdmin ? "#9CA3AF" : active ? "#B45309" : "#15803D"} />
          <Text className={`text-xs font-bold ml-1 ${isCurrentAdmin ? "text-gray-400" : active ? "text-amber-700" : "text-green-700"}`}>{active ? "Disable" : "Enable"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isCurrentAdmin}
          onPress={() => onDelete(user)}
          className={`flex-1 min-h-10 rounded-lg border flex-row items-center justify-center ml-1 ${isCurrentAdmin ? "bg-gray-100 border-gray-200" : "bg-red-50 border-red-200"}`}
        >
          <Icon name="delete-outline" size={17} color={isCurrentAdmin ? "#9CA3AF" : "#DC2626"} />
          <Text className={`text-xs font-bold ml-1 ${isCurrentAdmin ? "text-gray-400" : "text-red-700"}`}>Delete</Text>
        </TouchableOpacity>
      </View>
      {qrSelectable ? (
        <TouchableOpacity
          disabled={qrExporting}
          onPress={() => onPrintQr?.([user])}
          className={`mt-2 min-h-10 rounded-lg border flex-row items-center justify-center ${qrExporting ? "bg-gray-100 border-gray-200" : "bg-indigo-50 border-indigo-200"}`}
        >
          <Icon name="print" size={17} color={qrExporting ? "#9CA3AF" : "#4F46E5"} />
          <Text className={`text-xs font-bold ml-1 ${qrExporting ? "text-gray-400" : "text-indigo-700"}`}>Print QR</Text>
        </TouchableOpacity>
      ) : null}
      {isCurrentAdmin ? <Text className="text-[10px] text-gray-400 mt-2 text-center">Your currently logged-in admin account is protected.</Text> : null}
    </View>
  );
};

const UserList = ({
  users,
  role,
  refreshing,
  onRefresh,
  currentAdminId,
  onEdit,
  onToggleStatus,
  onDelete,
  selectedQrUserIds = [],
  onToggleQrSelect,
  onSelectAllQrUsers,
  onClearQrSelection,
  onPrintQr,
  qrExporting,
}) => {
  const filtered = users.filter((user) => !isDeletedAccount(user) && String(user?.usertype || "").toUpperCase() === role);
  const isUserRole = role === "USER";
  const selectedCount = isUserRole
    ? filtered.filter((user) => selectedQrUserIds.includes(String(user?.transid))).length
    : 0;

  return (
    <ScrollView
      className="flex-1 bg-gray-100 px-3 pt-3"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      {isUserRole ? (
        <View className="bg-white border border-indigo-100 rounded-xl p-3 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Customer QR Print</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {selectedCount} selected. One A4 page will be created for each customer.
              </Text>
            </View>
            <TouchableOpacity
              disabled={!selectedCount || qrExporting}
              onPress={() => onPrintQr(filtered.filter((user) => selectedQrUserIds.includes(String(user?.transid))))}
              className={`min-h-10 px-3 rounded-lg flex-row items-center justify-center ${selectedCount && !qrExporting ? "bg-indigo-600" : "bg-gray-300"}`}
            >
              {qrExporting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="print" size={17} color="#FFFFFF" />}
              <Text className="text-xs font-bold text-white ml-1">{qrExporting ? "Preparing" : "Print"}</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row mt-3">
            <TouchableOpacity
              disabled={!filtered.length || qrExporting}
              onPress={() => onSelectAllQrUsers(filtered)}
              className="flex-1 min-h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex-row items-center justify-center mr-1"
            >
              <Icon name="select-all" size={16} color="#4F46E5" />
              <Text className="text-xs font-bold text-indigo-700 ml-1">Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!selectedCount || qrExporting}
              onPress={onClearQrSelection}
              className="flex-1 min-h-9 rounded-lg bg-gray-50 border border-gray-200 flex-row items-center justify-center ml-1"
            >
              <Icon name="clear" size={16} color="#4B5563" />
              <Text className="text-xs font-bold text-gray-700 ml-1">Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {filtered.length ? filtered.map((user) => (
        <UserCard
          key={user?.transid}
          user={user}
          currentAdminId={currentAdminId}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          qrSelectable={isUserRole}
          qrSelected={selectedQrUserIds.includes(String(user?.transid))}
          onToggleQrSelect={onToggleQrSelect}
          onPrintQr={onPrintQr}
          qrExporting={qrExporting}
        />
      )) : (
        <View className="items-center py-20">
          <Icon name="person-off" size={44} color="#9CA3AF" />
          <Text className="text-gray-700 font-bold mt-4">No {(ROLE_LABELS[role] || role).toLowerCase()} accounts found</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default function ManageUsersScreen() {
  const { setLoading } = useLoading();
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedQrUserIds, setSelectedQrUserIds] = useState([]);
  const [qrExporting, setQrExporting] = useState(false);

  const fetchUsers = async ({ pullToRefresh = false } = {}) => {
    try {
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true, "Fetching users...");
      let response = null;
      try {
        response = await API.GET("User/admin/accounts");
      } catch (error) {
        console.warn("Admin accounts endpoint unavailable, falling back to User:", error?.message || error);
        response = await API.GET("User");
      }
      const nextUsers = Array.isArray(response?.Response) ? response.Response : [];
      setUsers(nextUsers.filter((user) => !isDeletedAccount(user)));
    } catch (error) {
      console.error("Fetch users failed:", error);
      Alert.alert("Error", getUserFacingErrorMessage(error, "Failed to fetch users"));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    Storage.getData("DATA").then((data) => setCurrentAdminId(data?.transid || ""));
    fetchUsers();
  }, []);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user?.name, user?.mobile, user?.username, user?.transid, user?.address]
      .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [search, users]);

  const getDailyMilkRegistrationId = async (userId) => {
    if (!userId) return "";
    try {
      const response = await API.GET(`DailyMilkRegistration/CheckUser/${userId}`);
      const registrations = Array.isArray(response?.Response) ? response.Response : [];
      const activeRegistration = registrations.find((item) => Number(item?.status) === 1);
      return activeRegistration?.transid || activeRegistration?.dailymilkregistrationid || "";
    } catch (error) {
      console.warn("Daily milk registration lookup failed:", userId, error?.message || error);
      return "";
    }
  };

  const buildQrPdfHtml = async (selectedUsers) => {
    const preparedUsers = await Promise.all(
      selectedUsers.map(async (user) => {
        const qrValue = normalize(user?.transid);
        const registrationId = await getDailyMilkRegistrationId(qrValue);
        const qrSvg = await QRCodeGenerator.toString(qrValue || "N/A", {
          type: "svg",
          width: 620,
          margin: 1,
          errorCorrectionLevel: "M",
          color: {
            dark: "#111827",
            light: "#FFFFFF",
          },
        });

        return {
          user,
          qrSvg,
          registrationId,
        };
      })
    );

    const pages = preparedUsers.map(({ user, qrSvg, registrationId }) => `
      <section class="page">
        <div class="brand">Dear Basket Customer QR</div>
        <div class="qr-wrap">${qrSvg}</div>
        <div class="details">
          <div class="name">${escapeHtml(user?.name || "Unnamed User")}</div>
          <div class="row"><span>Customer ID</span><strong>${escapeHtml(user?.transid || "N/A")}</strong></div>
          <div class="row"><span>Phone Number</span><strong>${escapeHtml(user?.mobile || "N/A")}</strong></div>
          <div class="row"><span>Daily Milk Registration ID</span><strong>${escapeHtml(registrationId || "Not subscribed")}</strong></div>
        </div>
      </section>
    `).join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .page {
              width: 210mm;
              height: 297mm;
              padding: 18mm 16mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-after: always;
            }
            .page:last-child { page-break-after: auto; }
            .brand {
              width: 100%;
              text-align: center;
              color: #166534;
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 0.4px;
              margin-bottom: 16mm;
            }
            .qr-wrap {
              width: 170mm;
              height: 170mm;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #111827;
              border-radius: 18px;
              padding: 10mm;
            }
            .qr-wrap svg {
              width: 148mm;
              height: 148mm;
              display: block;
            }
            .details {
              width: 170mm;
              margin-top: 16mm;
              border: 2px solid #E5E7EB;
              border-radius: 16px;
              overflow: hidden;
            }
            .name {
              text-align: center;
              font-size: 30px;
              font-weight: 900;
              padding: 8mm 6mm;
              background: #F0FDF4;
              color: #14532D;
              border-bottom: 2px solid #DCFCE7;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 8mm;
              padding: 5mm 7mm;
              font-size: 18px;
              border-bottom: 1px solid #E5E7EB;
            }
            .row:last-child { border-bottom: 0; }
            .row span {
              color: #6B7280;
              font-weight: 700;
            }
            .row strong {
              color: #111827;
              text-align: right;
              overflow-wrap: anywhere;
            }
          </style>
        </head>
        <body>${pages}</body>
      </html>
    `;
  };

  const printQrForUsers = async (selectedUsers) => {
    const printableUsers = (selectedUsers || []).filter((user) => user?.transid);
    if (!printableUsers.length) {
      Alert.alert("Select Users", "Select at least one user to print QR.");
      return;
    }

    try {
      setQrExporting(true);
      setLoading(true, "Preparing customer QR PDF...");
      const html = await buildQrPdfHtml(printableUsers);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Print Customer QR PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Ready", uri);
      }
    } catch (error) {
      console.error("QR PDF export failed:", error);
      Alert.alert("Export Failed", getUserFacingErrorMessage(error, "Unable to create QR PDF"));
    } finally {
      setQrExporting(false);
      setLoading(false);
    }
  };

  const toggleQrSelect = (user) => {
    const userId = String(user?.transid || "");
    if (!userId) return;
    setSelectedQrUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const selectAllQrUsers = (nextUsers) => {
    setSelectedQrUserIds((nextUsers || []).map((user) => String(user?.transid || "")).filter(Boolean));
  };

  const openCreate = () => {
    setEditing(false);
    setForm(emptyForm);
    setEditorVisible(true);
  };

  const openEdit = (user) => {
    setEditing(true);
    setForm({
      transid: normalize(user?.transid),
      name: normalize(user?.name),
      mobile: normalize(user?.mobile),
      username: normalize(user?.username || user?.mobile),
      originalMobile: normalize(user?.mobile),
      originalUsername: normalize(user?.username || user?.mobile),
      dob: normalize(user?.dob).split("T")[0],
      address: normalize(user?.address),
      profile: normalize(user?.profile),
      usertype: String(user?.usertype || "USER").toUpperCase(),
      status: Number(user?.status) === 1 ? 1 : 0,
      password: normalize(user?.password),
    });
    setEditorVisible(true);
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!editing && !/^\d{10}$/.test(form.mobile.trim())) return "Mobile must contain 10 digits.";
    if (!editing && !form.username.trim()) return "Username is required.";
    if (form.dob && !/^\d{4}-\d{2}-\d{2}$/.test(form.dob.trim())) return "DOB must use YYYY-MM-DD.";
    if (!editing && !form.password.trim()) return "Password is required when creating an account.";
    return null;
  };

  const saveUser = async () => {
    const validationError = validate();
    if (validationError) return Alert.alert("Check Details", validationError);

    const actor = await Storage.getData("DATA");
    try {
      setSaving(true);
      const common = {
        fullname: form.name.trim(),
        name: form.name.trim(),
        mobile: editing ? form.originalMobile.trim() : form.mobile.trim(),
        username: editing ? form.originalUsername.trim() : form.username.trim(),
        dob: form.dob.trim() || null,
        address: form.address.trim(),
        profile: form.profile.trim() || "No File Uploaded",
        usertype: editing && String(form.transid) === String(currentAdminId) ? "ADMIN" : form.usertype,
        status: editing && String(form.transid) === String(currentAdminId) ? 1 : Number(form.status),
      };

      if (editing) {
        const payload = {
          ...common,
          transid: form.transid,
          luu: actor?.transid || actor?.name || "ADMIN",
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        };
        const response = await API.PUT("User/admin/accounts", payload);
        assertAccountResponse(response, "Unable to update this account.");
      } else {
        const response = await API.POST("UserSignUp", {
          ...common,
          password: form.password.trim(),
          rcu: actor?.transid || actor?.name || "ADMIN",
        });
        assertAccountResponse(response, "Unable to create this account.");
      }

      setEditorVisible(false);
      await fetchUsers();
      Alert.alert("Success", editing ? "Account updated successfully." : "Account created successfully.");
    } catch (error) {
      console.error("Save user failed:", error);
      Alert.alert("Save Failed", getUserFacingErrorMessage(error, "Unable to save this account"));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (user) => {
    const nextStatus = Number(user?.status) === 1 ? 0 : 1;
    Alert.alert(
      nextStatus ? "Enable Account" : "Disable Account",
      `${nextStatus ? "Enable" : "Disable"} ${user?.name || "this account"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setLoading(true, "Updating account status...");
              const payload = { ...user, transid: user.transid, status: nextStatus, luu: currentAdminId || "ADMIN" };
              const response = await API.PUT("User/admin/accounts", payload);
              assertAccountResponse(response, "Unable to update account status.");
              await fetchUsers();
            } catch (error) {
              Alert.alert("Update Failed", getUserFacingErrorMessage(error, "Unable to update account status"));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const deleteUser = (user) => {
    Alert.alert(
      "Delete Account",
      `Permanently delete ${user?.name || "this account"}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true, "Deleting account...");
              const response = await API.DELETE("User/admin/accounts", { transid: user.transid, luu: currentAdminId || "ADMIN" });
              assertAccountResponse(response, "Unable to delete this account.");
              await fetchUsers();
              Alert.alert("Deleted", "Account deleted successfully.");
            } catch (error) {
              Alert.alert("Delete Failed", getUserFacingErrorMessage(error, "This account may have linked records and could not be deleted"));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderRoleList = (role) => () => (
    <UserList
      users={visibleUsers}
      role={role}
      refreshing={refreshing}
      onRefresh={() => fetchUsers({ pullToRefresh: true })}
      currentAdminId={currentAdminId}
      onEdit={openEdit}
      onToggleStatus={toggleStatus}
      onDelete={deleteUser}
      selectedQrUserIds={selectedQrUserIds}
      onToggleQrSelect={toggleQrSelect}
      onSelectAllQrUsers={selectAllQrUsers}
      onClearQrSelection={() => setSelectedQrUserIds([])}
      onPrintQr={printQrForUsers}
      qrExporting={qrExporting}
    />
  );

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">Manage Accounts</Text>
            <Text className="text-xs text-gray-500 mt-0.5">{visibleUsers.length} of {users.length} accounts</Text>
          </View>
          <TouchableOpacity onPress={openCreate} className="min-h-10 px-3 rounded-lg bg-blue-600 flex-row items-center justify-center">
            <Icon name="person-add" size={18} color="#FFFFFF" />
            <Text className="text-white text-xs font-bold ml-1.5">Add Account</Text>
          </TouchableOpacity>
        </View>
        <View className="mt-3 min-h-11 rounded-xl bg-gray-100 border border-gray-200 px-3 flex-row items-center">
          <Icon name="search" size={19} color="#6B7280" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search name, mobile, username or ID" placeholderTextColor="#9CA3AF" className="flex-1 ml-2 text-sm text-gray-900" />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><Icon name="close" size={18} color="#6B7280" /></TouchableOpacity> : null}
        </View>
      </View>

      <Tab.Navigator screenOptions={{ tabBarActiveTintColor: "#2563EB", tabBarInactiveTintColor: "#6B7280", tabBarIndicatorStyle: { backgroundColor: "#2563EB", height: 3 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" }, tabBarScrollEnabled: true, tabBarItemStyle: { width: 118 } }}>
        <Tab.Screen name="Admins" component={renderRoleList("ADMIN")} />
        <Tab.Screen name="Partners" component={renderRoleList("PARTNER")} />
        <Tab.Screen name="Kitchens" component={renderRoleList("KITCHENPARTNER")} />
        <Tab.Screen name="Users" component={renderRoleList("USER")} />
      </Tab.Navigator>

      <Modal visible={editorVisible} animationType="slide" onRequestClose={() => !saving && setEditorVisible(false)}>
        <View className="flex-1 bg-gray-100">
          <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex-row items-center">
            <TouchableOpacity disabled={saving} onPress={() => setEditorVisible(false)} className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center mr-3">
              <Icon name="arrow-back" size={21} color="#111827" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">{editing ? "Edit Account" : "Create Account"}</Text>
              <Text className="text-xs text-gray-500">Manage identity, role and account status</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View className="bg-white border border-gray-200 rounded-xl p-4">
              {editing ? <View className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3"><Text className="text-[10px] text-gray-500">ACCOUNT ID</Text><Text className="text-xs font-bold text-gray-900 mt-1">{form.transid}</Text></View> : null}
              <FormField label="Full Name" value={form.name} onChangeText={(value) => setField("name", value)} />
              <FormField
                label="Mobile"
                value={form.mobile}
                onChangeText={(value) => setField("mobile", value.replace(/\D/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!editing}
                helperText={editing ? "Mobile number cannot be changed after account creation." : null}
              />
              <FormField
                label="Username"
                value={form.username}
                onChangeText={(value) => setField("username", value)}
                editable={!editing}
                helperText={editing ? "Username cannot be changed after account creation." : null}
              />
              <FormField label="Date of Birth" value={form.dob} onChangeText={(value) => setField("dob", value)} placeholder="YYYY-MM-DD" />
              <FormField label="Address" value={form.address} onChangeText={(value) => setField("address", value)} multiline />
              <FormField label="Profile Image Path" value={form.profile} onChangeText={(value) => setField("profile", value)} placeholder="Optional image URL or stored path" />
              <PasswordField
                label={editing ? "Password" : "Password"}
                value={form.password}
                onChangeText={(value) => setField("password", value)}
                placeholder={editing ? "View or change login password" : "Enter password"}
              />

              <Text className="text-xs font-bold text-gray-700 mb-1.5">Account Role</Text>
              <RoleSelector
                value={form.usertype}
                disabled={editing && String(form.transid) === String(currentAdminId)}
                onChange={(value) => setField("usertype", value)}
              />

              <View className="flex-row items-center justify-between mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <View><Text className="text-sm font-bold text-gray-900">Account Status</Text><Text className="text-xs text-gray-500 mt-0.5">Allow this account to sign in</Text></View>
                <TouchableOpacity
                  disabled={editing && String(form.transid) === String(currentAdminId)}
                  onPress={() => setField("status", Number(form.status) === 1 ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 ${Number(form.status) === 1 ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <View className={`w-6 h-6 rounded-full bg-white ${Number(form.status) === 1 ? "self-end" : "self-start"}`} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity disabled={saving} onPress={saveUser} className={`mt-5 min-h-12 rounded-xl flex-row items-center justify-center ${saving ? "bg-blue-300" : "bg-blue-600"}`}>
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="save" size={19} color="#FFFFFF" />}
                <Text className="text-white font-bold ml-2">{saving ? "Saving..." : editing ? "Update Account" : "Create Account"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
