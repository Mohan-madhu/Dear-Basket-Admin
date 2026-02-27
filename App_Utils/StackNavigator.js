import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import "../global.css";
import Splash from "../App/Screens/Common/Splash";
import Login from "../App/Screens/Common/Login";
import UserDashboard from "../App/Screens/UserDashboard";
import PartnerDashboard from "../App/Screens/PartnerDashboard";
import AdminDashboard from "../App/Screens/AdminDashboard";
import BottomTabNavigator from "./BottomTabNavigator";
import SidebarScreen from "../App/Screens/SideBarForHomeScreen";
import ProductScreen from "../App/Components/ProductScreen";
import NewProduct from "../App/Screens/NewProduct";
import NewUser from "../App/Screens/NewUser";
import DailyMilkRegistrationScreen from "../App/Screens/DailyMilkRegistrationScreen";
import QR_Popup from "../App/Components/QR_PopupComponent";
import EachOrderDetails from "../App/Components/EachOrderDetails";
import AdminDashboardScreen from "../App/Screens/AdminDashboardScreen";
import DailyMilkRegistrationApprovalScreen from "../App/Screens/DailyMilkRegistrationApprovalScreen";
import ManageDailyMilkRegistrationScreen from "../App/Screens/ManageDailyMilkRegistrationScreen";
import ManageUsersScreen from "../App/Screens/ManageUsersScreen";
import PartnerUserMappingScreen from "../App/Screens/PartnerUserMappingScreen";
import ViewPartnerUserMappingScreen from "../App/Screens/ViewPartnerUserMappingScreen";
import ViewDailyMilkUsers from "../App/Screens/ViewDailyMilkUsers";
import ViewFastDeliveryOrdersScreen from "../App/Screens/ViewFastDeliveryOrdersScreen";
import ViewDailyMilkDeliveryOrdersScreen from "../App/Screens/ViewDailyMilkDeliveryOrdersScreen";
import ViewCartScreen from "../App/Screens/ViewCartScreen";
import Products_New_Screen from "../App/Screens/Products_New_Screen";
import Products_List_Screen from "../App/Screens/Products_List_Screen";
import OfferCreationPage from "../App/Screens/OfferCreate";
import ViewOffersPage from "../App/Screens/OffersView";
import ProductViewMain from "../App/Screens/ProductView";
import ProductAndVariantScreen from "../App/Screens/ProductAndVariantViewScreen";
import VariantEditScreen from "../App/Screens/ProductVariantEditScreen";
import MyOrdersScreen from "../App/Screens/UserOrdersScreen";
import RaiseTicketScreen from "../App/Screens/RaiseTicketScreen";
import DailyMilk_AccountsManage from "../App/Screens/DailyMilk_AccountsManage";
import DailyMilkStatus from "../App/Components/DailyMilkStatus";
import DailyMilkStatusScreen from "../App/Screens/DailyMilkStatusScreen_Admin";
import FavoritesScreen from "../App/Screens/FavouritesScreen";
import DailyMilkPayment from "../App/Screens/DailyMilkPayment";
import DailyMilkBirthdayList from "../App/Screens/DailyMilkBirthdayList";
import DailyMilk_User_AccountsManage from "../App/Screens/DailyMilk_User_AccountsManage";
import PregnancyApplication from "../App/Screens/PregnancyApplication";
import PregnancyApplications from "../App/Screens/PregnancyApplications";
import ApplicationDetails from "../App/Screens/ApplicationDetails";
import AdminPregnancyApproval from "../App/Screens/AdminPregnancyApproval";
import DailyMilkBooking from "../App/Screens/DailyMilkUserBooking30Days_Renewal";
import DailyMilkActiveBookings from "../App/Screens/DailyMilkActiveBookings";
import PartnerLanding from "../App/Screens/PartnerLanding";
import ViewPartnerOrderScreen from "../App/Screens/ViewPartnerOrderScreen";

const StackNavigator = () => {
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false, // Hide header if not needed
        gestureEnabled: true, // Enable swipe gestures
        animationEnabled: true, // Enable animations
      }}
    >
      <Stack.Screen name="Main" component={BottomTabNavigator} />

      {/* Common Screens */}
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="NewUser" component={NewUser} />

      <Stack.Screen name="TypeListScreen" component={SidebarScreen} />
      <Stack.Screen name="ProductScreen" component={ProductScreen} />
      <Stack.Screen name="NewProduct" component={NewProduct} />

      <Stack.Screen name="QR_Popup" component={QR_Popup} />
      <Stack.Screen name="EachOrderDetails" component={EachOrderDetails} />

      <Stack.Screen
        name="DailyMilkRegistration"
        component={DailyMilkRegistrationScreen}
      />

      {/* Screens */}
      <Stack.Screen name="UserDashboard" component={UserDashboard} />
      <Stack.Screen name="PartnerDashboard" component={PartnerDashboard} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />

      <Stack.Screen
        name="AdminDashboardScreen"
        component={AdminDashboardScreen}
      />

      <Stack.Screen
        name="DailyMilkRegistrationApprovalScreen"
        component={DailyMilkRegistrationApprovalScreen}
      />

      <Stack.Screen
        name="ManageDailyMilkRegistrationScreen"
        component={ManageDailyMilkRegistrationScreen}
      />

      <Stack.Screen name="ManageUsersScreen" component={ManageUsersScreen} />
      <Stack.Screen
        name="PartnerUserMappingScreen"
        component={PartnerUserMappingScreen}
      />

      <Stack.Screen
        name="ViewPartnerUserMappingScreen"
        component={ViewPartnerUserMappingScreen}
      />


      <Stack.Screen
        name="ViewPartnerOrderScreen"
        component={ViewPartnerOrderScreen}
      />


      <Stack.Screen
        name="ViewDailyMilkRegisteredUsersScreen"
        component={ViewDailyMilkUsers}
      />

      <Stack.Screen
        name="ViewDailyMilkDeliveryOrdersScreen"
        component={ViewDailyMilkDeliveryOrdersScreen}
      />

      <Stack.Screen
        name="ViewFastDeliveryOrdersScreen"
        component={ViewFastDeliveryOrdersScreen}
      />

      <Stack.Screen
        name="ViewCartScreen"
        component={ViewCartScreen}
      />



      <Stack.Screen
        name="OfferCreateScreen"
        component={OfferCreationPage}
      />

      <Stack.Screen
        name="OfferViewScreen"
        component={ViewOffersPage}
      />



      <Stack.Screen
        name="Products_New"
        component={Products_New_Screen}
      />

      <Stack.Screen
        name="Products_List_Screen"
        component={Products_List_Screen}
      />



      <Stack.Screen
        name="Prod"
        component={ProductViewMain}
      />

      <Stack.Screen name="ProductAndVariantScreen" component={ProductAndVariantScreen} />

      <Stack.Screen name="ProductVariantEditScreen" component={VariantEditScreen} />
      <Stack.Screen name="MyOrdersScreen" component={MyOrdersScreen} />
      <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
      <Stack.Screen name="DailyMilk_AccountsManage" component={DailyMilk_AccountsManage} />
      <Stack.Screen name="DailyMilk_User_AccountsManage" component={DailyMilk_User_AccountsManage} />
      <Stack.Screen name="DailyMilkStatus_Admin" component={DailyMilkStatusScreen} />
      <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} />
      <Stack.Screen name="DailyMilkPayment" component={DailyMilkPayment} />
      <Stack.Screen name="DailyMilkBirthdayList" component={DailyMilkBirthdayList} />

      <Stack.Screen
        name="PregnancyApplication"
        component={PregnancyApplication}
        options={{ title: 'Pregnancy Application' }}
      />

      <Stack.Screen
        name="PregnancyApplications"
        component={PregnancyApplications}
        options={{ title: 'Pregnancy Applications' }}
      />

      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetails} // You'll need to create this screen
        options={{ title: 'Application Details' }}
      />




      <Stack.Screen
        name="AdminPregnancyApproval"
        component={AdminPregnancyApproval}
        options={{ title: 'Pregnancy Application Approval' }}
      />


      <Stack.Screen
        name="DailyMilkBookingScreen"
        component={DailyMilkBooking}
        options={{ title: 'Daily Milk Booking' }}
      />

      <Stack.Screen
        name="DailyMilkActiveBookingScreen"
        component={DailyMilkActiveBookings}
        options={{ title: 'Daily Milk Active Bookings' }}
      />

      <Stack.Screen
        name="PartnerLandingScreen"
        component={PartnerLanding}
        options={{ title: 'Partner Orders View' }}
      />


    </Stack.Navigator>
  );
};


export default StackNavigator;
