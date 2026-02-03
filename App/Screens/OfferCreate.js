import React, { useState } from "react";
import {
    View,
    TextInput,
    Text,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Animated,
    Dimensions
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import Storage from "../../App_Utils/Services/StorageService";
import { API } from "../../App_Utils/Services/APIService";
import Toaster from "../../App_Utils/Services/ToastService";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Switch } from 'react-native-switch';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const OfferCreationPage = () => {
    const { setLoading } = useLoading();
    const [offerTitle, setOfferTitle] = useState("");
    const [offerDescription, setOfferDescription] = useState("");
    const [offerType, setOfferType] = useState("Discount");
    const [offerValue, setOfferValue] = useState("");
    const [minOrderValue, setMinOrderValue] = useState("");
    const [maxDiscount, setMaxDiscount] = useState("");
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [isActive, setIsActive] = useState(true);
    const [usageLimit, setUsageLimit] = useState("");
    const [usageCount, setUsageCount] = useState("");
    const [loading, setLoadingState] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const navigation = useNavigation();

    const colors = {
        primary: '#667EEA',
        primaryDark: '#5A67D8',
        secondary: '#764BA2',
        accent: '#F093FB',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        background: '#F8FAFC',
        card: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        textLight: '#9CA3AF',
        border: '#E5E7EB',
        borderFocus: '#667EEA',
        shadow: 'rgba(0, 0, 0, 0.1)',
    };

    const validateForm = () => {
        if (!offerTitle.trim()) {
            Toaster.errortop("Offer title is required");
            return false;
        }
        if (!offerValue) {
            Toaster.errortop("Offer value is required");
            return false;
        }
        if (endDate <= startDate) {
            Toaster.errortop("End date must be after start date");
            return false;
        }
        return true;
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en', {
            year: 'numeric',
            month: 'short',
            day: 'numeric', timeZone: 'UTC'
        });
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true, "Creating Offer...");

        const CURRENT_USER = await Storage.getData("USER");

        const payload = {
            offertitle: offerTitle,
            offerdescription: offerDescription,
            offertype: offerType,
            offervalue: offerValue,
            minordervalue: minOrderValue || 0,
            maxdiscountamount: maxDiscount || 0,
            startdate: startDate.toISOString(),
            enddate: endDate.toISOString(),
            isactive: isActive,
            usagelimit: usageLimit || null,
            usagecount: usageCount || 0,
            rcu: CURRENT_USER ? CURRENT_USER : "system",
        };

        try {
            const res = await API.POST("Offers", payload);

            if (res && res.message === "Offer created successfully.") {
                Toaster.successtop("Offer created successfully!");
                navigation.goBack();
            } else {
                Toaster.errortop(res?.message || "Failed to create offer");
            }
        } catch (err) {
            console.error("Submission error:", err);
            Toaster.errortop("Failed to create offer");
        } finally {
            setLoading(false);
        }
    };

    const getOfferTypeIcon = (type) => {
        switch (type) {
            case 'Discount': return 'local-offer';
            case 'Free Shipping': return 'local-shipping';
            case 'BOGO': return 'redeem';
            case 'Cashback': return 'account-balance-wallet';
            default: return 'local-offer';
        }
    };

    const renderInputField = ({
        label,
        value,
        onChangeText,
        placeholder,
        required = false,
        keyboardType = 'default',
        multiline = false,
        numberOfLines = 1,
        suffix = null,
        prefix = null
    }) => (
        <View style={{ marginBottom: 20 }}>
            <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 8,
            }}>
                {label} {required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: focusedField === label ? colors.borderFocus : colors.border,
                borderRadius: 12,
                backgroundColor: colors.card,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: focusedField === label ? 0.15 : 0.05,
                shadowRadius: 8,
                elevation: focusedField === label ? 4 : 2,
            }}>
                {prefix && (
                    <View style={{ paddingLeft: 16, paddingRight: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{prefix}</Text>
                    </View>
                )}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textLight}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onFocus={() => setFocusedField(label)}
                    onBlur={() => setFocusedField(null)}
                    style={{
                        flex: 1,
                        paddingVertical: 16,
                        paddingHorizontal: prefix ? 8 : 16,
                        fontSize: 16,
                        color: colors.text,
                        textAlignVertical: multiline ? 'top' : 'center',
                    }}
                />
                {suffix && (
                    <View style={{ paddingRight: 16, paddingLeft: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '500' }}>
                            {suffix}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <LinearGradient
                    colors={[colors.primary, colors.secondary, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                >
                    {/* Header */}
                    <View className="pt-12 pb-5 ">
                        <View className="flex flex-row items-center justify-evenly">
                            {/* <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                            >
                                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                            </TouchableOpacity> */}

                            <View className="flex-1 items-center">
                                <Text className="text-2xl font-bold text-white text-center">
                                    Create New Offer
                                </Text>
                                <Text className="text-sm text-white text-center mt-1 opacity-80">
                                    Design attractive offers for your customers
                                </Text>
                            </View>


                        </View>
                    </View>


                    <ScrollView
                        contentContainerStyle={{
                            padding: 20,
                            paddingTop: 10,
                        }}
                        className="m-5"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: 24,
                            padding: 10,
                            shadowColor: colors.shadow,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.15,
                            shadowRadius: 24,
                            elevation: 8,
                            marginBottom: 20,
                        }}
                    >
                        <View >
                            {renderInputField({
                                label: "Offer Title",
                                value: offerTitle,
                                onChangeText: setOfferTitle,
                                placeholder: "Summer Sale 2024",
                                required: true,
                            })}

                            {renderInputField({
                                label: "Description",
                                value: offerDescription,
                                onChangeText: setOfferDescription,
                                placeholder: "Special discount for summer season",
                                multiline: true,
                                numberOfLines: 3,
                            })}

                            {/* Offer Type */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: '600',
                                    color: colors.text,
                                    marginBottom: 8,
                                }}>
                                    Offer Type <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <View style={{
                                    borderWidth: 1.5,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    backgroundColor: colors.card,
                                    shadowColor: colors.shadow,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                    overflow: 'hidden',
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingLeft: 16,
                                    }}>
                                        <MaterialIcons
                                            name={getOfferTypeIcon(offerType)}
                                            size={20}
                                            color={colors.primary}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Picker
                                            selectedValue={offerType}
                                            onValueChange={(itemValue) => setOfferType(itemValue)}
                                            style={{
                                                flex: 1,
                                                color: colors.text,
                                            }}
                                        >
                                            <Picker.Item label="🏷️ Discount" value="Discount" />
                                            <Picker.Item label="🚚 Free Shipping" value="Free Shipping" />
                                            <Picker.Item label="🎁 Buy One Get One" value="BOGO" />
                                            <Picker.Item label="💰 Cashback" value="Cashback" />
                                        </Picker>
                                    </View>
                                </View>
                            </View>

                            {renderInputField({
                                label: "Offer Value",
                                value: offerValue,
                                onChangeText: setOfferValue,
                                placeholder: offerType === "Discount" ? "10" : offerType === "Free Shipping" ? "0" : "5",
                                required: true,
                                keyboardType: "numeric",
                                suffix: offerType === "Discount" ? "%" : offerType === "Free Shipping" ? "" : "$",
                            })}

                            {/* Conditional Fields for Discount */}
                            {offerType === "Discount" && (
                                <>
                                    {renderInputField({
                                        label: "Minimum Order Value",
                                        value: minOrderValue,
                                        onChangeText: setMinOrderValue,
                                        placeholder: "50",
                                        keyboardType: "numeric",
                                        suffix: "$",
                                    })}

                                    {renderInputField({
                                        label: "Max Discount Amount",
                                        value: maxDiscount,
                                        onChangeText: setMaxDiscount,
                                        placeholder: "20",
                                        keyboardType: "numeric",
                                        suffix: "$",
                                    })}
                                </>
                            )}

                            {/* Date Pickers */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginBottom: 20,
                            }}>
                                <View style={{ width: '48%' }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: 8,
                                    }}>
                                        Start Date <Text style={{ color: colors.error }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowStartDatePicker(true)}
                                        style={{
                                            padding: 16,
                                            borderWidth: 1.5,
                                            borderColor: colors.border,
                                            borderRadius: 12,
                                            backgroundColor: colors.card,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            shadowColor: colors.shadow,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 8,
                                            elevation: 2,
                                        }}
                                    >
                                        <MaterialIcons name="event" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.text, fontSize: 16 }}>
                                            {formatDate(startDate)}
                                        </Text>
                                    </TouchableOpacity>
                                    {showStartDatePicker && (
                                        <DateTimePicker
                                            value={startDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event, selectedDate) => {
                                                setShowStartDatePicker(false);
                                                if (selectedDate) {
                                                    setStartDate(selectedDate);
                                                }
                                            }}
                                        />
                                    )}
                                </View>

                                <View style={{ width: '48%' }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: 8,
                                    }}>
                                        End Date <Text style={{ color: colors.error }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowEndDatePicker(true)}
                                        style={{
                                            padding: 16,
                                            borderWidth: 1.5,
                                            borderColor: colors.border,
                                            borderRadius: 12,
                                            backgroundColor: colors.card,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            shadowColor: colors.shadow,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 8,
                                            elevation: 2,
                                        }}
                                    >
                                        <MaterialIcons name="event" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.text, fontSize: 16 }}>
                                            {formatDate(endDate)}
                                        </Text>
                                    </TouchableOpacity>
                                    {showEndDatePicker && (
                                        <DateTimePicker
                                            value={endDate}
                                            mode="date"
                                            display="default"
                                            minimumDate={startDate}
                                            onChange={(event, selectedDate) => {
                                                setShowEndDatePicker(false);
                                                if (selectedDate) {
                                                    setEndDate(selectedDate);
                                                }
                                            }}
                                        />
                                    )}
                                </View>
                            </View>

                            {/* Active Status */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 16,
                                paddingHorizontal: 4,
                                marginBottom: 20,
                            }}>
                                <View>
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: '600',
                                        color: colors.text,
                                    }}>
                                        Active Status
                                    </Text>
                                    <Text style={{
                                        fontSize: 14,
                                        color: colors.textSecondary,
                                        marginTop: 2,
                                    }}>
                                        {isActive ? 'Offer is currently active' : 'Offer is inactive'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isActive}
                                    onValueChange={setIsActive}
                                    disabled={false}
                                    activeText="ON"
                                    inActiveText="OFF"
                                    circleSize={32}
                                    barHeight={32}
                                    circleBorderWidth={0}
                                    backgroundActive={colors.success}
                                    backgroundInactive={colors.textLight}
                                    circleActiveColor="#FFFFFF"
                                    circleInActiveColor="#FFFFFF"
                                    changeValueImmediately={true}
                                    renderInsideCircle={() => null}
                                    switchLeftPx={3}
                                    switchRightPx={3}
                                    switchWidthMultiplier={2}
                                />
                            </View>

                            {renderInputField({
                                label: "Usage Limit",
                                value: usageLimit,
                                onChangeText: setUsageLimit,
                                placeholder: "Leave empty for unlimited",
                                keyboardType: "numeric",
                            })}

                            {renderInputField({
                                label: "Initial Usage Count",
                                value: usageCount,
                                onChangeText: setUsageCount,
                                placeholder: "0",
                                keyboardType: "numeric",
                            })}

                            {/* Submit Button */}
                            <TouchableOpacity className=" mb-10"
                                onPress={handleSubmit}
                                disabled={loading}
                                style={{
                                    marginTop: 20,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    elevation: 8,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                }}
                            >
                                <LinearGradient className=" "
                                    colors={loading ? [colors.textLight, colors.textLight] : [colors.primary, colors.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{
                                        paddingVertical: 18,
                                        paddingHorizontal: 24,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}

                                    >
                                        {loading && (
                                            <MaterialIcons
                                                name="hourglass-top"
                                                size={20}
                                                color="white"
                                                style={{ marginRight: 8 }}
                                            />
                                        )}
                                        <Text style={{
                                            color: '#FFFFFF',
                                            fontSize: 18,
                                            fontWeight: 'bold',
                                        }}>
                                            {loading ? "Creating Offer..." : "Create Offer"}
                                        </Text>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </KeyboardAvoidingView>
        </>
    );
};

export default OfferCreationPage;