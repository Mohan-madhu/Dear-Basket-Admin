// import React, { useState, useEffect } from 'react';
// import { getImageUrl } from '../../config';
// import { View, Text, TouchableOpacity, Image, Linking, Alert, Modal, TextInput, ScrollView } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { createLogger } from '../../App_Utils/Utils/logger';
// import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
// import { API } from '../../App_Utils/Services/APIService';
// import Storage from '../../App_Utils/Services/StorageService';

// const OrderCard = ({ order, onOrderUpdate }) => {
//   const [expanded, setExpanded] = useState(false);
//   const [hasNewUpdates, setHasNewUpdates] = useState(false);
//   const [showStatusModal, setShowStatusModal] = useState(false);
//   const [showCancelModal, setShowCancelModal] = useState(false);
//   const [cancelReason, setCancelReason] = useState('');
//   const [ROLE, setROLE] = useState('');
//   const [USER, setUSER] = useState('');
//   const { setLoading } = useLoading();
//   const log = createLogger("OrderCard");

//   const ORDER_STATUS_FLOW = [
//     'Order Placed',
//     'Confirmed',
//     'Packed',
//     'Out for Delivery',
//     'Delivered'
//   ];

//   useEffect(() => {
//     checkForNewUpdates();
//     getUserRole();
//   }, [order]);

//   const getUserRole = async () => {
//     try {
//       const role = await Storage.getData("ROLE");
//       const user = await Storage.getData("USER");
//       setROLE(role);
//       setUSER(user);
//     } catch (error) {
//       log("Error getting user role:", error);
//     }
//   };

//   const checkForNewUpdates = () => {
//     const lastViewedStatus = order.lastViewedStatus || 'Order Placed';
//     const currentStatus = order.orderstatus;

//     if (lastViewedStatus !== currentStatus) {
//       setHasNewUpdates(true);
//     }
//   };

//   const markAsViewed = () => {
//     setHasNewUpdates(false);
//   };

//   const openMaps = (lat, lng) => {
//     if (!lat || !lng) {
//       Alert.alert("Location not available");
//       return;
//     }
//     const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
//     Linking.openURL(url).catch((err) => {
//       log("Error opening maps:", err);
//       Alert.alert("Error", "Could not open maps app");
//     });
//   };

//   const getNextAvailableStatuses = () => {
//     const currentStatus = order.orderstatus;
//     const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

//     if (currentIndex === -1) return ORDER_STATUS_FLOW;

//     return ORDER_STATUS_FLOW.slice(currentIndex + 1);
//   };

//   const updateOrderStatus = async (newStatus) => {
//     try {
//       setLoading(true, `Updating order to ${newStatus}...`);

//       let endpoint = '';
//       let payload = {
//         productorderid: order.productorderid,
//         luu: USER
//       };

//       switch (newStatus) {
//         case 'Confirmed':
//           endpoint = 'confirm';
//           payload.orderconfirmedby = USER;
//           break;
//         case 'Packed':
//           endpoint = 'pack';
//           payload.orderpackedby = USER;
//           break;
//         case 'Out for Delivery':
//           endpoint = 'outfordelivery';
//           payload.orderoutofdeliveryby = USER;
//           break;
//         case 'Delivered':
//           endpoint = 'deliver';
//           payload.orderdeliveredby = USER;
//           break;
//         default:
//           endpoint = 'status';
//           payload.orderstatus = newStatus;
//       }

//       const response = await API.PUT(`Orders/${endpoint}`, payload);

//       Alert.alert("Success", response.message || "Order status updated successfully");
//       setShowStatusModal(false);

//       if (onOrderUpdate) {
//         onOrderUpdate();
//       }
//     } catch (error) {
//       log("Error updating order status:", error);
//       Alert.alert("Error", "Failed to update order status");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const cancelOrder = async () => {
//     if (!cancelReason.trim()) {
//       Alert.alert("Error", "Please provide a cancellation reason");
//       return;
//     }

//     try {
//       setLoading(true, "Cancelling order...");

//       const payload = {
//         productorderid: order.productorderid,
//         ordercalcelledby: USER,
//         ordercancelledreason: cancelReason,
//         luu: USER
//       };

//       const response = await API.PUT('Orders/cancel', payload);

//       Alert.alert("Success", response.message || "Order cancelled successfully");
//       setShowCancelModal(false);
//       setCancelReason('');

//       if (onOrderUpdate) {
//         onOrderUpdate();
//       }
//     } catch (error) {
//       log("Error cancelling order:", error);
//       Alert.alert("Error", "Failed to cancel order");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getImageUri = (imagePath) => {
//     if (!imagePath) return null;
//     if (imagePath.startsWith("file://")) return imagePath;
//     if (imagePath.startsWith("http")) return imagePath;
//     return getImageUrl(imagePath);
//   };

//   const parseOrderData = () => {
//     try {
//       if (typeof order.orderdata === 'string') {
//         return JSON.parse(order.orderdata);
//       }
//       return order.orderdata || [];
//     } catch (error) {
//       return [];
//     }
//   };

//   const orderItems = parseOrderData();
//   const totalItems = orderItems.length;

//   const getStatusColor = (status) => {
//     switch (status?.toLowerCase()) {
//       case 'delivered':
//         return 'bg-green-100 text-green-800 border-green-300';
//       case 'cancelled':
//         return 'bg-red-100 text-red-800 border-red-300';
//       case 'confirmed':
//         return 'bg-blue-100 text-blue-800 border-blue-300';
//       case 'packed':
//         return 'bg-amber-100 text-amber-800 border-amber-300';
//       case 'out for delivery':
//         return 'bg-purple-100 text-purple-800 border-purple-300';
//       default:
//         return 'bg-gray-100 text-gray-800 border-gray-300';
//     }
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-IN', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const getTimeDifference = (startDate, endDate) => {
//     if (!startDate || !endDate) return null;

//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     const diffMs = end - start;

//     const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//     const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

//     let result = [];
//     if (days > 0) result.push(`${days}d`);
//     if (hours > 0) result.push(`${hours}h`);
//     if (minutes > 0) result.push(`${minutes}m`);

//     return result.join(' ') || '0m';
//   };

//   const calculateItemTotal = (item) => {
//     const price = item.price || 0;
//     const quantity = item.orderquantity || 1;
//     return price * quantity;
//   };

//   // Admin Action Buttons Component
//   const AdminActions = () => {
//     if (ROLE !== 'ADMIN' || order.orderstatus === 'Cancelled' || order.orderstatus === 'Delivered') {
//       return null;
//     }

//     const nextStatuses = getNextAvailableStatuses();

//     return (
//       <View className="flex-row space-x-2 mt-3">
//         {nextStatuses.length > 0 && (
//           <TouchableOpacity
//             onPress={() => setShowStatusModal(true)}
//             className="flex-1 bg-blue-600 py-2 px-3 rounded-lg flex-row items-center justify-center"
//           >
//             <Icon name="update" size={16} color="white" />
//             <Text className="text-white text-sm font-medium ml-1">Update Status</Text>
//           </TouchableOpacity>
//         )}

//         <TouchableOpacity
//           onPress={() => setShowCancelModal(true)}
//           className="flex-1 bg-red-600 py-2 px-3 rounded-lg flex-row items-center justify-center"
//         >
//           <Icon name="cancel" size={16} color="white" />
//           <Text className="text-white text-sm font-medium ml-1">Cancel Order</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   return (
//     <View className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
//       {/* Order Header */}
//       <TouchableOpacity 
//         onPress={() => {
//           setExpanded(!expanded);
//           if (hasNewUpdates) markAsViewed();
//         }}
//         className="p-4 border-b border-gray-100 relative"
//       >
//         {hasNewUpdates && (
//           <View className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
//             <Icon name="bell" size={12} color="white" />
//           </View>
//         )}

//         <View className="flex-row justify-between items-start mb-2">
//           <View className="flex-1">
//             <Text className="text-sm text-gray-500">Order ID</Text>
//             <Text className="text-base font-semibold text-gray-900">
//               #{order.productorderid?.slice(-5).toUpperCase()}
//             </Text>
//           </View>
//           <View className="flex-row items-center">
//             <View className={`px-3 py-1 rounded-full border ${getStatusColor(order.orderstatus)} mr-2`}>
//               <Text className="text-xs font-medium capitalize">
//                 {order.orderstatus}
//               </Text>
//             </View>
//             {order.isdailymilkuser && (
//               <Icon name="cow" size={16} color="#8B4513" />
//             )}
//           </View>
//         </View>

//         <View className="flex-row justify-between items-center mb-2">
//           <Text className="text-sm text-gray-600">
//             {formatDate(order.ordertime)}
//           </Text>
//           <Text className="text-lg font-bold text-gray-900">
//             ₹{order.itemtotal}
//           </Text>
//         </View>

//         {/* Order Preview Images */}
//         <View className="mt-3">
//           <View className="flex-row items-center justify-between mb-2">
//             <View className="flex-row items-center">
//               <Icon name="package-variant" size={16} color="#6B7280" />
//               <Text className="text-sm text-gray-600 ml-2">
//                 {totalItems} item{totalItems !== 1 ? 's' : ''}
//               </Text>
//             </View>

//             {/* Maps Button */}
//             {order.latitude && order.longitude && (
//               <TouchableOpacity 
//                 onPress={() => openMaps(order.latitude, order.longitude)}
//                 className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full"
//               >
//                 <Icon name="map-marker" size={14} color="#3B82F6" />
//                 <Text className="text-xs text-blue-600 ml-1">View on Map</Text>
//               </TouchableOpacity>
//             )}
//           </View>

//           <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
//             {orderItems.slice(0, 5).map((item, index) => (
//               <View key={index} className="relative mr-2">
//                 <Image
//                   source={{
//                     uri: getImageUri(item.imageurl) || getImageUri(item.product?.imageurl) || 'https://placehold.co/100x100/png?text=No+Image'
//                   }}
//                   className="w-16 h-16 rounded-lg"
//                   resizeMode="cover"
//                 />
//                 {index === 4 && totalItems > 5 && (
//                   <View className="absolute inset-0 bg-black/50 rounded-lg justify-center items-center">
//                     <Text className="text-white text-xs font-bold">+{totalItems - 5}</Text>
//                   </View>
//                 )}
//               </View>
//             ))}
//           </ScrollView>
//         </View>

//         {/* Admin Actions */}
//         <AdminActions />
//       </TouchableOpacity>

//       {/* Expanded Details */}
//       {expanded && (
//         <View className="p-4 bg-gray-50">
//           {/* Delivery Address */}
//           <View className="mb-4">
//             <Text className="text-sm font-semibold text-gray-800 mb-2">Delivery Address</Text>
//             <View className="bg-white p-3 rounded-lg border border-gray-200">
//               <Text className="text-sm text-gray-700">{order.deliveryaddress}</Text>
//               <Text className="text-sm text-gray-700">
//                 {order.deliverycity}, {order.deliverystate} - {order.deliverypincode}
//               </Text>
//               {order.latitude && order.longitude && (
//                 <TouchableOpacity 
//                   onPress={() => openMaps(order.latitude, order.longitude)}
//                   className="flex-row items-center mt-2"
//                 >
//                   <Icon name="map-marker" size={14} color="#3B82F6" />
//                   <Text className="text-xs text-blue-600 ml-1">Open in Google Maps</Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>

//           {/* Order Items with Detailed Pricing */}
//           <View className="mb-4">
//             <Text className="text-sm font-semibold text-gray-800 mb-2">Order Items</Text>
//             {orderItems.map((item, index) => {
//               const itemTotal = calculateItemTotal(item);
//               return (
//                 <View key={index} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
//                   <View className="flex-row items-center">
//                     <Image
//                       source={{
//                         uri: getImageUri(item.imageurl) || getImageUri(item.product?.imageurl) || 'https://placehold.co/60x60/png?text=No+Image'
//                       }}
//                       className="w-12 h-12 rounded-md mr-3"
//                       resizeMode="cover"
//                     />
//                     <View className="flex-1">
//                       <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
//                         {item.productname}
//                       </Text>
//                       {item.variantname && (
//                         <Text className="text-xs text-gray-500">Variant: {item.variantname}</Text>
//                       )}
//                       <View className="flex-row justify-between mt-1">
//                         <Text className="text-xs text-gray-500">₹{item.price} × {item.orderquantity}</Text>
//                         <Text className="text-sm font-semibold text-gray-900">₹{itemTotal}</Text>
//                       </View>
//                     </View>
//                   </View>
//                 </View>
//               );
//             })}
//           </View>

//           {/* Price Breakdown */}
//           <View className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
//             <Text className="text-sm font-semibold text-gray-800 mb-2">Price Details</Text>
//             <View className="flex-row justify-between mb-1">
//               <Text className="text-sm text-gray-600">Item Total</Text>
//               <Text className="text-sm text-gray-600">₹{order.itemtotal}</Text>
//             </View>
//             <View className="flex-row justify-between mb-1">
//               <Text className="text-sm text-gray-600">Delivery Charge</Text>
//               <Text className="text-sm text-gray-600">₹{order.deliverycharge}</Text>
//             </View>
//             <View className="flex-row justify-between mb-1">
//               <Text className="text-sm text-gray-600">Tax</Text>
//               <Text className="text-sm text-gray-600">₹{order.tax}</Text>
//             </View>
//             <View className="border-t border-gray-200 pt-2 mt-2">
//               <View className="flex-row justify-between">
//                 <Text className="text-base font-semibold text-gray-900">Total Amount</Text>
//                 <Text className="text-base font-semibold text-gray-900">
//                   ₹{order.itemtotal + order.deliverycharge + order.tax}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           {/* Order Timeline */}
//           <View className="mt-4">
//             <Text className="text-sm font-semibold text-gray-800 mb-3">Order Timeline</Text>
//             <View className="space-y-4">
//               {order.orderplaced && (
//                 <View className="flex-row">
//                   <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
//                   <View className="ml-2 flex-1">
//                     <Text className="text-sm text-gray-700">Order Placed</Text>
//                     <Text className="text-xs text-gray-500">{formatDate(order.orderpalcedtime)}</Text>
//                     <Text className="text-xs text-green-600">✓ Completed</Text>
//                   </View>
//                 </View>
//               )}

//               {order.orderconfirmed && (
//                 <View className="flex-row">
//                   <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
//                   <View className="ml-2 flex-1">
//                     <Text className="text-sm text-gray-700">Order Confirmed</Text>
//                     <Text className="text-xs text-gray-500">{formatDate(order.orderconfirmedtime)}</Text>
//                     {order.orderplaced && (
//                       <Text className="text-xs text-blue-600">
//                         Time taken: {getTimeDifference(order.orderpalcedtime, order.orderconfirmedtime)}
//                       </Text>
//                     )}
//                   </View>
//                 </View>
//               )}

//               {order.orderpacked && (
//                 <View className="flex-row">
//                   <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
//                   <View className="ml-2 flex-1">
//                     <Text className="text-sm text-gray-700">Packed</Text>
//                     <Text className="text-xs text-gray-500">{formatDate(order.orderpackedtime)}</Text>
//                     {order.orderconfirmed && (
//                       <Text className="text-xs text-blue-600">
//                         Time taken: {getTimeDifference(order.orderconfirmedtime, order.orderpackedtime)}
//                       </Text>
//                     )}
//                   </View>
//                 </View>
//               )}

//               {order.orderoutofdelivery && (
//                 <View className="flex-row">
//                   <Icon name="truck" size={16} color="#3B82F6" className="mt-1" />
//                   <View className="ml-2 flex-1">
//                     <Text className="text-sm text-gray-700">Out for Delivery</Text>
//                     <Text className="text-xs text-gray-500">{formatDate(order.orderoutofdeliverytime)}</Text>
//                     {order.orderpacked && (
//                       <Text className="text-xs text-blue-600">
//                         Time taken: {getTimeDifference(order.orderpackedtime, order.orderoutofdeliverytime)}
//                       </Text>
//                     )}
//                   </View>
//                 </View>
//               )}

//               {order.orderdelivered && (
//                 <View className="flex-row">
//                   <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
//                   <View className="ml-2 flex-1">
//                     <Text className="text-sm text-gray-700">Delivered</Text>
//                     <Text className="text-xs text-gray-500">{formatDate(order.orderdeliveredtime)}</Text>
//                     {order.orderoutofdelivery && (
//                       <Text className="text-xs text-green-600">
//                         Delivered in: {getTimeDifference(order.orderoutofdeliverytime, order.orderdeliveredtime)}
//                       </Text>
//                     )}
//                   </View>
//                 </View>
//               )}

//               {order.ordercancelled && (
//                 <View className="flex-row">
//                   <Icon name="close-circle" size={16} color="#EF4444" className="mt-1" />
//                   <View className="ml-2 flex-1">
//                     <Text className="text-sm text-gray-700">Cancelled</Text>
//                     <Text className="text-xs text-gray-500">{formatDate(order.ordercancelledtime)}</Text>
//                     {order.ordercancelledreason && (
//                       <Text className="text-xs text-red-500">
//                         Reason: {order.ordercancelledreason}
//                       </Text>
//                     )}
//                   </View>
//                 </View>
//               )}
//             </View>
//           </View>
//         </View>
//       )}

//       {/* Status Update Modal */}
//       <Modal visible={showStatusModal} transparent animationType="slide">
//         <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
//           <View className="bg-white w-full max-w-md rounded-xl p-6">
//             <Text className="text-xl font-bold text-gray-800 mb-4">Update Order Status</Text>

//             <Text className="text-sm text-gray-600 mb-2">Current Status: {order.orderstatus}</Text>

//             <Text className="text-sm font-medium text-gray-700 mb-3">Select next status:</Text>

//             {getNextAvailableStatuses().map((status) => (
//               <TouchableOpacity
//                 key={status}
//                 onPress={() => updateOrderStatus(status)}
//                 className="bg-blue-100 p-3 rounded-lg mb-2"
//               >
//                 <Text className="text-blue-800 font-medium text-center">{status}</Text>
//               </TouchableOpacity>
//             ))}

//             <TouchableOpacity
//               onPress={() => setShowStatusModal(false)}
//               className="bg-gray-300 p-3 rounded-lg mt-4"
//             >
//               <Text className="text-gray-800 font-medium text-center">Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Cancel Order Modal */}
//       <Modal visible={showCancelModal} transparent animationType="slide">
//         <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
//           <View className="bg-white w-full max-w-md rounded-xl p-6">
//             <Text className="text-xl font-bold text-gray-800 mb-4">Cancel Order</Text>

//             <Text className="text-sm text-gray-600 mb-4">
//               Are you sure you want to cancel this order? This action cannot be undone.
//             </Text>

//             <Text className="text-sm font-medium text-gray-700 mb-2">Cancellation Reason:</Text>
//             <TextInput
//               value={cancelReason}
//               onChangeText={setCancelReason}
//               placeholder="Enter reason for cancellation"
//               multiline
//               numberOfLines={3}
//               className="border border-gray-300 rounded-lg p-3 text-gray-800 mb-4"
//             />

//             <View className="flex-row space-x-3">
//               <TouchableOpacity
//                 onPress={() => setShowCancelModal(false)}
//                 className="flex-1 bg-gray-300 p-3 rounded-lg"
//               >
//                 <Text className="text-gray-800 font-medium text-center">Back</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={cancelOrder}
//                 className="flex-1 bg-red-600 p-3 rounded-lg"
//               >
//                 <Text className="text-white font-medium text-center">Confirm Cancel</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Footer Actions */}
//       <View className="p-4 bg-gray-50 border-t border-gray-100">
//         <TouchableOpacity 
//           onPress={() => {
//             setExpanded(!expanded);
//             if (hasNewUpdates) markAsViewed();
//           }}
//           className="flex-row items-center justify-center"
//         >
//           <Text className="text-blue-600 font-medium mr-2">
//             {expanded ? 'Show Less' : 'View Details'}
//           </Text>
//           <Icon 
//             name={expanded ? "chevron-up" : "chevron-down"} 
//             size={20} 
//             color="#3B82F6" 
//           />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

// export default OrderCard;








import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Alert, Modal, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createLogger } from '../../App_Utils/Utils/logger';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API } from '../../App_Utils/Services/APIService';
import Storage from '../../App_Utils/Services/StorageService';

const OrderCard = ({ order, onOrderUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [hasNewUpdates, setHasNewUpdates] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [ROLE, setROLE] = useState('');
    const [USER, setUSER] = useState('');
    const { setLoading } = useLoading();
    const log = createLogger("OrderCard");

    const ORDER_STATUS_FLOW = [
        'Order Placed',
        'Confirmed',
        'Packed',
        'Out for Delivery',
        'Delivered'
    ];

    useEffect(() => {
        checkForNewUpdates();
        getUserRole();
    }, [order]);

    const getUserRole = async () => {
        try {
            const role = await Storage.getData("ROLE");
            const user = await Storage.getData("USER");
            setROLE(role);
            setUSER(user);
        } catch (error) {
            log("Error getting user role:", error);
        }
    };

    const checkForNewUpdates = () => {
        const lastViewedStatus = order.lastViewedStatus || 'Order Placed';
        const currentStatus = order.orderstatus;

        if (lastViewedStatus !== currentStatus) {
            setHasNewUpdates(true);
        }
    };

    const markAsViewed = () => {
        setHasNewUpdates(false);
    };

    const getNextStatus = () => {
        const currentStatus = order.orderstatus;
        const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

        log({currentIndex,currentStatus,ORDER_STATUS_FLOW})

        if (currentIndex === -1 || currentIndex >= ORDER_STATUS_FLOW.length - 1) {
            return null;
        }

        return ORDER_STATUS_FLOW[currentIndex + 1];
    };

    const getStatusButtonConfig = (status) => {
        switch (status) {
            case 'Confirmed':
                return { icon: 'check-circle-outline', color: 'bg-blue-600', text: 'Confirm Order' };
            case 'Packed':
                return { icon: 'package-variant', color: 'bg-amber-600', text: 'Mark as Packed' };
            case 'Out for Delivery':
                return { icon: 'truck-delivery', color: 'bg-purple-600', text: 'Out for Delivery' };
            case 'Delivered':
                return { icon: 'check-circle', color: 'bg-green-600', text: 'Mark as Delivered' };
            default:
                return { icon: 'update', color: 'bg-gray-600', text: 'Update Status' };
        }
    };

    const updateOrderStatus = async (newStatus) => {
        if (!newStatus) return;

        try {
            setLoading(true, `Updating order to ${newStatus}...`);

            let endpoint = '';
            let payload = {
                productorderid: order.productorderid,
                luu: USER
            };

            switch (newStatus) {
                case 'Confirmed':
                    endpoint = 'confirm';
                    payload.orderconfirmedby = USER;
                    break;
                case 'Packed':
                    endpoint = 'pack';
                    payload.orderpackedby = USER;
                    break;
                case 'Out for Delivery':
                    endpoint = 'outfordelivery';
                    payload.orderoutofdeliveryby = USER;
                    break;
                case 'Delivered':
                    endpoint = 'deliver';
                    payload.orderdeliveredby = USER;
                    break;
                default:
                    endpoint = 'status';
                    payload.orderstatus = newStatus;
            }

            const response = await API.PUT(`Orders/${endpoint}`, payload);

            Alert.alert("Success", response.message || `Order status updated to ${newStatus}`);

            if (onOrderUpdate) {
                onOrderUpdate();
            }
        } catch (error) {
            log("Error updating order status:", error);
            Alert.alert("Error", "Failed to update order status");
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async () => {
        if (!cancelReason.trim()) {
            Alert.alert("Error", "Please provide a cancellation reason");
            return;
        }

        try {
            setLoading(true, "Cancelling order...");

            const payload = {
                productorderid: order.productorderid,
                ordercalcelledby: USER,
                ordercancelledreason: cancelReason,
                luu: USER
            };

            const response = await API.PUT('Orders/cancel', payload);

            Alert.alert("Success", response.message || "Order cancelled successfully");
            setShowCancelModal(false);
            setCancelReason('');

            if (onOrderUpdate) {
                onOrderUpdate();
            }
        } catch (error) {
            log("Error cancelling order:", error);
            Alert.alert("Error", "Failed to cancel order");
        } finally {
            setLoading(false);
        }
    };


    const getImageUri = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("file://")) return imagePath;
        if (imagePath.startsWith("http")) return imagePath;
        return getImageUrl(imagePath);
    };

    const parseOrderData = () => {
        try {
            if (typeof order.orderdata === 'string') {
                return JSON.parse(order.orderdata);
            }
            return order.orderdata || [];
        } catch (error) {
            return [];
        }
    };

    const orderItems = parseOrderData();
    const totalItems = orderItems.length;

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'packed':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'out for delivery':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeDifference = (startDate, endDate) => {
        if (!startDate || !endDate) return null;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end - start;

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let result = [];
        if (days > 0) result.push(`${days}d`);
        if (hours > 0) result.push(`${hours}h`);
        if (minutes > 0) result.push(`${minutes}m`);

        return result.join(' ') || '0m';
    };

    const calculateItemTotal = (item) => {
        const price = item.price || 0;
        const quantity = item.orderquantity || 1;
        return price * quantity;
    };

    // Admin Action Buttons Component

    // ... (rest of the helper functions remain the same: getImageUri, parseOrderData, etc.)

    // Admin Action Buttons Component - UPDATED
    const AdminActions = () => {
        if (ROLE !== 'ADMIN' || order.orderstatus === 'Cancelled' || order.orderstatus === 'Delivered') {
            return null;
        }

        const nextStatus = getNextStatus();
        log(nextStatus)

        if (!nextStatus) {
            return (
                <View className="flex-row space-x-2 mt-3">
                    <TouchableOpacity
                        onPress={() => setShowCancelModal(true)}
                        className="flex-1 bg-red-600 py-2 px-3 rounded-lg flex-row items-center justify-center"
                    >
                        <Icon name="cancel" size={16} color="white" />
                        <Text className="text-white text-sm font-medium ml-1">Cancel Order</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const buttonConfig = getStatusButtonConfig(nextStatus);

        return (
            <View className="flex-row space-x-2 mt-3">
                <TouchableOpacity
                    onPress={() => updateOrderStatus(nextStatus)}
                    className={`flex-1 ${buttonConfig.color} py-2 px-3 rounded-lg flex-row items-center justify-center`}
                >
                    <Icon name={buttonConfig.icon} size={16} color="white" />
                    <Text className="text-white text-sm font-medium ml-1">{buttonConfig.text}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowCancelModal(true)}
                    className="flex-1 bg-red-600 py-2 px-3 rounded-lg flex-row items-center justify-center"
                >
                    <Icon name="cancel" size={16} color="white" />
                    <Text className="text-white text-sm font-medium ml-1">Cancel Order</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
            {/* Order Header */}
            <TouchableOpacity
                onPress={() => {
                    setExpanded(!expanded);
                    if (hasNewUpdates) markAsViewed();
                }}
                className="p-4 border-b border-gray-100 relative"
            >
                {hasNewUpdates && (
                    <View className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                        <Icon name="bell" size={12} color="white" />
                    </View>
                )}

                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                        <Text className="text-sm text-gray-500">Order ID</Text>
                        <Text className="text-base font-semibold text-gray-900">
                            #{order.productorderid?.slice(-5).toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className={`px-3 py-1 rounded-full border ${getStatusColor(order.orderstatus)} mr-2`}>
                            <Text className="text-xs font-medium capitalize">
                                {order.orderstatus}
                            </Text>
                        </View>
                        {order.isdailymilkuser && (
                            <Icon name="cow" size={16} color="#8B4513" />
                        )}
                    </View>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm text-gray-600">
                        {formatDate(order.ordertime)}
                    </Text>
                    <Text className="text-lg font-bold text-gray-900">
                        ₹{order.itemtotal}
                    </Text>
                </View>

                {/* Order Preview Images */}
                <View className="mt-3">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                            <Icon name="package-variant" size={16} color="#6B7280" />
                            <Text className="text-sm text-gray-600 ml-2">
                                {totalItems} item{totalItems !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {/* Maps Button */}
                        {order.latitude && order.longitude && (
                            <TouchableOpacity
                                onPress={() => openMaps(order.latitude, order.longitude)}
                                className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full"
                            >
                                <Icon name="map-marker" size={14} color="#3B82F6" />
                                <Text className="text-xs text-blue-600 ml-1">View on Map</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                        {orderItems.slice(0, 5).map((item, index) => (
                            <View key={index} className="relative mr-2">
                                <Image
                                    source={{
                                        uri: getImageUri(item.imageurl) || getImageUri(item.product?.imageurl) || 'https://placehold.co/100x100/png?text=No+Image'
                                    }}
                                    className="w-16 h-16 rounded-lg"
                                    resizeMode="cover"
                                />
                                {index === 4 && totalItems > 5 && (
                                    <View className="absolute inset-0 bg-black/50 rounded-lg justify-center items-center">
                                        <Text className="text-white text-xs font-bold">+{totalItems - 5}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Admin Actions */}
                <AdminActions />
            </TouchableOpacity>



            {expanded && (
                <View className="p-4 bg-gray-50">
                    {/* Delivery Address */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-2">Delivery Address</Text>
                        <View className="bg-white p-3 rounded-lg border border-gray-200">
                            <Text className="text-sm text-gray-700">{order.deliveryaddress}</Text>
                            <Text className="text-sm text-gray-700">
                                {order.deliverycity}, {order.deliverystate} - {order.deliverypincode}
                            </Text>
                            {order.latitude && order.longitude && (
                                <TouchableOpacity
                                    onPress={() => openMaps(order.latitude, order.longitude)}
                                    className="flex-row items-center mt-2"
                                >
                                    <Icon name="map-marker" size={14} color="#3B82F6" />
                                    <Text className="text-xs text-blue-600 ml-1">Open in Google Maps</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Order Items with Detailed Pricing */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-2">Order Items</Text>
                        {orderItems.map((item, index) => {
                            const itemTotal = calculateItemTotal(item);
                            return (
                                <View key={index} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                                    <View className="flex-row items-center">
                                        <Image
                                            source={{
                                                uri: getImageUri(item.imageurl) || getImageUri(item.product?.imageurl) || 'https://placehold.co/60x60/png?text=No+Image'
                                            }}
                                            className="w-12 h-12 rounded-md mr-3"
                                            resizeMode="cover"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                                                {item.productname}
                                            </Text>
                                            {item.variantname && (
                                                <Text className="text-xs text-gray-500">Variant: {item.variantname}</Text>
                                            )}
                                            <View className="flex-row justify-between mt-1">
                                                <Text className="text-xs text-gray-500">₹{item.price} × {item.orderquantity}</Text>
                                                <Text className="text-sm font-semibold text-gray-900">₹{itemTotal}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Price Breakdown */}
                    <View className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-2">Price Details</Text>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm text-gray-600">Item Total</Text>
                            <Text className="text-sm text-gray-600">₹{order.itemtotal}</Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm text-gray-600">Delivery Charge</Text>
                            <Text className="text-sm text-gray-600">₹{order.deliverycharge}</Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm text-gray-600">Tax</Text>
                            <Text className="text-sm text-gray-600">₹{order.tax}</Text>
                        </View>
                        <View className="border-t border-gray-200 pt-2 mt-2">
                            <View className="flex-row justify-between">
                                <Text className="text-base font-semibold text-gray-900">Total Amount</Text>
                                <Text className="text-base font-semibold text-gray-900">
                                    ₹{order.itemtotal + order.deliverycharge + order.tax}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Order Timeline */}
                    <View className="mt-4">
                        <Text className="text-sm font-semibold text-gray-800 mb-3">Order Timeline</Text>
                        <View className="space-y-4">
                            {order.orderplaced && (
                                <View className="flex-row">
                                    <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-sm text-gray-700">Order Placed</Text>
                                        <Text className="text-xs text-gray-500">{formatDate(order.orderpalcedtime)}</Text>
                                        <Text className="text-xs text-green-600">✓ Completed</Text>
                                    </View>
                                </View>
                            )}

                            {order.orderconfirmed && (
                                <View className="flex-row">
                                    <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-sm text-gray-700">Order Confirmed</Text>
                                        <Text className="text-xs text-gray-500">{formatDate(order.orderconfirmedtime)}</Text>
                                        {order.orderplaced && (
                                            <Text className="text-xs text-blue-600">
                                                Time taken: {getTimeDifference(order.orderpalcedtime, order.orderconfirmedtime)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {order.orderpacked && (
                                <View className="flex-row">
                                    <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-sm text-gray-700">Packed</Text>
                                        <Text className="text-xs text-gray-500">{formatDate(order.orderpackedtime)}</Text>
                                        {order.orderconfirmed && (
                                            <Text className="text-xs text-blue-600">
                                                Time taken: {getTimeDifference(order.orderconfirmedtime, order.orderpackedtime)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {order.orderoutofdelivery && (
                                <View className="flex-row">
                                    <Icon name="truck" size={16} color="#3B82F6" className="mt-1" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-sm text-gray-700">Out for Delivery</Text>
                                        <Text className="text-xs text-gray-500">{formatDate(order.orderoutofdeliverytime)}</Text>
                                        {order.orderpacked && (
                                            <Text className="text-xs text-blue-600">
                                                Time taken: {getTimeDifference(order.orderpackedtime, order.orderoutofdeliverytime)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {order.orderdelivered && (
                                <View className="flex-row">
                                    <Icon name="check-circle" size={16} color="#10B981" className="mt-1" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-sm text-gray-700">Delivered</Text>
                                        <Text className="text-xs text-gray-500">{formatDate(order.orderdeliveredtime)}</Text>
                                        {order.orderoutofdelivery && (
                                            <Text className="text-xs text-green-600">
                                                Delivered in: {getTimeDifference(order.orderoutofdeliverytime, order.orderdeliveredtime)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {order.ordercancelled && (
                                <View className="flex-row">
                                    <Icon name="close-circle" size={16} color="#EF4444" className="mt-1" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-sm text-gray-700">Cancelled</Text>
                                        <Text className="text-xs text-gray-500">{formatDate(order.ordercancelledtime)}</Text>
                                        {order.ordercancelledreason && (
                                            <Text className="text-xs text-red-500">
                                                Reason: {order.ordercancelledreason}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}


            {/* Cancel Order Modal */}
            <Modal visible={showCancelModal} transparent animationType="slide">
                <View className="flex-1 justify-center items-center  bg-opacity-50 p-4">
                    <View className="bg-white w-full max-w-md rounded-xl p-6">
                        <Text className="text-xl font-bold text-gray-800 mb-4">Cancel Order</Text>

                        <Text className="text-sm text-gray-600 mb-4">
                            Are you sure you want to cancel this order? This action cannot be undone.
                        </Text>

                        <Text className="text-sm font-medium text-gray-700 mb-2">Cancellation Reason:</Text>
                        <TextInput
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            placeholder="Enter reason for cancellation"
                            multiline
                            numberOfLines={3}
                            className="border border-gray-300 rounded-lg p-3 text-gray-800 mb-4"
                        />

                        <View className="flex-row space-x-3">
                            <TouchableOpacity
                                onPress={() => setShowCancelModal(false)}
                                className="flex-1 bg-gray-300 p-3 rounded-lg"
                            >
                                <Text className="text-gray-800 font-medium text-center">Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={cancelOrder}
                                className="flex-1 bg-red-600 p-3 rounded-lg"
                            >
                                <Text className="text-white font-medium text-center">Confirm Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Footer Actions */}
            <View className="p-4 bg-gray-50 border-t border-gray-100">
                <TouchableOpacity
                    onPress={() => {
                        setExpanded(!expanded);
                        if (hasNewUpdates) markAsViewed();
                    }}
                    className="flex-row items-center justify-center"
                >
                    <Text className="text-blue-600 font-medium mr-2">
                        {expanded ? 'Show Less' : 'View Details'}
                    </Text>
                    <Icon
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#3B82F6"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default OrderCard;