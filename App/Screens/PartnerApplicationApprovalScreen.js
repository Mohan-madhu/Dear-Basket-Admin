import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API, getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

const FILTERS = ["PENDING", "APPROVED", "REJECTED"];
const colors = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-800" },
  APPROVED: { bg: "bg-emerald-100", text: "text-emerald-800" },
  REJECTED: { bg: "bg-rose-100", text: "text-rose-800" },
};

const Detail = ({ icon, label, value }) => value ? (
  <View className="flex-row items-start mb-3">
    <Ionicons name={icon} size={18} color="#64748b" />
    <View className="ml-3 flex-1"><Text className="text-xs text-slate-500">{label}</Text><Text className="text-sm font-semibold text-slate-900 mt-0.5">{value}</Text></View>
  </View>
) : null;

export default function PartnerApplicationApprovalScreen({ navigation }) {
  const { setLoading } = useLoading();
  const setLoadingRef = useRef(setLoading);
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setLoadingRef.current = setLoading;
  }, [setLoading]);

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoadingRef.current(true, "Loading partner applications...");
      const admin = await Storage.getData("DATA");
      const response = await API.GET(`PartnerApplication?adminid=${encodeURIComponent(admin?.transid || "")}`);
      setApplications(Array.isArray(response?.Response) ? response.Response : Array.isArray(response) ? response : []);
    } catch (error) {
      Alert.alert("Unable to load", getUserFacingErrorMessage(error));
    } finally {
      setLoadingRef.current(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((item) => {
      const status = String(item.applicationstatus || "PENDING").toUpperCase();
      const matchesText = !query || [item.fullname, item.mobile, item.vehiclenumber, item.drivinglicensenumber, item.applicationid]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return status === filter && matchesText;
    });
  }, [applications, filter, search]);

  const updateStatus = async (status) => {
    if (!selected) return;
    if (status === "REJECTED" && !reason.trim()) {
      Alert.alert("Reason required", "Enter a rejection reason.");
      return;
    }
    try {
      setLoading(true, status === "APPROVED" ? "Approving partner..." : "Rejecting application...");
      const admin = await Storage.getData("DATA");
      const response = await API.PUT("PartnerApplication/status", {
        applicationid: selected.applicationid,
        applicationstatus: status,
        rejectionreason: status === "REJECTED" ? reason.trim() : null,
        reviewedby: admin?.transid,
      });
      setSelected(null);
      setRejecting(false);
      setReason("");
      await load(true);
      Alert.alert(status === "APPROVED" ? "Partner activated" : "Application rejected", response?.Message || "Status updated successfully.");
    } catch (error) {
      Alert.alert("Unable to update", getUserFacingErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-5 pb-4 border-b border-slate-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center mr-3"><Ionicons name="arrow-back" size={21} color="#0f172a" /></TouchableOpacity>
          <View className="flex-1"><Text className="text-xl font-bold text-slate-900">Partner Applications</Text><Text className="text-xs text-slate-500 mt-1">Review delivery partner registrations</Text></View>
          <TouchableOpacity onPress={() => load()} className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center"><Ionicons name="refresh" size={21} color="#2563eb" /></TouchableOpacity>
        </View>
        <View className="flex-row items-center bg-slate-100 rounded-lg px-3 mt-4"><Ionicons name="search" size={19} color="#64748b" /><TextInput className="flex-1 ml-2 py-3 text-slate-900" placeholder="Name, mobile, vehicle or licence" placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} /></View>
        <View className="flex-row mt-4">
          {FILTERS.map((item) => {
            const count = applications.filter((app) => String(app.applicationstatus || "PENDING").toUpperCase() === item).length;
            return <TouchableOpacity key={item} onPress={() => setFilter(item)} className={`flex-1 py-2.5 mx-1 rounded-lg ${filter === item ? "bg-slate-900" : "bg-slate-100"}`}><Text className={`text-center text-xs font-bold ${filter === item ? "text-white" : "text-slate-600"}`}>{item} ({count})</Text></TouchableOpacity>;
          })}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.applicationid)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: visible.length ? 0 : 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        ListEmptyComponent={<View className="flex-1 items-center justify-center"><Ionicons name="documents-outline" size={48} color="#cbd5e1" /><Text className="text-slate-500 font-semibold mt-3">No {filter.toLowerCase()} applications</Text></View>}
        renderItem={({ item }) => {
          const status = String(item.applicationstatus || "PENDING").toUpperCase();
          const theme = colors[status] || colors.PENDING;
          return <TouchableOpacity onPress={() => setSelected(item)} className="bg-white border border-slate-200 rounded-lg p-4 mb-3" activeOpacity={0.85}>
            <View className="flex-row items-start"><View className="w-11 h-11 rounded-full bg-blue-100 items-center justify-center"><Ionicons name="person" size={21} color="#2563eb" /></View><View className="flex-1 ml-3"><View className="flex-row justify-between"><Text className="text-base font-bold text-slate-900 flex-1" numberOfLines={1}>{item.fullname}</Text><View className={`px-2 py-1 rounded ${theme.bg}`}><Text className={`text-[10px] font-bold ${theme.text}`}>{status}</Text></View></View><Text className="text-sm text-slate-600 mt-1">{item.mobile}</Text><Text className="text-xs text-slate-500 mt-1">{item.vehiclenumber}  •  {item.drivinglicensenumber}</Text></View></View>
          </TouchableOpacity>;
        }}
      />

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 bg-black/40 justify-end"><View className="bg-white rounded-t-lg px-5 pt-5 pb-8 max-h-[88%]">
          <View className="flex-row items-center mb-5"><Text className="text-xl font-bold text-slate-900 flex-1">Application Details</Text><TouchableOpacity onPress={() => { setSelected(null); setRejecting(false); setReason(""); }}><Ionicons name="close" size={25} color="#475569" /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Detail icon="person-outline" label="Full name" value={selected?.fullname} /><Detail icon="call-outline" label="Mobile" value={selected?.mobile} /><Detail icon="calendar-outline" label="Date of birth" value={selected?.dob} /><Detail icon="location-outline" label="Address" value={[selected?.address, selected?.city, selected?.state, selected?.pincode].filter(Boolean).join(", ")} /><Detail icon="bicycle-outline" label="Vehicle number" value={selected?.vehiclenumber} /><Detail icon="card-outline" label="Driving licence" value={selected?.drivinglicensenumber} /><Detail icon="time-outline" label="Applied on" value={selected?.appliedtime ? new Date(selected.appliedtime).toLocaleString() : null} /><Detail icon="document-text-outline" label="Rejection reason" value={selected?.rejectionreason} />
          {String(selected?.applicationstatus || "PENDING").toUpperCase() === "PENDING" && <>
            {rejecting && <TextInput className="border border-rose-200 bg-rose-50 rounded-lg px-3 py-3 mb-3 text-slate-900" placeholder="Reason for rejection" placeholderTextColor="#94a3b8" multiline value={reason} onChangeText={setReason} />}
            <View className="flex-row mt-3"><TouchableOpacity onPress={() => rejecting ? updateStatus("REJECTED") : setRejecting(true)} className="flex-1 border border-rose-300 rounded-lg py-3 mr-2"><Text className="text-rose-700 font-bold text-center">Reject</Text></TouchableOpacity><TouchableOpacity onPress={() => updateStatus("APPROVED")} className="flex-1 bg-emerald-600 rounded-lg py-3 ml-2"><Text className="text-white font-bold text-center">Approve & Activate</Text></TouchableOpacity></View>
          </>}
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}
