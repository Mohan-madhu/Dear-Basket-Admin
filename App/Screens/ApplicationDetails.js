import React, { useEffect, useState } from 'react';
import { Config } from '../../config';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Dimensions,
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';

const { width } = Dimensions.get('window');

export default function ApplicationDetails({ route, navigation }) {
  const { application, isAdmin = false } = route.params;
  const [imageModalVisible, setImageModalVisible] = useState(false);

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



  // Month names for formatting
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Extract pregnancy months from the application
  const rawData = application.rawData || application;
  const startMonth = rawData.pregnancystartmonth;
  const startYear = rawData.pregnancystartyear;
  const endMonth = rawData.expectedendmonth;
  const endYear = rawData.expectedendyear;

  // Calculate pregnancy progress
  const totalMonths = 10;
  const monthsPassed = (currentYear - startYear) * 12 + (currentMonth - startMonth);
  const progressPercentage = Math.min(Math.max(monthsPassed / totalMonths * 100, 0), 100);
  const monthsRemaining = Math.max(totalMonths - monthsPassed, 0);

  // Status configurations
  const statusConfig = {
    pending: {
      icon: 'time',
      color: '#F59E0B',
      bgColor: 'bg-yellow-50',
      text: 'PENDING',
      actionText: 'Under Review'
    },
    approved: {
      icon: 'checkmark-circle',
      color: '#10B981',
      bgColor: 'bg-green-50',
      text: 'APPROVED',
      actionText: 'Benefits Active and will be inactive automatically after pregnancy period.'
    },
    rejected: {
      icon: 'close-circle',
      color: '#EF4444',
      bgColor: 'bg-red-50',
      text: 'REJECTED',
      actionText: 'Application Rejected'
    }
  };

  const status = statusConfig[application.status] || statusConfig.pending;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };


const isBenefitsActiveToday = (data) => {
  if (!data?.benefitsstartdate || !data?.benefitsenddate) return false;

  const start = new Date(data.benefitsstartdate);
  const end = new Date(data.benefitsenddate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return today >= start && today <= end;
};


  // Function to check file type and show appropriate action
  const handleDocumentAction = () => {
    const docName = application.documentfilename || '';
    const docPath = rawData.documentpath || '';

    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(docName);
    const isPDF = /\.pdf$/i.test(docName);

    if (isImage) {
      setImageModalVisible(true);
    } else if (isPDF) {
      Alert.alert(
        'Open PDF',
        `Would you like to open the PDF file: ${docName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: () => {
              Alert.alert('Info', 'PDF viewer would open here. Install react-native-pdf for this feature.');
            }
          }
        ]
      );
    } else {
      Alert.alert('Document Info', `File: ${docName}\n\nType: ${rawData.documentmimetype || 'Unknown'}`);
    }
  };

  // Function to extract a filename from a potential full path
  const getFileName = (path) => {
    if (!path) return 'Document';
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1];
  };

  const handleShareDetails = async () => {
    try {
      const shareContent = {
        message: `Pregnancy Application\n\nName: ${application.name}\nStatus: ${status.text}\nPeriod: ${application.startDate} to ${application.endDate}\nApplication ID: ${application.transid}`,
        title: 'Pregnancy Application Details'
      };

      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Admin approve function
  const handleApproveApplication = async () => {
    Alert.alert(
      "Approve Application",
      `Are you sure you want to approve this application?\n\nName: ${application.name}\nUser ID: ${rawData.userid}\nPregnancy Period: ${application.startDate} to ${application.endDate}`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Approve",
          onPress: async () => {
            // Call your API to approve the application
            try {
              // Replace with your actual API call
              await API.PUT("PregnancyApplication", {
                action: "updateStatus",
                transid: application.transid,
                applicationstatus: 1,
                approveddate: new Date().toISOString(),
                isbenefitsactive: true,
                benefitsstartdate: new Date().toISOString().split('T')[0],
                lcm: userData.name
              });

              Alert.alert("Success", "Application approved successfully!");
              navigation.goBack();
            } catch (err) {
              console.error("Error approving application:", err);
              Alert.alert("Error", "Failed to approve application");
            }
          }
        }
      ]
    );
  };

  // Admin reject function
  const handleRejectApplication = () => {
    Alert.prompt(
      "Reject Application",
      "Please provide a reason for rejection:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reject",
          onPress: async (reason) => {
            if (reason && reason.trim()) {
              // Call your API to reject the application
              try {
                await API.PUT("PregnancyApplication", {
                  action: "updateStatus",
                  transid: application.transid,
                  applicationstatus: 2,
                  approveddate: new Date().toISOString(),
                  isbenefitsactive: true,
                  benefitsstartdate: new Date().toISOString().split('T')[0],
                  lcm: userData.name
                });


                Alert.alert("Success", "Application rejected successfully!");
                navigation.goBack();
              } catch (err) {
                console.error("Error rejecting application:", err);
                Alert.alert("Error", "Failed to reject application");
              }
            } else {
              Alert.alert("Error", "Please provide a rejection reason");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header with Status */}
      <View className={`${status.bgColor} p-6`}>
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Ionicons name={status.icon} size={24} color={status.color} />
              <Text className={`text-lg font-bold ml-2 ${application.textColor}`}>
                {status.text}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-gray-800">{application.name}</Text>
            <Text className="text-gray-600 mt-1">{status.actionText}</Text>
            <Text className="text-gray-500 text-sm mt-1">
              App ID: {application.transid}
            </Text>
          </View>

          <TouchableOpacity
            className="p-2"
            onPress={handleShareDetails}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Milk Benefits Status */}
        {application.status === 'approved' && (
          <View className="mt-4 bg-white rounded-xl p-4 shadow-sm">
            <Text className="text-gray-700 font-semibold mb-2">Daily Milk Benefit</Text>
            <Text className="text-2xl font-bold text-emerald-600">
              {rawData.milkamountml || 250}ml
            </Text>
            {rawData.isbenefitsactive ? (
              <Text className="text-green-600 text-sm mt-1">✓ Active benefits</Text>
            ) : (
              <Text className="text-yellow-600 text-sm mt-1">⏳ Benefits not yet activated</Text>
            )}
          </View>
        )}
      </View>

      {/* Application Details Sections */}
      <View className="p-4">
        {/* Personal Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Ionicons name="person" size={20} color="#4B5563" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">
              Personal Information
            </Text>
          </View>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Full Name</Text>
              <Text className="text-gray-800 font-medium">{application.name}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Date of Birth</Text>
              <Text className="text-gray-800 font-medium">{formatDate(rawData.dob)}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">Mobile Number</Text>
              <Text className="text-gray-800 font-medium">{application.mobilenumber}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-600">User ID</Text>
              <Text className="text-gray-800 font-medium">{rawData.userid}</Text>
            </View>
          </View>
        </View>

        {/* Pregnancy Period with Progress */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Ionicons name="calendar" size={20} color="#4B5563" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">
              Pregnancy Period
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-600">Start: {application.startDate}</Text>
              <Text className="text-sm text-gray-600">End: {application.endDate}</Text>
            </View>

            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>

            <View className="flex-row justify-between mt-2">
              <View className="items-center">
                <View className="w-3 h-3 rounded-full bg-purple-500" />
                <Text className="text-xs text-gray-500 mt-1">Start</Text>
              </View>

              {/* Current month indicator */}
              <View className="items-center" style={{ left: `${progressPercentage}%`, position: 'relative' }}>
                <View className="w-4 h-4 rounded-full bg-white border-2 border-purple-600" />
                <Text className="text-xs text-purple-600 font-medium mt-1">
                  {months[currentMonth - 1]} {currentYear}
                </Text>
              </View>

              <View className="items-center">
                <View className="w-3 h-3 rounded-full bg-purple-500" />
                <Text className="text-xs text-gray-500 mt-1">End</Text>
              </View>
            </View>

            {/* Progress Stats */}
            <View className="flex-row justify-between mt-4">
              <View className="items-center">
                <Text className="text-sm text-gray-600">Completed</Text>
                <Text className="text-lg font-bold text-gray-800">{Math.min(monthsPassed, totalMonths)}</Text>
              </View>

              <View className="items-center">
                <Text className="text-sm text-gray-600">Total</Text>
                <Text className="text-lg font-bold text-gray-800">{totalMonths}</Text>
              </View>

              <View className="items-center">
                <Text className="text-sm text-gray-600">Remaining</Text>
                <Text className="text-lg font-bold text-gray-800">{monthsRemaining}</Text>
              </View>
            </View>
          </View>

          {/* Pregnancy Details */}
          <View className="bg-purple-50 p-3 rounded-lg">
            <Text className="text-purple-700 font-medium">
              Pregnancy Duration: {totalMonths} Months
            </Text>
            <Text className="text-purple-600 text-sm mt-1">
              {application.startDate} to {application.endDate}
            </Text>
            <Text className="text-purple-500 text-xs mt-2">
              {rawData.milkamountml || 250}ml milk daily throughout pregnancy period
            </Text>
          </View>
        </View>

        {/* Application Status */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle" size={20} color="#4B5563" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">
              Application Status
            </Text>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center">
              <View className={`w-3 h-3 rounded-full ${application.status === 'pending' ? 'bg-yellow-500' : application.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
              <View className="ml-3 flex-1">
                <Text className="text-gray-800 font-medium">Current Status</Text>
                <Text className="text-gray-500 text-sm">
  {isBenefitsActiveToday(rawData) ? status.actionText : "Not Active"}
</Text>
</View>
            </View>

            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-blue-500" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-800 font-medium">Applied Date</Text>
                <Text className="text-gray-500 text-sm">{formatDate(rawData.applieddate)}</Text>
              </View>
            </View>

            {application.status === 'approved' && rawData.approveddate && (
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-green-500" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-800 font-medium">Approved Date</Text>
                  <Text className="text-gray-500 text-sm">{formatDate(rawData.approveddate)}</Text>
                </View>
              </View>
            )}

            {application.status === 'rejected' && rawData.rejecteddate && (
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-red-500" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-800 font-medium">Rejected Date</Text>
                  <Text className="text-gray-500 text-sm">{formatDate(rawData.rejecteddate)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Documents */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="document-text" size={20} color="#4B5563" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">
                Documents
              </Text>
            </View>
            <TouchableOpacity onPress={handleDocumentAction}>
              <Text className="text-blue-500 font-medium">View</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="border border-gray-300 rounded-lg p-3 flex-row items-center bg-white"
            onPress={handleDocumentAction}
            activeOpacity={0.7}
          >
            <Ionicons name="document-attach" size={24} color="#6B7280" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-800 font-medium">{getFileName(application.documentfilename)}</Text>
              <Text className="text-gray-500 text-sm">Medical Certificate/Report</Text>
              <Text className="text-gray-400 text-xs mt-1">
                Uploaded on {formatDate(rawData.applieddate)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Image Preview for Image Files */}
          {/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(application.documentfilename) && rawData.documentpath && (
            <TouchableOpacity
              className="mt-3 border border-gray-200 rounded-lg overflow-hidden"
              onPress={() => setImageModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text className="text-gray-600 text-sm p-2 bg-gray-50">Preview:</Text>
              <Image
                source={{ uri: Config.BASE_URL + rawData?.documentpath?.slice(1) }}
                style={{ width: '100%', height: 200 }}
                resizeMode="contain"
                onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Admin Actions Section - ONLY FOR ADMIN VIEWING PENDING APPLICATIONS */}
        {isAdmin && application.status === 'pending' && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Admin Actions
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-green-500 py-3 rounded-lg items-center mx-1"
                onPress={handleApproveApplication}
              >
                <Text className="text-white font-semibold">Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-red-500 py-3 rounded-lg items-center mx-1"
                onPress={handleRejectApplication}
              >
                <Text className="text-white font-semibold">Reject</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-xs text-center mt-2">
              Approve to grant {rawData.milkamountml || 250}ml daily milk benefits
            </Text>
          </View>
        )}

        {/* Notes */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Ionicons name="chatbubble" size={20} color="#4B5563" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">
              Notes
            </Text>
          </View>

          <View className="bg-gray-50 p-3 rounded-lg">
            <Text className="text-gray-700">{rawData.notes || 'No additional notes'}</Text>
          </View>
        </View>

        {/* Footer Information */}
        <View className="p-4 bg-yellow-50 rounded-xl">
          <Text className="text-yellow-800 font-semibold mb-2">Important Information:</Text>
          <Text className="text-yellow-700 text-sm">
            • Milk benefits ({rawData.milkamountml || 250}ml daily) are only for active pregnancy period
          </Text>
          <Text className="text-yellow-700 text-sm">
            • Must maintain active daily milk booking
          </Text>
          <Text className="text-yellow-700 text-sm">
            • Benefits will stop automatically after {application.endDate}
          </Text>
          <Text className="text-yellow-700 text-sm">
            • Application ID: {application.transid}
          </Text>
          <Text className="text-yellow-700 text-sm">
            • User ID: {rawData.userid}
          </Text>
        </View>
      </View>

      {/* Modal for Full-Screen Image View */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity
            className="absolute top-12 right-4 z-10 p-2"
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close-circle" size={32} color="white" />
          </TouchableOpacity>
          {rawData.documentpath && (
            <Image
              source={{ uri: Config.BASE_URL + rawData?.documentpath?.slice(1) }}
              style={{ width: width * 0.95, height: width * 0.95 * 1.4 }}
              resizeMode="contain"
            />
          )}
          <Text className="text-white mt-4 text-center px-4">
            {getFileName(application.documentfilename)}
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
}