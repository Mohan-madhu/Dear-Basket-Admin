import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toaster from '../../App_Utils/Services/ToastService';

const STATUS_FILTERS = [
  'All',
  'Requested',
  'Approved',
  'Rejected',
  'PickupScheduled',
  'PickedUp',
  'ReceivedAtHub',
  'QCInProgress',
  'RefundInitiated',
  'Refunded',
  'Closed',
];

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const num = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
};
const getTs = (v) => {
  if (!v) return 0;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
};

const ProductReturnAdminScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('ADMIN');

  const [summary, setSummary] = useState({});
  const [returns, setReturns] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [search, setSearch] = useState('');

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState({
    Header: null,
    Details: [],
    StatusHistory: [],
    Refund: null,
  });

  const [remarks, setRemarks] = useState('');

  const loadUser = async () => {
    try {
      const user = await Storage.getData('USER');
      setUserName(user || 'ADMIN');
    } catch {
      setUserName('ADMIN');
    }
  };

  const fetchSummary = async () => {
    const payload = { filterType: 'TODAY' };
    let res = null;
    try {
      res = await API.PUT('ProductReturn/admin/dashboard', payload);
    } catch {
      res = await API.GET('ProductReturn/admin/dashboard');
    }
    const first = Array.isArray(res?.Response) ? res.Response[0] : {};
    setSummary(first || {});
  };

  const fetchReturns = async () => {
    const payload = {
      status: selectedStatus === 'All' ? null : selectedStatus,
      search: search?.trim() || null,
      page: 1,
      pageSize: 200,
    };
    let res = null;
    try {
      res = await API.PUT('ProductReturn/admin/list', payload);
    } catch {
      res = await API.GET('ProductReturn/admin/list');
    }
    setReturns(Array.isArray(res?.Response) ? res.Response : []);
  };

  const loadAll = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      await Promise.all([loadUser(), fetchSummary(), fetchReturns()]);
    } catch (error) {
      console.error('Return admin load error:', error);
      Toaster.errortop('Failed to load return orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchReturns().catch((e) => {
        console.error(e);
        Toaster.errortop('Failed to refresh return list');
      });
    }
  }, [selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll(false);
  };

  const openDetails = async (item) => {
    try {
      setSelectedReturn(item);
      setDetailsVisible(true);
      let res = null;
      try {
        res = await API.PUT('ProductReturn/detail', { returnid: item?.returnid });
      } catch {
        res = await API.GET(`ProductReturn/${item?.returnid}`);
      }
      setSelectedDetail({
        Header: res?.Header || null,
        Details: Array.isArray(res?.Details) ? res.Details : [],
        StatusHistory: Array.isArray(res?.StatusHistory) ? res.StatusHistory : [],
        Refund: res?.Refund || null,
      });
    } catch (error) {
      console.error('Return detail error:', error);
      Toaster.errortop('Failed to load return details');
    }
  };

  const runReview = async (action) => {
    if (!selectedReturn?.returnid) return;
    try {
      await API.PUT('ProductReturn/admin/review', {
        returnid: selectedReturn.returnid,
        action,
        adminremarks: remarks?.trim() || null,
        luu: userName,
      });
      Toaster.successtop(`Return ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
      setRemarks('');
      await Promise.all([fetchReturns(), fetchSummary()]);
      await openDetails(selectedReturn);
    } catch (error) {
      console.error(error);
      Toaster.errortop('Review action failed');
    }
  };

  const runStatus = async (newstatus) => {
    if (!selectedReturn?.returnid) return;
    try {
      await API.PUT('ProductReturn/admin/status', {
        returnid: selectedReturn.returnid,
        newstatus,
        remarks: remarks?.trim() || null,
        luu: userName,
      });
      Toaster.successtop(`Status moved to ${newstatus}`);
      setRemarks('');
      await Promise.all([fetchReturns(), fetchSummary()]);
      await openDetails(selectedReturn);
    } catch (error) {
      console.error(error);
      Toaster.errortop('Status update failed');
    }
  };

  const runRefundSuccessCash = async () => {
    if (!selectedReturn?.returnid) return;
    const amount = num(selectedDetail?.Header?.totalreturnamount || selectedReturn?.totalreturnamount);
    try {
      await API.PUT('ProductReturn/admin/refund', {
        returnid: selectedReturn.returnid,
        refundmethod: 'Cash',
        refundamount: amount,
        paymentstatus: 'Success',
        cashpaidby: userName,
        luu: userName,
      });
      Toaster.successtop('Refund marked as success');
      await Promise.all([fetchReturns(), fetchSummary()]);
      await openDetails(selectedReturn);
    } catch (error) {
      console.error(error);
      Toaster.errortop('Refund update failed');
    }
  };

  const visibleReturns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return returns;
    return returns.filter((r) => {
      const rn = String(r?.returnnumber || '').toLowerCase();
      const oid = String(r?.productorderid || '').toLowerCase();
      const uid = String(r?.userid || '').toLowerCase();
      const st = String(r?.returnstatus || '').toLowerCase();
      return rn.includes(q) || oid.includes(q) || uid.includes(q) || st.includes(q);
    });
  }, [returns, search]);

  const currentStatus = selectedDetail?.Header?.returnstatus || selectedReturn?.returnstatus;
  const header = selectedDetail?.Header || selectedReturn || {};
  const statusHistory = Array.isArray(selectedDetail?.StatusHistory) ? selectedDetail.StatusHistory : [];
  const sortedStatusHistory = [...statusHistory].sort(
    (a, b) => getTs(a?.changedtime) - getTs(b?.changedtime)
  );
  const fallbackTimeline = [
    { newstatus: 'Requested', changedtime: header?.requestedtime || header?.rcm, changedby: header?.rcu || null, remarks: null },
    { newstatus: 'Approved', changedtime: header?.approvedtime, changedby: header?.approvedby || null, remarks: null },
    { newstatus: 'Rejected', changedtime: header?.rejectedtime, changedby: header?.rejectedby || null, remarks: null },
    { newstatus: 'PickupScheduled', changedtime: header?.pickupscheduledtime, changedby: header?.pickupscheduledby || null, remarks: null },
    { newstatus: 'PickedUp', changedtime: header?.pickuptime, changedby: header?.pickupby || null, remarks: null },
    { newstatus: 'ReceivedAtHub', changedtime: header?.receivedathubtime, changedby: header?.receivedathubby || null, remarks: null },
    { newstatus: 'QCInProgress', changedtime: header?.qcstarttime, changedby: header?.qcby || null, remarks: null },
    { newstatus: 'RefundInitiated', changedtime: header?.refundinitiatedtime, changedby: header?.refundinitiatedby || null, remarks: null },
    { newstatus: 'Refunded', changedtime: header?.refundedtime, changedby: header?.refundedby || null, remarks: null },
    { newstatus: 'Closed', changedtime: header?.closedtime, changedby: header?.closedby || null, remarks: null },
  ]
    .filter((x) => getTs(x?.changedtime) > 0)
    .sort((a, b) => getTs(a?.changedtime) - getTs(b?.changedtime));
  const timelineEntries = sortedStatusHistory.length > 0 ? sortedStatusHistory : fallbackTimeline;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-gray-600 mt-3">Loading return orders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="bg-white px-3 pt-2 pb-2 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center"
          >
            <Icon name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">Return Orders</Text>
          <TouchableOpacity onPress={() => loadAll(false)} className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
            <Icon name="refresh" size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      >
        <View className="p-3">
          <View className="bg-white rounded-2xl border border-gray-200 p-3">
            <Text className="text-xs text-gray-500">Today Summary</Text>
            <View className="flex-row mt-2">
              <View className="flex-1">
                <Text className="text-[11px] text-gray-500">Returns</Text>
                <Text className="text-base font-bold text-gray-900">{num(summary?.totalreturns)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-gray-500">Requested</Text>
                <Text className="text-base font-bold text-orange-700">{num(summary?.requested)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-gray-500">Refunded</Text>
                <Text className="text-base font-bold text-green-700">{num(summary?.refunded)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-gray-500">Amount</Text>
                <Text className="text-base font-bold text-gray-900">₹{num(summary?.totalreturnamount)}</Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-2.5 py-1.5 border border-gray-200">
              <Icon name="magnify" size={16} color="#6B7280" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search return / order / user..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-1.5 text-xs text-gray-900"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {STATUS_FILTERS.map((item) => {
                const active = selectedStatus === item;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setSelectedStatus(item)}
                    className={`mr-2 px-2.5 py-1 rounded-full border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
                  >
                    <Text className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View className="mt-2">
            {visibleReturns.length === 0 ? (
              <View className="bg-white rounded-2xl border border-gray-200 p-4 items-center">
                <Icon name="package-variant-closed-remove" size={34} color="#9CA3AF" />
                <Text className="text-sm font-semibold text-gray-800 mt-2">No return orders</Text>
              </View>
            ) : (
              visibleReturns.map((item, idx) => (
                <TouchableOpacity
                  key={item?.returnid || `${item?.returnnumber || 'RET'}-${idx}`}
                  className="bg-white rounded-2xl border border-gray-200 p-3 mb-2"
                  activeOpacity={0.85}
                  onPress={() => openDetails(item)}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-gray-900">{item?.returnnumber || item?.returnid}</Text>
                    <View className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                      <Text className="text-[10px] font-semibold text-orange-700">{item?.returnstatus || 'Requested'}</Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-gray-600 mt-1">Order: {item?.productorderid || 'N/A'}</Text>
                  <Text className="text-[11px] text-gray-600 mt-0.5">
                    {formatDateTime(item?.requestedtime || item?.rcm)} • Qty {num(item?.totalreturnqty)} • ₹{num(item?.totalreturnamount)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={detailsVisible} animationType="slide">
        <View className="flex-1 bg-gray-100">
          <View className="bg-white px-3 pt-2 pb-2 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setDetailsVisible(false)} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                <Icon name="arrow-left" size={20} color="#111827" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">Return Details</Text>
              <View className="w-9 h-9" />
            </View>
          </View>

          <ScrollView className="flex-1 p-3">
            <View className="bg-white rounded-2xl border border-gray-200 p-3">
              <Text className="text-xs text-gray-500">Return No</Text>
              <Text className="text-sm font-bold text-gray-900">{selectedDetail?.Header?.returnnumber || selectedReturn?.returnnumber || 'N/A'}</Text>
              <Text className="text-xs text-gray-500 mt-2">Status</Text>
              <Text className="text-sm font-bold text-orange-700">{currentStatus || 'Requested'}</Text>
              <Text className="text-xs text-gray-500 mt-2">Remarks</Text>
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Optional admin remarks"
                className="mt-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50"
              />
            </View>

            <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
              <Text className="text-sm font-bold text-gray-900 mb-2">Return Items</Text>
              {selectedDetail?.Details?.length ? (
                selectedDetail.Details.map((d, i) => (
                  <View key={d?.returndetailid || i} className="py-2 border-b border-gray-100">
                    <Text className="text-xs font-semibold text-gray-900">{d?.productname || 'Product'}</Text>
                    <Text className="text-[11px] text-gray-600">
                      Qty {num(d?.returnqty)} • ₹{num(d?.lineamount)} • {d?.itemstatus || 'Requested'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-gray-500">No items found.</Text>
              )}
            </View>

            <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
              <Text className="text-sm font-bold text-gray-900 mb-2">Refund Preference</Text>
              <Text className="text-[11px] text-gray-600">
                Method: {selectedDetail?.Refund?.refundmethod || 'Not provided'}
              </Text>
              <Text className="text-[11px] text-gray-600 mt-1">
                Amount: ₹{num(selectedDetail?.Refund?.refundamount || selectedDetail?.Header?.totalreturnamount)}
              </Text>
              {selectedDetail?.Refund?.gpaynumber ? (
                <Text className="text-[11px] text-gray-600 mt-1">
                  GPay: {selectedDetail.Refund.gpaynumber}
                </Text>
              ) : null}
              {selectedDetail?.Refund?.upiid ? (
                <Text className="text-[11px] text-gray-600 mt-1">
                  UPI: {selectedDetail.Refund.upiid}
                </Text>
              ) : null}
              {selectedDetail?.Refund?.bankholdername ? (
                <Text className="text-[11px] text-gray-600 mt-1">
                  Holder: {selectedDetail.Refund.bankholdername}
                </Text>
              ) : null}
              {selectedDetail?.Refund?.bankname ? (
                <Text className="text-[11px] text-gray-600 mt-1">
                  Bank: {selectedDetail.Refund.bankname}
                </Text>
              ) : null}
              {selectedDetail?.Refund?.accountnumber ? (
                <Text className="text-[11px] text-gray-600 mt-1">
                  A/C: {selectedDetail.Refund.accountnumber}
                </Text>
              ) : null}
              {selectedDetail?.Refund?.ifsccode ? (
                <Text className="text-[11px] text-gray-600 mt-1">
                  IFSC: {selectedDetail.Refund.ifsccode}
                </Text>
              ) : null}
            </View>

            <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
              <Text className="text-sm font-bold text-gray-900 mb-2">Timeline</Text>
              {timelineEntries.length > 0 ? (
                timelineEntries.map((entry, idx) => (
                  <View
                    key={entry?.returnstatusid || `${entry?.newstatus || 'status'}-${idx}`}
                    className="flex-row mb-2"
                  >
                    <View className="items-center mr-2.5">
                      <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                      {idx !== timelineEntries.length - 1 ? (
                        <View className="w-0.5 flex-1 bg-blue-200 mt-1" />
                      ) : null}
                    </View>
                    <View className="flex-1 pb-1">
                      <Text className="text-xs font-semibold text-gray-900">
                        {entry?.newstatus || 'Status Updated'}
                      </Text>
                      <Text className="text-[11px] text-gray-600 mt-0.5">
                        {formatDateTime(entry?.changedtime)}
                      </Text>
                      {entry?.changedby ? (
                        <Text className="text-[11px] text-gray-600 mt-0.5">
                          By: {entry.changedby}
                        </Text>
                      ) : null}
                      {entry?.remarks ? (
                        <Text className="text-[11px] text-gray-600 mt-0.5">
                          {entry.remarks}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-gray-500">No timeline updates yet.</Text>
              )}
            </View>

            <View className="bg-white rounded-2xl border border-gray-200 p-3 mt-2">
              <Text className="text-sm font-bold text-gray-900 mb-2">Actions</Text>

              {currentStatus === 'Requested' ? (
                <View className="flex-row">
                  <TouchableOpacity onPress={() => runReview('APPROVE')} className="flex-1 bg-green-600 py-2 rounded-xl mr-1.5">
                    <Text className="text-white text-center font-semibold text-xs">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => runReview('REJECT')} className="flex-1 bg-red-600 py-2 rounded-xl ml-1.5">
                    <Text className="text-white text-center font-semibold text-xs">Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {currentStatus === 'Approved' ? (
                <TouchableOpacity onPress={() => runStatus('PickupScheduled')} className="mt-2 bg-blue-600 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Mark Pickup Scheduled</Text>
                </TouchableOpacity>
              ) : null}

              {currentStatus === 'PickupScheduled' ? (
                <TouchableOpacity onPress={() => runStatus('PickedUp')} className="mt-2 bg-blue-600 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Mark Picked Up</Text>
                </TouchableOpacity>
              ) : null}

              {currentStatus === 'PickedUp' ? (
                <TouchableOpacity onPress={() => runStatus('ReceivedAtHub')} className="mt-2 bg-blue-600 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Mark Received At Hub</Text>
                </TouchableOpacity>
              ) : null}

              {currentStatus === 'ReceivedAtHub' ? (
                <TouchableOpacity onPress={() => runStatus('QCInProgress')} className="mt-2 bg-amber-600 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Start QC</Text>
                </TouchableOpacity>
              ) : null}

              {currentStatus === 'QCInProgress' ? (
                <TouchableOpacity onPress={() => runStatus('RefundInitiated')} className="mt-2 bg-purple-600 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Initiate Refund</Text>
                </TouchableOpacity>
              ) : null}

              {currentStatus === 'RefundInitiated' ? (
                <TouchableOpacity onPress={runRefundSuccessCash} className="mt-2 bg-green-600 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Mark Refund Success (Cash)</Text>
                </TouchableOpacity>
              ) : null}

              {currentStatus === 'Refunded' ? (
                <TouchableOpacity onPress={() => runStatus('Closed')} className="mt-2 bg-gray-700 py-2 rounded-xl">
                  <Text className="text-white text-center font-semibold text-xs">Close Return</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ProductReturnAdminScreen;
