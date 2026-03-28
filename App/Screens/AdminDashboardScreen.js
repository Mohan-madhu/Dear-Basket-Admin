// import React from 'react';
// import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
// import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
// import { LinearGradient } from 'expo-linear-gradient';
// import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
// import { useNavigation } from '@react-navigation/native';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import Toaster from '../../App_Utils/Services/ToastService';

// // Enable strict mode
// 'use strict';

// // Tab Navigator initialization
// const Tab = createMaterialTopTabNavigator();

// const AdminDashboardScreen = () => {
//   const navigation = useNavigation();
//   const { width } = Dimensions.get('window');
//   const cardWidth = width * 0.45;

//   // Gradient color pairs with improved contrast
//   const gradientPairs = [
//     ['#A1C4FD', '#C2E9FB'],
//     ['#9F7AEA', '#6B4BB8'],
//     ['#2F80ED', '#56CCF2'],
//     ['#B224EF', '#7579FF'],
//     ['#FBC2EB', '#A6C1EE'],
//     ['#FBC2EB', '#A18CD1'],
//     ['#43CBFF', '#9708CC'],
//     ['#FFC371', '#FF5F6D'],
//     ['#FF5858', '#F09819'],
//     ['#00F2FE', '#4FACFE'],
//     ['#FAD0C4', '#FF9A9E'],
//     ['#FF6347', '#FFD700'],
//     ['#66FFB6', '#075E54'],
//     ['#FFD194', '#D1913C'],
//     ['#FFA751', '#FF7C00'],
//     ['#DCEDC1', '#A8E6CF'],
//     ['#FFAA85', '#FF6B95'],
//     ['#EACDA3', '#E6B980'],
//     ['#DFA579', '#C79081'],
//     ['#36D1DC', '#5B86E5'],
//     ['#C471F5', '#FA71CD'],
//     ['#20E3B2', '#0CEBEB'],
//     ['#FEE140', '#FA709A'],
//     ['#764BA2', '#667EEA'],
//     ['#00C6FB', '#005BEA'],
//     ['#FFEDBC', '#ED4264'],
//     ['#11998E', '#38EF7D'],
//     ['#FF7EB3', '#FF758C'],
//     ['#8FD3F4', '#84FAB0'],
//     ['#623AA2', '#F97794']
//   ];




//   // Dashboard cards data
//   const userManagementCards = [
//     { id: 1, title: "Add New User", gradient: gradientPairs[0], screen: "NewUser", icon: "account-plus" },
//     { id: 2, title: "Manage Users", gradient: gradientPairs[1], screen: "ManageUsersScreen", icon: "account-group" },
//     { id: 3, title: "User-Partner Mapping", gradient: gradientPairs[2], screen: "PartnerUserMappingScreen", icon: "account-switch" },
//     { id: 4, title: "View Mappings", gradient: gradientPairs[3], screen: "ViewPartnerUserMappingScreen", icon: "link" },
//   ];

//   const milkManagementCards = [
//     { id: 5, title: "Milk Approval", gradient: gradientPairs[4], screen: "DailyMilkRegistrationApprovalScreen", icon: "check-decagram" },
//     { id: 6, title: "Manage Daily Milk Users", gradient: gradientPairs[5], screen: "ManageDailyMilkRegistrationScreen", icon: "clipboard-text" },
//     { id: 7, title: "View Milk Users", gradient: gradientPairs[6], screen: "ViewDailyMilkRegisteredUsersScreen", icon: "account-multiple" },
//     { id: 8, title: "Manage Products", gradient: gradientPairs[7], screen: "Main", icon: "bottle-tonic" },
//     // { id: 14, title: "Check the Product Create UI", gradient: gradientPairs[13], screen: "Prod", icon: "bottle-tonic" },
//     { id: 9, title: "Product Offers", gradient: gradientPairs[8], screen: "OfferViewScreen", icon: "tag" },
//   ];

//   const deliveryOrdersCards = [
//     { id: 10, title: "Fast Delivery Orders", gradient: gradientPairs[9], screen: "MyOrdersScreen_FAST", icon: "truck-fast" },
//     { id: 11, title: "Daily Milk Orders", gradient: gradientPairs[10], screen: "MyOrdersScreen_DAILYMILK", icon: "clipboard-list" },
//     { id: 13, title: "All Orders", gradient: gradientPairs[12], screen: "MyOrdersScreen", icon: "truck-check-outline" },
//     { id: 12, title: "Order Analytics", gradient: gradientPairs[11], screen: "OrderAnalyticsScreen", icon: "chart-bar" },
//   ];

//   const handleCardPress = (screenName) => {
//     try {
//       if (screenName === "MyOrdersScreen") {
//         console.log(screenName)
//         navigation.navigate("MyOrdersScreen", { allorder: true });
//         return;
//       }

//       if (screenName === "MyOrdersScreen_FAST") {
//         console.log(screenName)
//         navigation.navigate("MyOrdersScreen", { allorder: true, ordertype: "fast" });
//         return;
//       }

//       if (screenName === "MyOrdersScreen_DAILYMILK") {
//         console.log(screenName)
//         navigation.navigate("MyOrdersScreen", { allorder: true, ordertype: "dailymilk" });
//         return;
//       }
//       navigation.navigate(screenName);
//     } catch (err) {
//       Toaster.errortop(`Failed to navigate to ${screenName}`);
//       console.error("Navigation error:", err);
//     }
//   };

//   // Dashboard Card Component
//   const DashboardCard = ({ card, index }) => (
//     <Animated.View
//       key={card.id}
//       entering={FadeInDown.delay(index * 100).duration(500)}
//       style={{ width: cardWidth }}
//       className="mb-5"
//     >
//       <TouchableOpacity
//         onPress={() => handleCardPress(card.screen)}
//         activeOpacity={0.8}
//       >
//         <Animated.View
//           entering={ZoomIn.delay(index * 150)}
//           className="rounded-xl overflow-hidden shadow-lg min-h-[130px]"
//         >
//           <LinearGradient
//             colors={card.gradient}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             className="flex-1 p-4 justify-center items-center"
//           >
//             <MaterialCommunityIcons
//               name={card.icon}
//               size={36}
//               color="white"
//               style={{ marginBottom: 8 }}
//             />
//             <Text className="text-white text-center font-semibold text-sm">
//               {card.title}
//             </Text>
//           </LinearGradient>
//         </Animated.View>
//       </TouchableOpacity>
//     </Animated.View>
//   );

//   // User Management Tab Screen
//   const UserManagementTab = () => (
//     <ScrollView className="flex-1 p-4 bg-gray-50">
//       <Text className="text-xl text-gray-800 font-bold mb-4">
//         Partner and User Management
//       </Text>
//       <View className="flex-row flex-wrap justify-between">
//         {userManagementCards.map((card, index) => (
//           <DashboardCard key={card.id} card={card} index={index} />
//         ))}
//       </View>
//     </ScrollView>
//   );

//   // Milk Management Tab Screen
//   const MilkManagementTab = () => (
//     <ScrollView className="flex-1 p-4 bg-gray-50">
//       <Text className="text-xl text-gray-800 font-bold mb-4">
//         Products and Milk Management
//       </Text>
//       <View className="flex-row flex-wrap justify-between">
//         {milkManagementCards.map((card, index) => (
//           <DashboardCard key={card.id} card={card} index={index} />
//         ))}
//       </View>
//     </ScrollView>
//   );

//   // Delivery Orders Tab Screen
//   const DeliveryOrdersTab = () => (
//     <ScrollView className="flex-1 p-4 bg-gray-50">
//       <Text className="text-xl text-gray-800 font-bold mb-4">
//         Delivery Orders
//       </Text>
//       <View className="flex-row flex-wrap justify-between">
//         {deliveryOrdersCards.map((card, index) => (
//           <DashboardCard key={card.id} card={card} index={index} />
//         ))}
//       </View>
//     </ScrollView>
//   );

//   return (
//     <Tab.Navigator
//       screenOptions={{
//         tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
//         tabBarItemStyle: { flexDirection: 'row' },
//         tabBarIndicatorStyle: { backgroundColor: '#4FACFE' },
//       }}
//     >
//       <Tab.Screen
//         name="Users"
//         component={UserManagementTab}
//         options={{
//           tabBarIcon: ({ color }) => (
//             <MaterialCommunityIcons name="account" size={20} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Milk"
//         component={MilkManagementTab}
//         options={{
//           tabBarIcon: ({ color }) => (
//             <MaterialCommunityIcons name="bottle-tonic" size={20} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="Delivery"
//         component={DeliveryOrdersTab}
//         options={{
//           tabBarIcon: ({ color }) => (
//             <MaterialCommunityIcons name="truck-delivery" size={20} color={color} />
//           ),
//         }}
//       />
//     </Tab.Navigator>
//   );
// };

// export default AdminDashboardScreen;

// AdminDashboardScreen.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Platform, StatusBar, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toaster from '../../App_Utils/Services/ToastService';
import Storage from '../../App_Utils/Services/StorageService';
import { Ionicons } from '@expo/vector-icons';



const Tab = createMaterialTopTabNavigator();

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { width } = Dimensions.get('window');
  const cardWidth = width * 0.45;
  const [loggingOut, setLoggingOut] = useState(false);

  // ===== Custom Header (always visible, independent of Stack) =====
  const Header = () => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 0,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
      }}
    >
      {/* Decorative elements */}
      <View style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
      <View style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.07)' }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}>
            <Ionicons name="shield-checkmark" size={20} color="white" />
          </View>
          <View>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>Admin Dashboard</Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 2 }}>Welcome back, Administrator</Text>
          </View>
        </View>

        <TouchableOpacity
          disabled={loggingOut}
          onPress={async () => {
            try {
              setLoggingOut(true);
              await Storage.removeData('USER');
              await Storage.removeData('ROLE');
              await Storage.removeData('DATA');
              navigation.reset?.({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (e) {
              Toaster.errortop('Logout failed');
              console.error('Logout error:', e);
            } finally {
              setLoggingOut(false);
            }
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            opacity: loggingOut ? 0.7 : 1,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            flexDirection: 'row',
            alignItems: 'center',
          }}
          activeOpacity={0.85}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="white" style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="log-out-outline" size={16} color="white" style={{ marginRight: 6 }} />
          )}
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
            {loggingOut ? 'Logging out…' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
  // ===== Gradients =====
  const gradientPairs = [
    ['#A1C4FD', '#C2E9FB'], ['#9F7AEA', '#6B4BB8'], ['#2F80ED', '#56CCF2'], ['#B224EF', '#7579FF'],
    ['#FBC2EB', '#A6C1EE'], ['#FBC2EB', '#A18CD1'], ['#43CBFF', '#9708CC'], ['#FFC371', '#FF5F6D'],
    ['#FF5858', '#F09819'], ['#00F2FE', '#4FACFE'], ['#FAD0C4', '#FF9A9E'], ['#FF6347', '#FFD700'],
    ['#66FFB6', '#075E54'], ['#FFD194', '#D1913C'], ['#FFA751', '#FF7C00'], ['#DCEDC1', '#A8E6CF'],
    ['#FFAA85', '#FF6B95'], ['#EACDA3', '#E6B980'], ['#DFA579', '#C79081'], ['#36D1DC', '#5B86E5'],
    ['#C471F5', '#FA71CD'], ['#20E3B2', '#0CEBEB'], ['#FEE140', '#FA709A'], ['#764BA2', '#667EEA'],
    ['#00C6FB', '#005BEA'], ['#FFEDBC', '#ED4264'], ['#11998E', '#38EF7D'], ['#FF7EB3', '#FF758C'],
    ['#8FD3F4', '#84FAB0'], ['#623AA2', '#F97794'],
  ];

  // ===== Cards =====

  const userManagementCards = [
    { id: 1, title: 'Add New User', gradient: gradientPairs[0], screen: 'NewUser', icon: 'account-plus' },
    { id: 2, title: 'Manage Users', gradient: gradientPairs[1], screen: 'ManageUsersScreen', icon: 'account-group' },
    { id: 3, title: 'User-Partner Mapping', gradient: gradientPairs[2], screen: 'PartnerUserMappingScreen', icon: 'account-switch' },
    { id: 4, title: 'View Mappings', gradient: gradientPairs[10], screen: 'ViewPartnerUserMappingScreen', icon: 'link' },
    { id: 5, title: 'View Partner Orders', gradient: gradientPairs[3], screen: 'ViewPartnerOrderScreen', icon: 'cart-outline' },
    { id: 16, title: 'Birthday Offers', gradient: gradientPairs[3], screen: 'DailyMilkBirthdayList', icon: 'cake' },
  ];

  const milkManagementCards = [
    { id: 5, title: 'Milk Approval', gradient: gradientPairs[4], screen: 'DailyMilkRegistrationApprovalScreen', icon: 'check-decagram' },
    { id: 5, title: 'Daily Milk Status Dashboard', gradient: gradientPairs[17], screen: 'DailyMilk_Dashboard_Admin', icon: 'check-decagram' },
    { id: 15, title: 'Pregnancy Applications', gradient: gradientPairs[20], screen: 'AdminPregnancyApproval', icon: 'baby-face-outline' },
    { id: 6, title: 'Manage Daily Milk Users', gradient: gradientPairs[5], screen: 'ManageDailyMilkRegistrationScreen', icon: 'clipboard-text' },
    { id: 7, title: 'View Milk Users', gradient: gradientPairs[6], screen: 'ViewDailyMilkRegisteredUsersScreen', icon: 'account-multiple' },
    { id: 8, title: 'Manage Products', gradient: gradientPairs[7], screen: 'Main', icon: 'bottle-tonic' },
    { id: 9, title: 'Product Offers', gradient: gradientPairs[8], screen: 'OfferViewScreen', icon: 'tag' },
    { id: 14, title: 'Daily Milk Accounts', gradient: gradientPairs[19], screen: 'DailyMilk_AccountsManage', icon: 'tag' },
    { id: 14, title: 'Daily Milk Active Bookings', gradient: gradientPairs[1], screen: 'DailyMilkActiveBookingScreen', icon: 'tag' },
  ];

  const deliveryOrdersCards = [
    { id: 10, title: 'Fast Delivery Orders', gradient: gradientPairs[9], screen: 'MyOrdersScreen_FAST', icon: 'truck-fast' },
    { id: 11, title: 'Daily Milk Orders', gradient: gradientPairs[10], screen: 'MyOrdersScreen_DAILYMILK', icon: 'clipboard-list' },
    { id: 13, title: 'All Orders', gradient: gradientPairs[12], screen: 'MyOrdersScreen', icon: 'truck-check-outline' },
    { id: 12, title: 'Order Analytics', gradient: gradientPairs[11], screen: 'GroceryOrdersDashboard', icon: 'chart-bar' },
  ];
  const handleCardPress = (screenName) => {
    try {
      if (screenName === 'MyOrdersScreen') {
        navigation.navigate('MyOrdersScreen', { allorder: true });
        return;
      }
      if (screenName === 'MyOrdersScreen_FAST') {
        navigation.navigate('MyOrdersScreen', { allorder: true, ordertype: 'fast' });
        return;
      }
      if (screenName === 'MyOrdersScreen_DAILYMILK') {
        navigation.navigate('MyOrdersScreen', { allorder: true, ordertype: 'dailymilk' });
        return;
      }
      navigation.navigate(screenName);
    } catch (err) {
      Toaster.errortop(`Failed to navigate to ${screenName}`);
      console.error('Navigation error:', err);
    }
  };

  // ===== Card UI =====
  const DashboardCard = ({ card, index }) => (
    <Animated.View
      key={card.id}
      entering={FadeInDown.delay(index * 100).duration(500)}
      style={{ width: cardWidth }}
      className="mb-5"
    >
      <TouchableOpacity onPress={() => handleCardPress(card.screen)} activeOpacity={0.8}>
        <Animated.View entering={ZoomIn.delay(index * 150)} className="rounded-xl overflow-hidden shadow-lg min-h-[130px]">
          <LinearGradient colors={card.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-1 p-4 justify-center items-center">
            <MaterialCommunityIcons name={card.icon} size={36} color="white" style={{ marginBottom: 8 }} />
            <Text className="text-white text-center font-semibold text-sm">{card.title}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );

  // ===== Tabs =====
  const UserManagementTab = () => (
    <ScrollView className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl text-gray-800 font-bold mb-4">Partner and User Management</Text>
      <View className="flex-row flex-wrap justify-between">
        {userManagementCards.map((card, index) => (
          <DashboardCard key={card.id} card={card} index={index} />
        ))}
      </View>
    </ScrollView>
  );

  const MilkManagementTab = () => (
    <ScrollView className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl text-gray-800 font-bold mb-4">Products and Milk Management</Text>
      <View className="flex-row flex-wrap justify-between">
        {milkManagementCards.map((card, index) => (
          <DashboardCard key={card.id} card={card} index={index} />
        ))}
      </View>
    </ScrollView>
  );

  const DeliveryOrdersTab = () => (
    <ScrollView className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl text-gray-800 font-bold mb-4">Delivery Orders</Text>
      <View className="flex-row flex-wrap justify-between">
        {deliveryOrdersCards.map((card, index) => (
          <DashboardCard key={card.id} card={card} index={index} />
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Header />

      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
          tabBarItemStyle: { flexDirection: 'row' },
          tabBarIndicatorStyle: { backgroundColor: '#4FACFE' },
        }}
        style={{ flex: 1 }}
      >
        <Tab.Screen
          name="Users"
          component={UserManagementTab}
          options={{
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Milk"
          component={MilkManagementTab}
          options={{
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="bottle-tonic" size={20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Delivery"
          component={DeliveryOrdersTab}
          options={{
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="truck-delivery" size={20} color={color} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default AdminDashboardScreen;
