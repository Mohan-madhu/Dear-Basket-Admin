import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    TextInput,
    Modal,
    Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DailyMilkBirthdayList = () => {
    const [users, setUsers] = useState([
        {
            "user_booked": "b81b680a-9cd6-4779-a241-c147cb682182",
            "is_active_booking": 1,
            "transid": "b81b680a-9cd6-4779-a241-c147cb682182",
            "bookingid": "9769ac82-3fd2-4757-9692-03437284f100",
            "dailymilkregistrationid": "A-az369",
            "userid": "C3AC2C73-7E79-4FEA-B765-D806BFB2B64C",
            "productid": "87F61FC5-5E8E-4C94-A654-33A7AEDC7311",
            "productname": "Milk",
            "price": 40,
            "quantity": 0.5,
            "deliverytype": "Evening",
            "bookingstartdate": "2025-10-28T00:00:00.000Z",
            "bookingenddate": "2025-11-26T00:00:00.000Z",
            "rcu": "Mohan B",
            "rcm": "2025-10-29T07:44:38.517Z",
            "luu": "Admin User",
            "lum": "2025-11-16T23:00:18.207Z",
            "status": 1,
            "payment_status": "PAID",
            "payment_mode": "GPay",
            "totalamount": 680,
            "paidamount": 680,
            "payment_time": "2025-11-16T23:00:18.207Z",
            "paid": "1",
            "name": "Mohan B",
            "dob": "2025-10-07T00:00:00.000Z",
            "address": "VW9H+X9, Tamil Nadu, India",
            "mobile": "8220348218",
            "latitude": "10.8698234",
            "longitude": "76.9285271",
            "familymembers": 3
        },
        {
            "user_booked": "5448120a-e749-4508-9edd-b7a40a4ff93c",
            "is_active_booking": 1,
            "transid": "5448120a-e749-4508-9edd-b7a40a4ff93c",
            "bookingid": "439d1ea1-febc-4e24-a524-53b35adc731f",
            "dailymilkregistrationid": "A-bz369",
            "userid": "F85DBFB5-3F18-47D1-9D0B-086B6C7BA2CA",
            "productid": "87F61FC5-5E8E-4C94-A654-33A7AEDC7311",
            "productname": "Milk",
            "price": 40,
            "quantity": 0.5,
            "deliverytype": "Morning",
            "bookingstartdate": "2025-11-05T00:00:00.000Z",
            "bookingenddate": "2025-12-04T00:00:00.000Z",
            "rcu": "Ram",
            "rcm": "2025-11-02T12:36:14.617Z",
            "luu": "Admin User",
            "lum": "2025-11-02T12:40:58.220Z",
            "status": 1,
            "payment_status": null,
            "payment_mode": null,
            "totalamount": null,
            "paidamount": null,
            "payment_time": null,
            "paid": null,
            "name": "Rams",
            "dob": "1999-02-02T00:00:00.000Z",
            "address": "3/48 middle street vengur trichy",
            "mobile": "1234567890",
            "latitude": "10.8179943",
            "longitude": "78.771529",
            "familymembers": 4
        },
        {
            "user_booked": "NO_BOOKING_YET",
            "is_active_booking": 0,
            "transid": null,
            "bookingid": null,
            "dailymilkregistrationid": null,
            "userid": null,
            "productid": null,
            "productname": null,
            "price": null,
            "quantity": null,
            "deliverytype": null,
            "bookingstartdate": null,
            "bookingenddate": null,
            "rcu": null,
            "rcm": null,
            "luu": null,
            "lum": null,
            "status": null,
            "payment_status": null,
            "payment_mode": null,
            "totalamount": null,
            "paidamount": null,
            "payment_time": null,
            "paid": null,
            "name": "User1",
            "dob": "2025-11-04T00:00:00.000Z",
            "address": "13/54, Tamil Nadu, India",
            "mobile": "1111111111",
            "latitude": "10.9047769",
            "longitude": "76.9577378",
            "familymembers": 4
        }
    ]);

    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Filter options
    const filterOptions = [
        { key: 'all', label: 'All Birthdays' },
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
        { key: 'upcoming', label: 'Upcoming' },
    ];

    // Calculate days until birthday
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

    // Get birthday status
    const getBirthdayStatus = (dobString) => {
        const daysUntil = getDaysUntilBirthday(dobString);

        if (daysUntil === 0) return { text: 'Today! 🎉', color: '#EF4444', bgColor: '#FEE2E2' };
        if (daysUntil === 1) return { text: 'Tomorrow', color: '#F59E0B', bgColor: '#FEF3C7' };
        if (daysUntil <= 7) return { text: `In ${daysUntil} days`, color: '#10B981', bgColor: '#D1FAE5' };
        if (daysUntil <= 30) return { text: `In ${daysUntil} days`, color: '#3B82F6', bgColor: '#DBEAFE' };
        return { text: `In ${daysUntil} days`, color: '#6B7280', bgColor: '#F3F4F6' };
    };

    // Filter users based on selected filter and search
    const filteredUsers = useMemo(() => {
        let filtered = users.filter(user => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.mobile?.includes(searchQuery) ||
                user.dailymilkregistrationid?.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Birthday date filter
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

        // Sort by days until birthday
        return filtered.sort((a, b) => {
            const daysA = getDaysUntilBirthday(a.dob) || 999;
            const daysB = getDaysUntilBirthday(b.dob) || 999;
            return daysA - daysB;
        });
    }, [users, selectedFilter, searchQuery]);

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Get booking status
    const getBookingStatus = (user) => {
        if (user.user_booked === "NO_BOOKING_YET") {
            return { text: 'Not Yet Booked', color: '#EF4444', bgColor: '#FEE2E2' };
        } else if (user.is_active_booking === 1) {
            return { text: 'Active Booking', color: '#10B981', bgColor: '#D1FAE5' };
        } else {
            return { text: 'Not Active', color: '#F59E0B', bgColor: '#FEF3C7' };
        }
    };

    // Handle call
    const handleCall = (mobile) => {
        if (mobile) {
            Linking.openURL(`tel:${mobile}`);
        }
    };

    // User Card Component
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
                style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                    borderLeftWidth: 4,
                    borderLeftColor: daysUntil === 0 ? '#EF4444' : daysUntil <= 7 ? '#10B981' : '#3B82F6',
                }}
            >
                {/* Header Row */}
                <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                            {user.name || 'No Name'}
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            {user.dailymilkregistrationid || 'No Registration ID'}
                        </Text>
                    </View>

                    {/* Birthday Badge */}
                    <View style={{
                        backgroundColor: birthdayStatus.bgColor,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: birthdayStatus.color + '20',
                    }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: birthdayStatus.color,
                        }}>
                            {birthdayStatus.text}
                        </Text>
                    </View>
                </View>

                {/* Details Row */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                            <Icon name="cake" size={16} color="#6B7280" />
                            <Text className="text-sm text-gray-700 ml-2">
                                {formatDate(user.dob)}
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Icon name="phone" size={16} color="#6B7280" />
                            <Text className="text-sm text-gray-700 ml-2">
                                {user.mobile || 'No mobile'}
                            </Text>
                        </View>
                    </View>

                    {/* Call Button */}
                    {user.mobile && (
                        <TouchableOpacity
                            onPress={() => handleCall(user.mobile)}
                            style={{
                                backgroundColor: '#10B981',
                                padding: 10,
                                borderRadius: 12,
                                marginLeft: 12,
                            }}
                        >
                            <Icon name="phone" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Footer - Booking Status */}
                <View className="flex-row justify-between items-center">
                    <View style={{
                        backgroundColor: bookingStatus.bgColor,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                    }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: bookingStatus.color,
                        }}>
                            {bookingStatus.text}
                        </Text>
                    </View>

                    <Text className="text-xs text-gray-500">
                        {user.familymembers} family members
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // User Detail Modal
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
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        padding: 24,
                        maxHeight: '80%',
                    }}>
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-4">
                            <Text className="text-xl font-bold text-gray-900 flex-1">
                                {selectedUser.name || 'No Name'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={{ padding: 4 }}
                            >
                                <Icon name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Birthday Status */}
                            <View style={{
                                backgroundColor: birthdayStatus.bgColor,
                                padding: 16,
                                borderRadius: 12,
                                marginBottom: 16,
                                borderLeftWidth: 4,
                                borderLeftColor: birthdayStatus.color,
                            }}>
                                <View className="flex-row items-center">
                                    <Icon name="cake" size={20} color={birthdayStatus.color} />
                                    <Text className="text-lg font-semibold ml-3" style={{ color: birthdayStatus.color }}>
                                        {birthdayStatus.text}
                                    </Text>
                                </View>
                                <Text className="text-sm text-gray-700 mt-2">
                                    Birthday: {formatDate(selectedUser.dob)}
                                </Text>
                            </View>

                            {/* User Details */}
                            <View style={{ gap: 12 }}>
                                {/* Registration ID */}
                                <View className="flex-row items-center">
                                    <Icon name="identifier" size={20} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-sm text-gray-500">Registration ID</Text>
                                        <Text className="text-base font-medium text-gray-900">
                                            {selectedUser.dailymilkregistrationid || 'Not assigned'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Mobile */}
                                <View className="flex-row items-center">
                                    <Icon name="phone" size={20} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-sm text-gray-500">Mobile</Text>
                                        <Text className="text-base font-medium text-gray-900">
                                            {selectedUser.mobile || 'Not provided'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Address */}
                                <View className="flex-row items-start">
                                    <Icon name="map-marker" size={20} color="#6B7280" style={{ marginTop: 2 }} />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-sm text-gray-500">Address</Text>
                                        <Text className="text-base font-medium text-gray-900">
                                            {selectedUser.address || 'Not provided'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Family Members */}
                                <View className="flex-row items-center">
                                    <Icon name="account-group" size={20} color="#6B7280" />
                                    <View className="ml-3">
                                        <Text className="text-sm text-gray-500">Family Members</Text>
                                        <Text className="text-base font-medium text-gray-900">
                                            {selectedUser.familymembers || '0'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Booking Status */}
                                <View style={{
                                    backgroundColor: bookingStatus.bgColor,
                                    padding: 12,
                                    borderRadius: 8,
                                    marginTop: 8,
                                }}>
                                    <View className="flex-row items-center">
                                        <Icon
                                            name={bookingStatus.text === 'Active Booking' ? 'check-circle' : 'alert-circle'}
                                            size={18}
                                            color={bookingStatus.color}
                                        />
                                        <Text className="text-sm font-semibold ml-2" style={{ color: bookingStatus.color }}>
                                            {bookingStatus.text}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View className="flex-row mt-6" style={{ gap: 12 }}>
                            {selectedUser.mobile && (
                                <TouchableOpacity
                                    onPress={() => handleCall(selectedUser.mobile)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#10B981',
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon name="phone" size={20} color="#FFFFFF" />
                                    <Text className="text-white font-semibold ml-2">Call Customer</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#6B7280',
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
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
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#FFFFFF', padding: 20, paddingTop: 60 }}>
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                    Birthday List
                </Text>
                <Text className="text-sm text-gray-600">
                    {filteredUsers.length} customers found
                </Text>
            </View>

            {/* Search Bar */}
            <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
                <View style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Icon name="magnify" size={20} color="#6B7280" />
                    <TextInput
                        placeholder="Search by name, mobile, or registration ID..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{
                            flex: 1,
                            marginLeft: 8,
                            fontSize: 16,
                            color: '#1F2937',
                        }}
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16 }}
                contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
            >
                {filterOptions.map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        onPress={() => setSelectedFilter(filter.key)}
                        style={{
                            backgroundColor: selectedFilter === filter.key ? '#3B82F6' : '#F3F4F6',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: selectedFilter === filter.key ? '#3B82F6' : '#E5E7EB',
                        }}
                    >
                        <Text style={{
                            color: selectedFilter === filter.key ? '#FFFFFF' : '#6B7280',
                            fontWeight: '600',
                            fontSize: 14,
                        }}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* User List */}
            <ScrollView
                style={{ flex: 1, padding: 16 }}
                showsVerticalScrollIndicator={false}
            >
                {filteredUsers.length === 0 ? (
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 60,
                    }}>
                        <Icon name="emoticon-sad-outline" size={48} color="#9CA3AF" />
                        <Text className="text-lg text-gray-500 font-medium mt-4">
                            No customers found
                        </Text>
                        <Text className="text-sm text-gray-400 text-center mt-2">
                            Try changing your search or filter criteria
                        </Text>
                    </View>
                ) : (
                    filteredUsers.map((user, index) => (
                        <UserCard key={index} user={user} />
                    ))
                )}
            </ScrollView>

            {/* User Detail Modal */}
            <UserDetailModal />
        </View>
    );
};

export default DailyMilkBirthdayList;