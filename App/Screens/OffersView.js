import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    ActivityIndicator,
    Modal,
    TouchableWithoutFeedback,
    StyleSheet,
    RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { API } from "../../App_Utils/Services/APIService";
import Toaster from "../../App_Utils/Services/ToastService";
import { MaterialIcons, AntDesign, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

const { width, height } = Dimensions.get("window");

const ViewOffersPage = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const navigation = useNavigation();

    const fetchOffers = async () => {
        try {
            const res = await API.GET("Offers");
            if (res && res.Response) {
                setOffers(res.Response);
            }
        } catch (error) {
            Toaster.errortop("Failed to fetch offers");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchOffers();
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    const renderOfferItem = (offer) => (
        <TouchableOpacity
            onPress={() => {
                setSelectedOffer(offer);
                setShowModal(true);
            }}
            style={[
                styles.offerCard,
                {
                    borderLeftWidth: 5,
                    borderLeftColor: offer.isactive ? '#10B981' : '#EF4444'
                }
            ]}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.offerTitle}>{offer.offertitle}</Text>
                <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, { color: offer.isactive ? '#10B981' : '#EF4444' }]}>
                        {offer.isactive ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>

            <Text style={styles.offerDescription} numberOfLines={2}>
                {offer.offerdescription || 'No description provided'}
            </Text>

            <View style={styles.cardFooter}>
                <View style={styles.dateContainer}>
                    <Feather name="calendar" size={14} color="#6B7280" />
                    <Text style={styles.dateText}>
                        {format(new Date(offer.startdate), 'MMM dd')} - {format(new Date(offer.enddate), 'MMM dd, yyyy')}
                    </Text>
                </View>

                <View style={styles.offerValueContainer}>
                    <Text className="text-sm font-semibold" style={styles.offerValueText}>
                        {offer.offertype === 'Discount' ? `${offer.offervalue}% OFF` :
                            offer.offertype === 'Free Shipping' ? 'FREE SHIPPING' :
                                offer.offertype === 'BOGO' ? 'BUY 1 GET 1' :
                                    `${offer.offervalue}${offer.offertype === 'Cashback' ? '$ CASHBACK' : ''}`}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const closeModal = () => {
        setShowModal(false);
        setSelectedOffer(null);
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#4C51BF" />
            <LinearGradient
                colors={["#4C51BF", "#5A67D8", "#667EEA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <AntDesign name="arrowleft" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>All Offers</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('OfferCreateScreen')}
                        style={styles.addButton}
                    >
                        <Feather name="plus" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
   <ScrollView
    className="p-5 flex-1 bg-white mx-3 rounded-3xl mb-10"
    contentContainerStyle={{
        paddingBottom: 20, // Add some bottom padding
        flexGrow: 1, // Ensures proper scrolling behavior
        paddingBottom: 30,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: height - 120,
    }}
    showsVerticalScrollIndicator={false}
    refreshControl={
        <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4C51BF"]}
            tintColor="#4C51BF"
        />
    }
>
    {loading ? (
        <ActivityIndicator size="large" color="#4C51BF" style={styles.loader} />
    ) : offers.length === 0 ? (
        <View style={styles.emptyState}>
            <MaterialIcons name="discount" size={60} color="#9CA3AF" />
            <Text style={styles.emptyText}>No offers available</Text>
            <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('OfferCreateScreen')}
            >
                <Text style={styles.createButtonText}>Create New Offer</Text>
            </TouchableOpacity>
        </View>
    ) : (
        offers.map((offer, index) => (
            <View key={index}>
                {renderOfferItem(offer)}
            </View>
        ))
    )}
</ScrollView>
                {/* Offer Details Modal */}
                <Modal
                    visible={showModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={closeModal}
                >
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalContent}>
                                    {selectedOffer && (
                                        <>
                                            <View style={styles.modalHeader}>
                                                <Text style={styles.modalTitle}>{selectedOffer.offertitle}</Text>
                                                <View style={[
                                                    styles.modalStatus,
                                                    { backgroundColor: selectedOffer.isactive ? '#ECFDF5' : '#FEF2F2' }
                                                ]}>
                                                    <Text style={[
                                                        styles.modalStatusText,
                                                        { color: selectedOffer.isactive ? '#10B981' : '#EF4444' }
                                                    ]}>
                                                        {selectedOffer.isactive ? 'ACTIVE' : 'INACTIVE'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                                <View style={styles.detailRow}>
                                                    <Feather name="type" size={20} color="#6B7280" />
                                                    <Text style={styles.detailLabel}>Offer Type:</Text>
                                                    <Text style={styles.detailValue}>{selectedOffer.offertype}</Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Feather name="percent" size={20} color="#6B7280" />
                                                    <Text style={styles.detailLabel}>Offer Value:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {selectedOffer.offertype === 'Discount' ? `${selectedOffer.offervalue}%` :
                                                            selectedOffer.offertype === 'Free Shipping' ? 'FREE' :
                                                                selectedOffer.offertype === 'BOGO' ? 'BUY 1 GET 1' :
                                                                    `$${selectedOffer.offervalue}`}
                                                    </Text>
                                                </View>

                                                {selectedOffer.minordervalue > 0 && (
                                                    <View style={styles.detailRow}>
                                                        <Feather name="dollar-sign" size={20} color="#6B7280" />
                                                        <Text style={styles.detailLabel}>Min. Order:</Text>
                                                        <Text style={styles.detailValue}>${selectedOffer.minordervalue}</Text>
                                                    </View>
                                                )}

                                                {selectedOffer.maxdiscountamount > 0 && (
                                                    <View style={styles.detailRow}>
                                                        <Feather name="award" size={20} color="#6B7280" />
                                                        <Text style={styles.detailLabel}>Max Discount:</Text>
                                                        <Text style={styles.detailValue}>${selectedOffer.maxdiscountamount}</Text>
                                                    </View>
                                                )}

                                                <View style={styles.detailRow}>
                                                    <Feather name="calendar" size={20} color="#6B7280" />
                                                    <Text style={styles.detailLabel}>Start Date:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {format(new Date(selectedOffer.startdate), 'MMM dd, yyyy')}
                                                    </Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Feather name="calendar" size={20} color="#6B7280" />
                                                    <Text style={styles.detailLabel}>End Date:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {format(new Date(selectedOffer.enddate), 'MMM dd, yyyy')}
                                                    </Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Feather name="hash" size={20} color="#6B7280" />
                                                    <Text style={styles.detailLabel}>Usage Limit:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {selectedOffer.usagelimit || 'Unlimited'}
                                                    </Text>
                                                </View>

                                                <View style={styles.detailRow}>
                                                    <Feather name="hash" size={20} color="#6B7280" />
                                                    <Text style={styles.detailLabel}>Usage Count:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {selectedOffer.usagecount}
                                                    </Text>
                                                </View>

                                                <View style={styles.descriptionContainer}>
                                                    <Text style={styles.descriptionLabel}>Description:</Text>
                                                    <Text style={styles.descriptionText}>
                                                        {selectedOffer.offerdescription || 'No description provided'}
                                                    </Text>
                                                </View>
                                            </ScrollView>

                                            <View style={styles.modalButtons}>
                                                <TouchableOpacity
                                                    style={styles.closeButton}
                                                    onPress={closeModal}
                                                >
                                                    <Text style={styles.closeButtonText}>Close</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </LinearGradient>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    addButton: {
        padding: 8,
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 30,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: height - 120,
    },
    loader: {
        marginTop: 100,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 24,
    },
    createButton: {
        backgroundColor: '#4C51BF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    offerCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    offerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    offerDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 4,
    },
    offerValueContainer: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    offerValueText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#3B82F6',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width - 40,
        maxHeight: height * 0.8,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    modalStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    modalStatusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalScroll: {
        maxHeight: height * 0.5,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 8,
        marginRight: 4,
        width: 100,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        flex: 1,
    },
    descriptionContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    descriptionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    closeButton: {
        backgroundColor: '#4C51BF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default ViewOffersPage;