import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    TextInput,
    Modal,
    SafeAreaView,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';

const DailyMilkBirthdayList = () => {
    const { setLoading } = useLoading();
    const [users, setUsers] = useState([]);

    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const filterOptions = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
        { key: 'upcoming', label: 'Upcoming' },
    ];

    // Fetch users from API
    const getUsersListFromDB = async () => {
        setLoading(true, "Fetching Users");
        try {
            const res = await API.GET("DailyMilkRegistration");
            const usersData = Array.isArray(res?.Response) ? res.Response : [];
            console.log("Users API Response:", usersData);

            // Set the users data directly
            setUsers(usersData);
        } catch (err) {
            console.error("Error fetching users:", err);
            Alert.alert("Error", "Failed to fetch users. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUsersListFromDB();
    }, []);

    const getDaysUntilBirthday = (dobString) => {
        if (!dobString) return null;

        const today = new Date();
        const birthDate = new Date(dobString);
        const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const getBirthdayStatus = (dobString) => {
        const daysUntil = getDaysUntilBirthday(dobString);
        if (daysUntil === null) return { text: 'No birthday set', color: '#6B7280', bgColor: '#F3F4F6' };

        if (daysUntil === 0) return { text: 'Today! 🎉', color: '#EF4444', bgColor: '#FEE2E2' };
        if (daysUntil === 1) return { text: 'Tomorrow', color: '#F59E0B', bgColor: '#FEF3C7' };
        if (daysUntil <= 7) return { text: `In ${daysUntil} days`, color: '#10B981', bgColor: '#D1FAE5' };
        if (daysUntil <= 30) return { text: `In ${daysUntil} days`, color: '#3B82F6', bgColor: '#DBEAFE' };
        return { text: `In ${daysUntil} days`, color: '#6B7280', bgColor: '#F3F4F6' };
    };

    const filteredUsers = useMemo(() => {
        let filtered = users.filter(user => {
            const matchesSearch = searchQuery === '' ||
                user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.mobile?.includes(searchQuery) ||
                user.transid?.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            const daysUntil = getDaysUntilBirthday(user.dob);

            switch (selectedFilter) {
                case 'today':
                    return daysUntil === 0;
                case 'week':
                    return daysUntil >= 0 && daysUntil <= 7;
                case 'month':
                    return daysUntil >= 0 && daysUntil <= 30;
                case 'upcoming':
                    return daysUntil >= 0;
                default:
                    return true;
            }
        });

        return filtered.sort((a, b) => {
            const daysA = getDaysUntilBirthday(a.dob) || 999;
            const daysB = getDaysUntilBirthday(b.dob) || 999;
            return daysA - daysB;
        });
    }, [users, selectedFilter, searchQuery]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        });
    };

    const getBookingStatus = (user) => {
        // Since we only have user data, we can determine status from user fields
        if (user.status === 1) {
            return { text: 'Active User', color: '#10B981', bgColor: '#D1FAE5' };
        } else {
            return { text: 'Inactive', color: '#EF4444', bgColor: '#FEE2E2' };
        }
    };

    const handleCall = (mobile) => {
        if (mobile) {
            Linking.openURL(`tel:${mobile}`);
        }
    };

    const UserCard = ({ user }) => {
        const birthdayStatus = getBirthdayStatus(user.dob);
        const bookingStatus = getBookingStatus(user);
        const daysUntil = getDaysUntilBirthday(user.dob);

        return (
            <TouchableOpacity
                onPress={() => {
                    setSelectedUser(user);
                    setModalVisible(true);
                }}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4"
                style={{
                    borderLeftColor: daysUntil === 0 ? '#EF4444' : daysUntil <= 7 ? '#10B981' : '#3B82F6',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                }}
            >
                {/* Header Row */}
                <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                            {user.name || 'No Name'}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            User ID: {user.userid || 'No ID'}
                        </Text>
                    </View>

                    {/* Birthday Badge */}
                    <View className="px-2 py-1 rounded-lg border"
                        style={{
                            backgroundColor: birthdayStatus.bgColor,
                            borderColor: birthdayStatus.color + '20',
                        }}>
                        <Text className="text-xs font-semibold"
                            style={{ color: birthdayStatus.color }}>
                            {birthdayStatus.text}
                        </Text>
                    </View>
                </View>

                {/* Details Row */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-1">
                        <View className="flex-row items-center mb-1.5">
                            <Icon name="cake" size={14} color="#6B7280" />
                            <Text className="text-xs text-gray-700 ml-1.5">
                                {formatDate(user.dob)}
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Icon name="phone" size={14} color="#6B7280" />
                            <Text className="text-xs text-gray-700 ml-1.5">
                                {user.mobile || 'No mobile'}
                            </Text>
                        </View>
                    </View>

                    {/* Call Button */}
                    {user.mobile && (
                        <TouchableOpacity
                            onPress={() => handleCall(user.mobile)}
                            className="bg-emerald-500 p-2 rounded-lg ml-2"
                        >
                            <Icon name="phone" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Footer - Status */}
                <View className="flex-row justify-between items-center">
                    <View className="px-2 py-1 rounded-md"
                        style={{ backgroundColor: bookingStatus.bgColor }}>
                        <Text className="text-xs font-medium"
                            style={{ color: bookingStatus.color }}>
                            {bookingStatus.text}
                        </Text>
                    </View>

                    <Text className="text-xs text-gray-500">
                        {user.familymembers || '0'} family members
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const UserDetailModal = () => {
        if (!selectedUser) return null;

        const birthdayStatus = getBirthdayStatus(selectedUser.dob);
        const bookingStatus = getBookingStatus(selectedUser);

        return (
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                {/* Modal Overlay */}
                <View className="flex-1 bg-black/50 justify-center p-5">
                    {/* Modal Container */}
                    <View className="bg-white rounded-2xl p-5 max-h-[80%]">
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-4">
                            <Text className="text-xl font-bold text-gray-800 flex-1">
                                {selectedUser.name || 'No Name'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="p-1"
                            >
                                <Icon name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                            {/* Birthday Status */}
                            <View className="p-3 rounded-lg mb-4 border-l-4"
                                style={{
                                    backgroundColor: birthdayStatus.bgColor,
                                    borderLeftColor: birthdayStatus.color,
                                }}>
                                <View className="flex-row items-center">
                                    <Icon name="cake" size={18} color={birthdayStatus.color} />
                                    <Text className="text-base font-semibold ml-2"
                                        style={{ color: birthdayStatus.color }}>
                                        {birthdayStatus.text}
                                    </Text>
                                </View>
                                <Text className="text-xs text-gray-700 mt-1">
                                    Birthday: {formatDate(selectedUser.dob)}
                                </Text>
                            </View>

                            {/* User Details */}
                            <View className="gap-3">
                                {/* Registration ID */}
                                <View className="flex-row items-center">
                                    <Icon name="identifier" size={18} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-xs text-gray-500">Registration ID</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.transid || 'Not assigned'}
                                        </Text>
                                    </View>
                                </View>

                                {/* User ID */}
                                <View className="flex-row items-center">
                                    <Icon name="account" size={18} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-xs text-gray-500">User ID</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.userid || 'Not assigned'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Mobile */}
                                <View className="flex-row items-center">
                                    <Icon name="phone" size={18} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-xs text-gray-500">Mobile</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.mobile || 'Not provided'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Address */}
                                <View className="flex-row items-start">
                                    <Icon name="map-marker" size={18} color="#6B7280" className="mt-0.5" />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-xs text-gray-500">Address</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.address || 'Not provided'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Family Members */}
                                <View className="flex-row items-center">
                                    <Icon name="account-group" size={18} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-xs text-gray-500">Family Members</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.familymembers || '0'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Location */}
                                <View className="flex-row items-center">
                                    <Icon name="map" size={18} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-xs text-gray-500">Location Coordinates</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.latitude && selectedUser.longitude ?
                                                `${selectedUser.latitude}, ${selectedUser.longitude}` :
                                                'Not available'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Registration Date */}
                                <View className="flex-row items-center">
                                    <Icon name="calendar" size={18} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-xs text-gray-500">Registered On</Text>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {selectedUser.rcm ? formatDate(selectedUser.rcm) : 'Not specified'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Status */}
                                <View className="p-2.5 rounded-md mt-2"
                                    style={{ backgroundColor: bookingStatus.bgColor }}>
                                    <View className="flex-row items-center">
                                        <Icon
                                            name={bookingStatus.text === 'Active User' ? 'check-circle' : 'alert-circle'}
                                            size={16}
                                            color={bookingStatus.color}
                                        />
                                        <Text className="text-xs font-semibold ml-1.5"
                                            style={{ color: bookingStatus.color }}>
                                            {bookingStatus.text}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View className="flex-row gap-3">
                            {selectedUser.mobile && (
                                <TouchableOpacity
                                    onPress={() => handleCall(selectedUser.mobile)}
                                    className="flex-1 bg-emerald-500 py-3 rounded-lg flex-row items-center justify-center"
                                >
                                    <Icon name="phone" size={18} color="#FFFFFF" />
                                    <Text className="text-white font-semibold ml-1.5">Call Customer</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className={`${selectedUser.mobile ? 'flex-1' : 'flex-[2]'} bg-gray-500 py-3 rounded-lg flex-row items-center justify-center`}
                            >
                                <Text className="text-white font-semibold">Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 ">
            {/* Header */}
            <View className="bg-white px-4 pt-2 pb-4">
                <Text className="text-2xl font-bold text-gray-800 mb-1">
                    Daily Milk User Birthday List
                </Text>
                <Text className="text-xs text-gray-500">
                    {filteredUsers.length} customers found
                </Text>
            </View>

            {/* Search Bar */}
            <View className="bg-white px-4 py-4">
                <View className="bg-gray-100 rounded-lg px-3 py-2 flex-row items-center">
                    <Icon name="magnify" size={18} color="#6B7280" />
                    <TextInput
                        placeholder="Search by name, mobile, or registration ID..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-2 text-sm text-gray-800"
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <View className="bg-white px-4 pb-3">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                >
                    {filterOptions.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setSelectedFilter(filter.key)}
                            className={`px-3.5 py-1.5 rounded-2xl border ${selectedFilter === filter.key ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-200'}`}
                        >
                            <Text className={`text-xs font-semibold ${selectedFilter === filter.key ? 'text-white' : 'text-gray-500'}`}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* User List */}
            <ScrollView
                className="flex-1 p-4"
                showsVerticalScrollIndicator={false}
            >
                {filteredUsers.length === 0 ? (
                    <View className="items-center justify-center py-10">
                        <Icon name="emoticon-sad-outline" size={40} color="#9CA3AF" />
                        <Text className="text-base text-gray-500 font-medium mt-3">
                            No customers found
                        </Text>
                        <Text className="text-xs text-gray-400 text-center mt-1">
                            Try changing your search or filter criteria
                        </Text>
                    </View>
                ) : (
                    <>
                        {filteredUsers.map((user) => (
                            <UserCard
                                key={user.id ?? user._id ?? user.email} // pick a real unique field you have
                                user={user}
                            />
                        ))}

                        <View className="h-10" />
                    </>
                )}
            </ScrollView>


            {/* User Detail Modal */}
            <UserDetailModal />
        </SafeAreaView>
    );
};


export default DailyMilkBirthdayList;