import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    FlatList,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';

const PregnancyApplications = ({ navigation }) => {
    const { setLoading } = useLoading();
    const [applications, setApplications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('current'); // 'current', 'past'
    const [userId, setUserId] = useState(null);

    // Month names for formatting
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Get current user ID from storage
    useEffect(() => {
        const getUserData = async () => {
            try {
                const userData = await Storage.getData("DATA");
               

                if (!userData) return;

                const user =
                    typeof userData === "string"
                        ? JSON.parse(userData)
                        : userData;


                setUserId(user.transid || user.id);

            } catch (error) {
                console.error("Error getting user data:", error);
            }
        };

        getUserData();
    }, []);


    // Fetch applications from API using your pattern 
    const fetchApplications = async () => {
        setLoading(true, "Fetching Pregnancy Applications");

        try {
            const res = await API.GET(`PregnancyApplication/user/${userId}`); // no trailing comma
            const Response = Array.isArray(res?.Response) ? res.Response : [];

            // Filter applications for current user
            const userApplications = Response.filter(
                (app) => app?.userid === userId && app?.isdeleted === false
            );

            const transformedApplications = userApplications.map((app) => {
                // months should be an array of month names:
                // ["January","February",...]
                const startDate = `${months[app.pregnancystartmonth - 1]} ${app.pregnancystartyear}`;
                const endDate = `${months[app.expectedendmonth - 1]} ${app.expectedendyear}`;

                // Determine status
                let status = "pending";
                let statusColor = "bg-yellow-100";
                let textColor = "text-yellow-800";

                switch (app.applicationstatus) {
                    case 0:
                        status = "pending";
                        statusColor = "bg-yellow-100";
                        textColor = "text-yellow-800";
                        break;
                    case 1:
                        status = "approved";
                        statusColor = "bg-green-100";
                        textColor = "text-green-800";
                        break;
                    case 2:
                        status = "rejected";
                        statusColor = "bg-red-100";
                        textColor = "text-red-800";
                        break;
                    default:
                        break;
                }

                // Milk amount from API if present
                const milkAmount =
                    app.applicationstatus === 1
                        ? `${app?.milkamountml ?? 250}ml daily`
                        : app.applicationstatus === 2
                            ? "Not approved"
                            : "Pending approval";

                // Check if application is current (based on expected end date)
                const now = new Date();
                const currentValue = now.getFullYear() * 12 + (now.getMonth() + 1);
                const endValue = (app.expectedendyear ?? 0) * 12 + (app.expectedendmonth ?? 0);
                const isCurrent = currentValue <= endValue;

                // Format applied date (DD/MM/YYYY)
                let applieddate = "Not available";
                if (app.applieddate) {
                    const d = new Date(app.applieddate);
                    applieddate = `${String(d.getDate()).padStart(2, "0")}/${String(
                        d.getMonth() + 1
                    ).padStart(2, "0")}/${d.getFullYear()}`;
                }

                return {
                    transid: app.transid,
                    id: app.transid, // already a string UUID, no need toString()
                    name: app.name,
                    startDate,
                    endDate,
                    status,
                    statusColor,
                    textColor,
                    milkAmount,
                    isCurrent,
                    dob: app.dob,
                    mobilenumber: app.mobilenumber,
                    applieddate,
                    notes: app.notes,
                    documentfilename: app.documentfilename,
                    documentpath: app.documentpath,
                    documentmimetype: app.documentmimetype,
                    benefitsstartdate: app.benefitsstartdate,
                    benefitsenddate: app.benefitsenddate,
                    isbenefitsactive: app.isbenefitsactive,
                    rawData: app,
                };
            });

            // Optional: newest first
            transformedApplications.sort(
                (a, b) => new Date(b.rawData.applieddate) - new Date(a.rawData.applieddate)
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
        if (userId) {
            fetchApplications();
        }
    }, [userId]);

    // Filter applications based on active tab
    const filteredApplications = applications.filter(app =>
        activeTab === 'current' ? app.isCurrent : !app.isCurrent
    );

    // Whether there is at least one current (active) application
    const hasCurrent = applications.some(a => a.isCurrent);

    const handleAddNewApplication = () => {
        Alert.alert(
            "Pregnancy Application",
            "Is any family member currently pregnant?",
            [
                {
                    text: "No",
                    style: "cancel"
                },
                {
                    text: "Yes",
                    onPress: () => navigation.navigate("PregnancyApplication")
                }
            ]
        );
    };

    // Delete application
    const handleDeleteApplication = async (transid) => {
        Alert.alert(
            "Delete Application",
            "Are you sure you want to delete this application?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true, "Deleting Application");

                        try {
                            var { Success, Message } = await API.POST("PregnancyApplication", {
                                action: "delete",
                                transid: transid
                            });

                            if (Success) {
                                Alert.alert("Success", "Application deleted successfully");
                                fetchApplications(); // Refresh the list
                            } else {
                                Alert.alert("Error", Message || "Failed to delete application");
                            }
                        } catch (err) {
                            console.error("Error deleting application:", err);
                            Alert.alert("Error", "Failed to delete application");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderApplicationCard = ({ item }) => (
        <TouchableOpacity
            className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            onPress={() => navigation.navigate('ApplicationDetails', { application: item })}
            onLongPress={() => handleDeleteApplication(item.transid)}
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
                    <Text className="text-gray-600 text-sm">
                        {item.startDate} → {item.endDate}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                        Applied: {item.applieddate}
                    </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${item.statusColor}`}>
                    <Text className={`text-xs font-semibold ${item.textColor}`}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center mt-2">
                <Ionicons name="water-outline" size={16} color="#8B5CF6" />
                <Text className="text-purple-600 ml-2 text-sm">{item.milkAmount}</Text>
            </View>
            

            {item.status === 'approved' && item.isCurrent && (
                <View className="mt-3 bg-green-50 p-2 rounded-lg">
                    <Text className="text-green-700 text-xs">
                        ✓ Receiving 250ml milk daily until {item.endDate}
                    </Text>
                    {item.isbenefitsactive && (
                        <Text className="text-green-600 text-xs mt-1">
                            Active benefits from {item.benefitsstartdate || 'N/A'}
                        </Text>
                    )}
                </View>
            )}

            {item.status === 'pending' && (
                <View className="mt-3 bg-yellow-50 p-2 rounded-lg">
                    <Text className="text-yellow-700 text-xs">
                        ⏳ Under review. You'll get 250ml daily if approved.
                    </Text>
                </View>
            )}

            {item.status === 'rejected' && (
                <View className="mt-3 bg-red-50 p-2 rounded-lg">
                    <Text className="text-red-700 text-xs">
                        ✗ Application was rejected
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-800 mb-2">
                    Pregnancy Applications
                </Text>
                <Text className="text-gray-600">
                    Manage your pregnancy milk benefit applications
                </Text>
            </View>

            {/* Tab Navigation */}
            <View className="flex-row bg-white px-4 border-b border-gray-200">
                <TouchableOpacity
                    className={`flex-1 py-3 ${activeTab === 'current' ? 'border-b-2 border-purple-500' : ''}`}
                    onPress={() => setActiveTab('current')}
                >
                    <Text className={`text-center font-medium ${activeTab === 'current' ? 'text-purple-600' : 'text-gray-500'}`}>
                        Current ({applications.filter(a => a.isCurrent).length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-3 ${activeTab === 'past' ? 'border-b-2 border-purple-500' : ''}`}
                    onPress={() => setActiveTab('past')}
                >
                    <Text className={`text-center font-medium ${activeTab === 'past' ? 'text-purple-600' : 'text-gray-500'}`}>
                        Past ({applications.filter(a => !a.isCurrent).length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
        

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
                        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                        <Text className="text-gray-500 text-lg mt-4">
                            No {activeTab === 'current' ? 'current' : 'past'} applications
                        </Text>
                        {activeTab === 'current' && (
                            <Text className="text-gray-400 text-center mt-2">
                                Add a new application to start receiving 250ml daily milk benefits
                            </Text>
                        )}
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

            {/* Add New Application Button */}
            <View className="p-4 bg-white border-t border-gray-200">
                {!hasCurrent && (
                    <TouchableOpacity
                        className="bg-purple-500 py-3 rounded-lg flex-row items-center justify-center"
                        onPress={handleAddNewApplication}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle" size={20} color="white" />
                        <Text className="text-white font-bold text-lg ml-2">
                            Add New Application
                        </Text>
                    </TouchableOpacity>
                )}

                <Text className="text-gray-500 text-center text-sm mt-3">
                    Applications are for pregnancy milk benefits (250ml daily)
                </Text>
                <Text className="text-gray-400 text-center text-xs mt-1">
                    Long press on any application to delete
                </Text>
            </View>
        </View>
    );
};

export default PregnancyApplications;