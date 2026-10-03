import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    FlatList,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";
import { API } from "../../App_Utils/Services/APIService";
import Storage from "../../App_Utils/Services/StorageService";

const PREGNANCY_BENEFIT_MONTHS = 5;

export default function NewPregnancyApplication({ navigation }) {
    const { setLoading } = useLoading();

    const [userId, setUserId] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        mobileNumber: "",
        dob: new Date(),
        pregnancyStartMonth: "",
        pregnancyStartYear: "",
        documentUri: null,
        documentName: "",
        documentMimeType: "",
    });

    // Same style as your working code: fileInfo stored separately
    const [fileInfo, setFileInfo] = useState(null);

    const [showDOBPicker, setShowDOBPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(null);
    const [currentDateStatus, setCurrentDateStatus] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Get current user ID
    useEffect(() => {
        const getUserData = async () => {
            try {
                const userData = await Storage.getData("DATA");
                if (!userData) return;

                const user = typeof userData === "string" ? JSON.parse(userData) : userData;
                setUserId(user.transid || user.id);
            } catch (error) {
                console.error("Error getting user data:", error);
            }
        };

        getUserData();
    }, []);

    // Current date for validation
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    const months = [
        { id: 1, name: "January" },
        { id: 2, name: "February" },
        { id: 3, name: "March" },
        { id: 4, name: "April" },
        { id: 5, name: "May" },
        { id: 6, name: "June" },
        { id: 7, name: "July" },
        { id: 8, name: "August" },
        { id: 9, name: "September" },
        { id: 10, name: "October" },
        { id: 11, name: "November" },
        { id: 12, name: "December" },
    ];

    // Generate years (current year and 1 year back)
    const years = Array.from({ length: 2 }, (_, i) => currentYear - i);

    const getMimeType = (filename) => {
        const ext = filename.split(".").pop()?.toLowerCase();
        const mimeTypes = {
            pdf: "application/pdf",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            bmp: "image/bmp",
        };
        return mimeTypes[ext] || "application/octet-stream";
    };

    const calculateExpectedDate = () => {
        if (formData.pregnancyStartMonth && formData.pregnancyStartYear) {
            const startMonth = parseInt(formData.pregnancyStartMonth, 10);
            const startYear = parseInt(formData.pregnancyStartYear, 10);

            let deliveryMonth = startMonth + PREGNANCY_BENEFIT_MONTHS;
            let deliveryYear = startYear;

            while (deliveryMonth > 12) {
                deliveryMonth -= 12;
                deliveryYear += 1;
            }

            const monthName = months.find((m) => m.id === deliveryMonth)?.name;
            return {
                month: deliveryMonth,
                year: deliveryYear,
                monthName,
                startMonth,
                startYear,
            };
        }
        return null;
    };

    const checkCurrentDateStatus = () => {
        if (!formData.pregnancyStartMonth || !formData.pregnancyStartYear) {
            setCurrentDateStatus("");
            return;
        }

        const startMonth = parseInt(formData.pregnancyStartMonth, 10);
        const startYear = parseInt(formData.pregnancyStartYear, 10);

        let endMonth = startMonth + PREGNANCY_BENEFIT_MONTHS;
        let endYear = startYear;

        while (endMonth > 12) {
            endMonth -= 12;
            endYear += 1;
        }

        const startValue = startYear * 12 + startMonth;
        const currentValue = currentYear * 12 + currentMonth;
        const endValue = endYear * 12 + endMonth;

        if (currentValue < startValue) {
            setCurrentDateStatus("❌ Current date is BEFORE pregnancy start date");
        } else if (currentValue > endValue) {
            setCurrentDateStatus(`❌ Current date is AFTER pregnancy period (${PREGNANCY_BENEFIT_MONTHS} months)`);
        } else {
            setCurrentDateStatus("✅ Current date is WITHIN pregnancy period");
        }
    };

    useEffect(() => {
        const deliveryDate = calculateExpectedDate();
        setExpectedDeliveryDate(deliveryDate);
        checkCurrentDateStatus();
    }, [formData.pregnancyStartMonth, formData.pregnancyStartYear]);

    const handleDOBChange = (event, selectedDate) => {
        if (Platform.OS === "android") setShowDOBPicker(false);
        if (selectedDate) setFormData({ ...formData, dob: selectedDate });
    };

    const formatDate = (date) =>
        date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const formatDateForAPI = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    // ✅ Pick document and build fileInfo for API.UPLOAD (same pattern as your signup page)
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/*"],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets?.[0];
            if (!file) return;

            const mimeType = getMimeType(file.name);

            setFormData((prev) => ({
                ...prev,
                documentUri: file.uri,
                documentName: file.name,
                documentMimeType: mimeType,
            }));

            // IMPORTANT: fileInfo structure should match what your API.UPLOAD expects.
            // Most implementations accept: { uri, name, type }
            setFileInfo({
                uri: file.uri,
                name: file.name,
                type: mimeType,
            });

            console.log("Picked file:", { name: file.name, uri: file.uri, type: mimeType, size: file.size });
        } catch (error) {
            console.error("Error picking document:", error);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            Alert.alert("Error", "Please enter name");
            return false;
        }
        if (!formData.mobileNumber.trim() || formData.mobileNumber.length !== 10) {
            Alert.alert("Error", "Please enter valid 10-digit mobile number");
            return false;
        }
        if (!formData.pregnancyStartMonth || !formData.pregnancyStartYear) {
            Alert.alert("Error", "Please select pregnancy start month and year");
            return false;
        }
        if (!fileInfo) {
            Alert.alert("Error", "Please upload a supporting document");
            return false;
        }
        if (currentDateStatus.includes("❌")) {
            Alert.alert("Error", "Current date must be within pregnancy period");
            return false;
        }
        if (!termsAccepted) {
            Alert.alert("Error", "Please accept the terms and conditions");
            return false;
        }
        if (!userId) {
            Alert.alert("Error", "User information not found. Please login again.");
            return false;
        }
        return true;
    };

    // ✅ Upload-first then submit
    const handleSubmitApplication = async () => {
        if (!validateForm()) return;

        let documentPath = "";

        // // 1) Upload document
        // setLoading(true, "Uploading Document…");
        // try {

        //     console.log("Uploading fileInfo:", fileInfo);
        //   const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
        //     path: "Pregnancy Application",
        //   });

        //   console.log("Upload response:", uploadRes);
        //   // your sample uses uploadRes.virtualPath
        //   documentPath = uploadRes?.virtualPath || "";
        //   if (!documentPath) {
        //     throw new Error("Upload response missing virtualPath");
        //   }

        //   // clear fileInfo if you want (same pattern as your other page)
        //   // setFileInfo(null);
        // } catch (err) {
        //   console.error("Upload error:", err);
        //   Alert.alert("Error", "Document upload failed. Please try again.");
        //   setLoading(false);
        //   return;
        // } finally {
        //   setLoading(false);
        // }





        setLoading(true, "Uploading Pregnancy Document…");
        let profilePath = "";

        try {
            if (fileInfo) {
                const uploadRes = await API.UPLOAD("FileUpload", fileInfo, {
                    path: "User Profile",
                });
                profilePath = uploadRes.virtualPath;
                setFileInfo(null);
            }
        } catch (err) {
            console.error("Upload error:", err);
            Toaster.errortop("Profile upload failed");
        } finally {
            setLoading(false);
        }

        console.log("Profile image uploaded to:", profilePath);

        documentPath = profilePath;

        // 2) Submit application
        setLoading(true, "Submitting Application…");
        try {
            const delivery = expectedDeliveryDate;
            const toYMDLocal = (d) => {
                if (!(d instanceof Date) || isNaN(d.getTime())) return null; // prevent NaN-NaN-NaN
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
            };

            // Start date
            const benefitsstartdateObj = new Date(
                Number(formData.pregnancyStartYear),
                Number(formData.pregnancyStartMonth) - 1,
                1
            );
            const benefitsstartdate = toYMDLocal(benefitsstartdateObj);

            // End date (use delivery!)
            const expectedEndYear = Number(delivery?.year);
            const expectedEndMonth = Number(delivery?.month); // 1-12

            const benefitsenddateObj =
                expectedEndYear && expectedEndMonth
                    ? new Date(expectedEndYear, expectedEndMonth, 0)
                    : null;

            const benefitsenddate = benefitsenddateObj ? toYMDLocal(benefitsenddateObj) : null;
            const payload = {
                action: "create",
                userid: userId,
                name: formData.name.trim(),
                dob: formatDateForAPI(formData.dob),
                mobilenumber: formData.mobileNumber.trim(),
                pregnancystartmonth: parseInt(formData.pregnancyStartMonth, 10),
                pregnancystartyear: parseInt(formData.pregnancyStartYear, 10),
                expectedendmonth: delivery?.month,
                expectedendyear: delivery?.year,
                benefitsstartdate: benefitsstartdate,
                benefitsenddate: benefitsenddate,
                // ✅ send uploaded path instead of base64
                documentpath: documentPath,
                documentfilename: formData.documentName,
                documentmimetype: formData.documentMimeType,

                notes: `Application submitted on ${new Date().toLocaleDateString()}. Pregnancy period: ${months[parseInt(formData.pregnancyStartMonth, 10) - 1]?.name
                    } ${formData.pregnancyStartYear} to ${delivery?.monthName} ${delivery?.year}`,
                rcm: `Submitted via mobile app by user ${userId}`,
            };

            console.log("Submitting PregnancyApplication payload:", JSON.stringify(payload, null, 2));

            const res = await API.POST("PregnancyApplication", payload);

            console.log("Submission response:", res);


            if (res?.transid) {
                Alert.alert(
                    "Application Submitted Successfully!",
                    "Your pregnancy benefits application has been submitted for approval. You will receive notification once approved.\n\nNote: If approved, you will receive 250ml of milk daily during your pregnancy period.",
                    [
                        {
                            text: "OK",
                            onPress: () => navigation.navigate("PregnancyApplications"),
                        },
                    ]
                );
            } else {
                // fallbacks if backend sends error text differently
                const msg = res?.Message || res?.error || "Failed to submit application";
                Alert.alert("Error", msg);
            }
        } catch (err) {
            console.error("Error submitting application:", err);
            Alert.alert("Error", "Failed to submit application. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        Alert.alert(
            "Confirm Application",
            `Are you sure you want to submit the pregnancy benefits application?\n\n• Name: ${formData.name}\n• Mobile: ${formData.mobileNumber}\n• DOB: ${formatDate(
                formData.dob
            )}\n• Pregnancy Period: ${months.find((m) => m.id === parseInt(formData.pregnancyStartMonth, 10))?.name
            } ${formData.pregnancyStartYear} to ${expectedDeliveryDate?.monthName} ${expectedDeliveryDate?.year}\n\nIf approved, you will receive 250ml milk daily from today until ${expectedDeliveryDate?.monthName} ${expectedDeliveryDate?.year}`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", onPress: handleSubmitApplication },
            ]
        );
    };

    const MonthPickerModal = () => (
        <Modal
            visible={showMonthPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMonthPicker(false)}
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white rounded-xl p-4 w-80 max-h-96">
                    <Text className="text-xl font-bold text-gray-800 mb-4 text-center">Select Month</Text>
                    <FlatList
                        data={months}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className={`p-3 border-b border-gray-200 ${formData.pregnancyStartMonth === item.id.toString() ? "bg-blue-50" : ""
                                    }`}
                                onPress={() => {
                                    setFormData({ ...formData, pregnancyStartMonth: item.id.toString() });
                                    setShowMonthPicker(false);
                                }}
                            >
                                <Text
                                    className={`text-lg ${formData.pregnancyStartMonth === item.id.toString()
                                        ? "text-blue-600 font-semibold"
                                        : "text-gray-700"
                                        }`}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity className="mt-4 p-3 bg-gray-100 rounded-lg" onPress={() => setShowMonthPicker(false)}>
                        <Text className="text-center text-gray-600">Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const YearPickerModal = () => (
        <Modal
            visible={showYearPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowYearPicker(false)}
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white rounded-xl p-4 w-80 max-h-64">
                    <Text className="text-xl font-bold text-gray-800 mb-4 text-center">Select Year</Text>
                    <FlatList
                        data={years}
                        keyExtractor={(item) => item.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className={`p-3 border-b border-gray-200 ${formData.pregnancyStartYear === item.toString() ? "bg-blue-50" : ""
                                    }`}
                                onPress={() => {
                                    setFormData({ ...formData, pregnancyStartYear: item.toString() });
                                    setShowYearPicker(false);
                                }}
                            >
                                <Text
                                    className={`text-lg ${formData.pregnancyStartYear === item.toString()
                                        ? "text-blue-600 font-semibold"
                                        : "text-gray-700"
                                        }`}
                                >
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity className="mt-4 p-3 bg-gray-100 rounded-lg" onPress={() => setShowYearPicker(false)}>
                        <Text className="text-center text-gray-600">Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
            <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-800 mb-2">New Pregnancy Application</Text>
                <Text className="text-gray-600">Fill the form to apply for daily milk benefits during pregnancy</Text>
            </View>

            {/* Personal Information */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Personal Information</Text>

                <View className="mb-4">
                    <Text className="text-gray-700 mb-2">Full Name *</Text>
                    <TextInput
                        className="border border-gray-300 rounded-lg p-3 bg-white"
                        placeholder="Enter full name"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                        style={{ fontSize: 16 }}
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-gray-700 mb-2">Date of Birth *</Text>
                    <TouchableOpacity
                        className="border border-gray-300 rounded-lg p-3 bg-white"
                        onPress={() => setShowDOBPicker(true)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-800" style={{ fontSize: 16 }}>
                                {formatDate(formData.dob)}
                            </Text>
                            <Ionicons name="calendar" size={20} color="#6B7280" />
                        </View>
                    </TouchableOpacity>

                    {showDOBPicker && (
                        <DateTimePicker
                            value={formData.dob}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={handleDOBChange}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                <View className="mb-4">
                    <Text className="text-gray-700 mb-2">Mobile Number *</Text>
                    <TextInput
                        className="border border-gray-300 rounded-lg p-3 bg-white"
                        placeholder="Enter 10-digit mobile number"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={formData.mobileNumber}
                        onChangeText={(text) => setFormData({ ...formData, mobileNumber: text })}
                        style={{ fontSize: 16 }}
                    />
                </View>
            </View>

            {/* Pregnancy Details */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Pregnancy Details (Month & Year Only)</Text>

                <View className="mb-4">
                    <Text className="text-gray-700 mb-2">Pregnancy Start Month *</Text>
                    <TouchableOpacity
                        className="border border-gray-300 rounded-lg p-3 mb-3 bg-white"
                        onPress={() => setShowMonthPicker(true)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row justify-between items-center">
                            <Text
                                className={`${formData.pregnancyStartMonth ? "text-gray-800" : "text-gray-400"}`}
                                style={{ fontSize: 16 }}
                            >
                                {formData.pregnancyStartMonth
                                    ? months.find((m) => m.id === parseInt(formData.pregnancyStartMonth, 10))?.name
                                    : "Select Month"}
                            </Text>
                            <Ionicons name="calendar" size={20} color="#6B7280" />
                        </View>
                    </TouchableOpacity>

                    <Text className="text-gray-700 mb-2">Pregnancy Start Year *</Text>
                    <TouchableOpacity
                        className="border border-gray-300 rounded-lg p-3 bg-white"
                        onPress={() => setShowYearPicker(true)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row justify-between items-center">
                            <Text className={`${formData.pregnancyStartYear ? "text-gray-800" : "text-gray-400"}`} style={{ fontSize: 16 }}>
                                {formData.pregnancyStartYear || "Select Year"}
                            </Text>
                            <Ionicons name="calendar" size={20} color="#6B7280" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Current Date Validation */}
                {currentDateStatus ? (
                    <View className={`p-3 rounded-lg mb-4 ${currentDateStatus.includes("✅") ? "bg-green-50" : "bg-red-50"}`}>
                        <Text
                            className={currentDateStatus.includes("✅") ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}
                            style={{ fontSize: 14 }}
                        >
                            {currentDateStatus}
                        </Text>
                        <Text
                            className={`text-sm mt-1 ${currentDateStatus.includes("✅") ? "text-green-600" : "text-red-600"}`}
                            style={{ fontSize: 12 }}
                        >
                            Current Date: {months[currentMonth - 1]?.name} {currentYear}
                        </Text>
                    </View>
                ) : null}

                {/* Expected Delivery Date */}
                {expectedDeliveryDate && (
                    <View className="bg-blue-50 p-3 rounded-lg mb-4">
                        <Text className="text-blue-800 font-semibold" style={{ fontSize: 14 }}>
                            Expected Delivery Month: {expectedDeliveryDate.monthName} {expectedDeliveryDate.year}
                        </Text>
                        <Text className="text-blue-600 text-sm mt-1" style={{ fontSize: 12 }}>
                            Calculated based on pregnancy start month + {PREGNANCY_BENEFIT_MONTHS} months
                        </Text>
                    </View>
                )}
            </View>

            {/* Document Upload */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Supporting Document *</Text>

                <TouchableOpacity
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center bg-white"
                    onPress={pickDocument}
                    activeOpacity={0.7}
                >
                    <Ionicons name="document-attach" size={32} color="#6B7280" />
                    <Text className="text-gray-700 mt-2 text-center" style={{ fontSize: 14 }}>
                        {formData.documentName || "Upload Medical Certificate/Report"}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1" style={{ fontSize: 12 }}>
                        PDF or Image files (Max 10MB)
                    </Text>
                </TouchableOpacity>

                {fileInfo && (
                    <View className="mt-3 flex-row items-center">
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text className="text-green-600 ml-2" style={{ fontSize: 14 }}>
                            Document ready to upload
                        </Text>
                    </View>
                )}
            </View>

            {/* Terms */}
            <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Terms & Conditions</Text>

                <View className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <Text className="text-yellow-800 font-semibold mb-2" style={{ fontSize: 14 }}>
                        Important Notes:
                    </Text>
                    {[
                        "Benefits are applicable only during pregnancy period",
                        "Approval subject to verification of documents",
                        "Must be an active daily milk customer with current booking",
                        "If approved, you will receive 250ml of milk daily during pregnancy period",
                        "Benefits start from approval date until expected delivery month",
                        `Current date must be within pregnancy period (${PREGNANCY_BENEFIT_MONTHS} months from start)`,
                    ].map((t, i) => (
                        <Text key={i} className="text-yellow-700 text-sm" style={{ fontSize: 12, lineHeight: 18 }}>
                            {i + 1}. {t}
                        </Text>
                    ))}
                </View>

                <TouchableOpacity
                    className="flex-row items-center"
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    activeOpacity={0.7}
                >
                    <View
                        className={`w-6 h-6 border-2 rounded-md mr-3 justify-center items-center ${termsAccepted ? "bg-emerald-500 border-emerald-500" : "border-gray-400"
                            }`}
                    >
                        {termsAccepted && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <Text className="text-gray-700 flex-1" style={{ fontSize: 14, lineHeight: 20 }}>
                        I agree to the terms and conditions and confirm that all information provided is accurate
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                className="bg-purple-500 py-4 rounded-lg mb-8 shadow-md"
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={!currentDateStatus.includes("✅") || !termsAccepted}
                style={{
                    opacity: currentDateStatus.includes("✅") && termsAccepted ? 1 : 0.5,
                }}
            >
                <Text className="text-white text-center font-bold" style={{ fontSize: 18 }}>
                    Submit Application
                </Text>
                {(!currentDateStatus.includes("✅") || !termsAccepted) && (
                    <Text className="text-white/80 text-center text-sm mt-1" style={{ fontSize: 12 }}>
                        {!currentDateStatus.includes("✅") ? "Fix date validation first" : "Accept terms first"}
                    </Text>
                )}
            </TouchableOpacity>

            <MonthPickerModal />
            <YearPickerModal />
        </ScrollView>
    );
}
