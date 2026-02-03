import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Modal,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';

export default function AdminPregnancyApproval({ navigation }) {


    const [userData, setUserData] = useState(null);


    const getUserData = async () => {
        try {
            var userData = await Storage.getData("DATA");

            setUserData(userData);

        } catch (error) {

        }
    };

    useEffect(() => {
        getUserData();

    }, []);
    const { setLoading } = useLoading();
    const [applications, setApplications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
    const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Month names for formatting
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Fetch all applications (admin can see all)
    const fetchApplications = async () => {
        setLoading(true, "Fetching Pregnancy Applications");

        try {
            const res = await API.GET('PregnancyApplication');
            const Response = Array.isArray(res?.Response) ? res.Response : [];

            // Filter only active, non-deleted applications
            const activeApplications = Response.filter(
                (app) => app?.isdeleted === false && app?.isactive === true
            );

            const transformedApplications = activeApplications.map((app) => {
                const startDate = `${months[app.pregnancystartmonth - 1]} ${app.pregnancystartyear}`;
                const endDate = `${months[app.expectedendmonth - 1]} ${app.expectedendyear}`;

                // Determine status
                let status = "pending";
                let statusColor = "bg-yellow-100";
                let textColor = "text-yellow-800";
                let statusText = "PENDING";

                switch (app.applicationstatus) {
                    case 0:
                        status = "pending";
                        statusColor = "bg-yellow-100";
                        textColor = "text-yellow-800";
                        statusText = "PENDING";
                        break;
                    case 1:
                        status = "approved";
                        statusColor = "bg-green-100";
                        textColor = "text-green-800";
                        statusText = "APPROVED";
                        break;
                    case 2:
                        status = "rejected";
                        statusColor = "bg-red-100";
                        textColor = "text-red-800";
                        statusText = "REJECTED";
                        break;
                    default:
                        break;
                }

                // Check if application is current (based on expected end date)
                const now = new Date();
                const currentValue = now.getFullYear() * 12 + (now.getMonth() + 1);
                const endValue = (app.expectedendyear ?? 0) * 12 + (app.expectedendmonth ?? 0);
                const isCurrent = currentValue <= endValue;

                // Format applied date
                let appliedDateFormatted = "Not available";
                if (app.applieddate) {
                    const d = new Date(app.applieddate);
                    appliedDateFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(
                        d.getMonth() + 1
                    ).padStart(2, "0")}/${d.getFullYear()}`;
                }

                return {
                    transid: app.transid,
                    id: app.transid,
                    name: app.name,
                    userid: app.userid,
                    mobilenumber: app.mobilenumber,
                    startDate,
                    endDate,
                    status,
                    statusText,
                    statusColor,
                    textColor,
                    isCurrent,
                    appliedDate: appliedDateFormatted,
                    applieddateRaw: app.applieddate,
                    dob: app.dob,
                    documentfilename: app.documentfilename,
                    notes: app.notes,
                    milkamountml: app.milkamountml || 250,
                    isbenefitsactive: app.isbenefitsactive,
                    benefitsstartdate: app.benefitsstartdate,
                    benefitsenddate: app.benefitsenddate,
                    approveddate: app.approveddate,
                    rejecteddate: app.rejecteddate,
                    rejectionreason: app.rejectionreason,
                    rawData: app,
                };
            });

            // Sort by applied date (newest first)
            transformedApplications.sort(
                (a, b) => new Date(b.applieddateRaw) - new Date(a.applieddateRaw)
            );

            setApplications(transformedApplications);
        } catch (err) {
            console.error("Error fetching pregnancy applications:", err);
            Alert.alert("Error", "Failed to fetch applications. Please try again.");
            setApplications([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle pull-to-refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchApplications();
        setRefreshing(false);
    };

    // Load applications on component mount
    useEffect(() => {
        fetchApplications();
    }, []);

    // Filter applications based on active tab
    const filteredApplications = applications.filter(app =>
        activeTab === 'pending' ? app.status === 'pending' :
            activeTab === 'approved' ? app.status === 'approved' :
                app.status === 'rejected'
    );

    const handleApproveApplication = async (app) => {
        Alert.alert(
            "Approve Application",
            `Are you sure you want to approve this application?\n\nName: ${app.name}\nUser ID: ${app.userid}\nPregnancy Period: ${app.startDate} to ${app.endDate}`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Approve",
                    onPress: async () => {
                        setLoading(true, "Approving Application");

                        try {
                            await API.PUT("PregnancyApplication", {
                                action: "updateStatus",
                                transid: app.transid,
                                applicationstatus: 1,
                                approveddate: new Date().toISOString(),
                                isbenefitsactive: true,
                                benefitsstartdate: new Date().toISOString().split('T')[0],
                                benefitsenddate: `${app.rawData.expectedendyear}-${String(app.rawData.expectedendmonth).padStart(2, '0')}-01`,
                                lcm: userData.name
                            });



                            Alert.alert("Success", "Application approved successfully!");
                            fetchApplications(); // Refresh the list

                        } catch (err) {
                            console.error("Error approving application:", err);
                            Alert.alert("Error", "Failed to approve application");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRejectApplication = (app) => {
        setSelectedApplication(app);
        setRejectionReason('');
        setRejectionModalVisible(true);
    };

    const confirmRejectApplication = async () => {
        if (!rejectionReason.trim()) {
            Alert.alert("Error", "Please provide a rejection reason");
            return;
        }

        setLoading(true, "Rejecting Application");

        try {
            await API.PUT("PregnancyApplication", {
                action: "updateStatus",
                transid: app.transid,
                applicationstatus: 2,
                rejecteddate: new Date().toISOString(),
                rejectionreason: rejectionReason,
                isbenefitsactive: false,
                lcm: userData.name
            });






            Alert.alert("Success", "Application rejected successfully!");
            fetchApplications(); // Refresh the list
            setRejectionModalVisible(false);
            setSelectedApplication(null);
            setRejectionReason('');

            Alert.alert("Error", Message || "Failed to reject application");

        } catch (err) {
            console.error("Error rejecting application:", err);
            Alert.alert("Error", "Failed to reject application");
        } finally {
            setLoading(false);
        }
    };

    const renderApplicationCard = ({ item }) => (
        <TouchableOpacity
            className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            onPress={() => navigation.navigate('ApplicationDetails', {
                application: item,
                isAdmin: true
            })}
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                    <Text className="text-gray-600 text-sm">
                        User ID: {item.userid} • Mobile: {item.mobilenumber}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                        Applied: {item.appliedDate} • Period: {item.startDate} → {item.endDate}
                    </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${item.statusColor}`}>
                    <Text className={`text-xs font-semibold ${item.textColor}`}>
                        {item.statusText}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center mt-2">
                <Ionicons name="water-outline" size={16} color="#8B5CF6" />
                <Text className="text-purple-600 ml-2 text-sm">
                    Milk Benefit: {item.milkamountml}ml daily
                </Text>
            </View>

            {/* Action buttons for pending applications */}
            {item.status === 'pending' && (
                <View className="flex-row mt-3 space-x-2 ">
                    <TouchableOpacity
                        className="flex-1 bg-green-500 py-2 rounded-lg items-center mx-1"
                        onPress={() => handleApproveApplication(item)}
                    >
                        <Text className="text-white font-semibold">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-red-500 py-2 rounded-lg items-center mx-1"
                        onPress={() => handleRejectApplication(item)}
                    >
                        <Text className="text-white font-semibold">Reject</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Status info for approved/rejected */}
            {item.status === 'approved' && (
                <View className="mt-3 bg-green-50 p-2 rounded-lg">
                    <Text className="text-green-700 text-xs">
                        ✓ Approved • Milk benefits active until {item.endDate}
                    </Text>
                    {item.benefitsstartdate && (
                        <Text className="text-green-600 text-xs mt-1">
                            Benefits started: {new Date(item.benefitsstartdate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            )}

            {item.status === 'rejected' && item.rejectionreason && (
                <View className="mt-3 bg-red-50 p-2 rounded-lg">
                    <Text className="text-red-700 text-xs">
                        ✗ Rejected: {item.rejectionreason}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-800 mb-1">
                    Pregnancy Applications
                </Text>
                <Text className="text-gray-600 text-sm">
                    Admin Panel • Review and manage pregnancy benefit applications
                </Text>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="shield-checkmark" size={16} color="#4B5563" />
                    <Text className="text-gray-700 text-xs ml-1">
                        Admin Access: {applications.length} total applications
                    </Text>
                </View>
            </View>

            {/* Tab Navigation */}
            <View className="flex-row bg-white px-4 border-b border-gray-200">
                <TouchableOpacity
                    className={`flex-1 py-3 ${activeTab === 'pending' ? 'border-b-2 border-purple-500' : ''}`}
                    onPress={() => setActiveTab('pending')}
                >
                    <View className="items-center">
                        <Text className={`text-center font-medium ${activeTab === 'pending' ? 'text-purple-600' : 'text-gray-500'}`}>
                            Pending
                        </Text>
                        <View className={`mt-1 px-2 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs font-semibold ${activeTab === 'pending' ? 'text-purple-600' : 'text-gray-500'}`}>
                                {applications.filter(a => a.status === 'pending').length}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    className={`flex-1 py-3 ${activeTab === 'approved' ? 'border-b-2 border-green-500' : ''}`}
                    onPress={() => setActiveTab('approved')}
                >
                    <View className="items-center">
                        <Text className={`text-center font-medium ${activeTab === 'approved' ? 'text-green-600' : 'text-gray-500'}`}>
                            Approved
                        </Text>
                        <View className={`mt-1 px-2 py-0.5 rounded-full ${activeTab === 'approved' ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs font-semibold ${activeTab === 'approved' ? 'text-green-600' : 'text-gray-500'}`}>
                                {applications.filter(a => a.status === 'approved').length}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    className={`flex-1 py-3 ${activeTab === 'rejected' ? 'border-b-2 border-red-500' : ''}`}
                    onPress={() => setActiveTab('rejected')}
                >
                    <View className="items-center">
                        <Text className={`text-center font-medium ${activeTab === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>
                            Rejected
                        </Text>
                        <View className={`mt-1 px-2 py-0.5 rounded-full ${activeTab === 'rejected' ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs font-semibold ${activeTab === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>
                                {applications.filter(a => a.status === 'rejected').length}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Applications List */}
            <ScrollView
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#8B5CF6']}
                    />
                }
            >
                {filteredApplications.length === 0 ? (
                    <View className="items-center justify-center py-10">
                        <Ionicons
                            name={activeTab === 'pending' ? 'time-outline' : activeTab === 'approved' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                            size={64}
                            color="#D1D5DB"
                        />
                        <Text className="text-gray-500 text-lg mt-4">
                            No {activeTab} applications
                        </Text>
                        <Text className="text-gray-400 text-center mt-2">
                            {activeTab === 'pending'
                                ? 'All pending applications have been reviewed'
                                : activeTab === 'approved'
                                    ? 'No applications have been approved yet'
                                    : 'No applications have been rejected'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredApplications}
                        renderItem={renderApplicationCard}
                        keyExtractor={(item) => item.transid.toString()}
                        scrollEnabled={false}
                    />
                )}
            </ScrollView>

            {/* Summary Footer */}
            <View className="p-3 bg-white border-t border-gray-200">
                <View className="flex-row justify-between">
                    <View className="items-center">
                        <Text className="text-gray-600 text-xs">Total</Text>
                        <Text className="text-gray-800 font-bold">{applications.length}</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-yellow-600 text-xs">Pending</Text>
                        <Text className="text-yellow-700 font-bold">{applications.filter(a => a.status === 'pending').length}</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-green-600 text-xs">Approved</Text>
                        <Text className="text-green-700 font-bold">{applications.filter(a => a.status === 'approved').length}</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-red-600 text-xs">Rejected</Text>
                        <Text className="text-red-700 font-bold">{applications.filter(a => a.status === 'rejected').length}</Text>
                    </View>
                </View>
            </View>

            {/* Rejection Reason Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={rejectionModalVisible}
                onRequestClose={() => setRejectionModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white rounded-xl p-6 w-11/12 max-w-md">
                        <Text className="text-xl font-bold text-gray-800 mb-2">
                            Reject Application
                        </Text>

                        {selectedApplication && (
                            <>
                                <Text className="text-gray-700 mb-1">
                                    Name: <Text className="font-semibold">{selectedApplication.name}</Text>
                                </Text>
                                <Text className="text-gray-700 mb-4">
                                    User ID: <Text className="font-semibold">{selectedApplication.userid}</Text>
                                </Text>
                            </>
                        )}

                        <Text className="text-gray-700 mb-2">
                            Please provide a reason for rejection:
                        </Text>

                        <TextInput
                            className="border border-gray-300 rounded-lg p-3 h-32 text-align-top bg-white"
                            placeholder="Enter rejection reason (required)"
                            multiline
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />

                        <View className="flex-row space-x-3 mt-6">
                            <TouchableOpacity
                                className="flex-1 bg-gray-300 py-3 rounded-lg items-center"
                                onPress={() => setRejectionModalVisible(false)}
                            >
                                <Text className="text-gray-800 font-semibold">Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-lg items-center ${rejectionReason.trim() ? 'bg-red-500' : 'bg-red-300'}`}
                                onPress={confirmRejectApplication}
                                disabled={!rejectionReason.trim()}
                            >
                                <Text className="text-white font-semibold">Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}