import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Icon from "react-native-vector-icons/FontAwesome";
import { getDailyMilkCancellationReason, isDailyMilkCancelled } from "../../App_Utils/Utils/dailyMilkCancellation";
import DailyMilkCanStatusBadge from "./DailyMilkCanStatusBadge";
const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const hasAdjustedQuantity = (item) =>
  item?.adjustedquantity !== null &&
  item?.adjustedquantity !== undefined &&
  item?.adjustedquantity !== "";
const getRegularQuantity = (item) =>
  hasAdjustedQuantity(item) ? toNumber(item.adjustedquantity) : toNumber(item?.quantity);
const getUnitPrice = (item) => {
  const originalQty = toNumber(item?.quantity);
  const amount = toNumber(item?.amount);
  return originalQty > 0 ? amount / originalQty : 0;
};
const MilkStatusTable_Admin = ({ data }) => {
  const calculateExtraAmount = (item) => {
    if (!item.extra) return 0;
    return getUnitPrice(item) * toNumber(item.extra);
  };

  function formatLocalTime(raw) {
    const time = raw.slice(11, 16); // "23:06"
    let [hour, minute] = time.split(":");

    hour = Number(hour);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;

    return `${h}:${minute} ${ampm}`;
  }

  // Calculate metrics
  const metrics = data?.reduce(
    (acc, item) => {
      if (isDailyMilkCancelled(item.cancelled)) return acc;

      const regularQuantity = getRegularQuantity(item);
      const extraAmount = calculateExtraAmount(item);
      const totalAmount = (getUnitPrice(item) * regularQuantity) + extraAmount;

      return {
        totalAmount: acc.totalAmount + totalAmount,
        totalLitres: acc.totalLitres + regularQuantity + (item.extra || 0),
        receivedAmount: acc.receivedAmount + (item.received ? totalAmount : 0),
        receivedLitres:
          acc.receivedLitres +
          (item.received ? regularQuantity + (item.extra || 0) : 0),
      };
    },
    { totalAmount: 0, totalLitres: 0, receivedAmount: 0, receivedLitres: 0 }
  );

  const remainingAmount = metrics?.totalAmount - metrics?.receivedAmount;
  const remainingLitres = metrics?.totalLitres - metrics?.receivedLitres;

  return (
    <View className="flex-1 p-4 bg-gray-50 rounded-xl">
      <Text className="text-lg font-semibold mb-2">Daily Milk Status :</Text>

      <View className="flex-row flex-wrap justify-between mb-4">

        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-3">
          <Text className="text-gray-500 text-sm">Total Amount</Text>
          <Text className="text-2xl font-bold text-indigo-600">
            ₹{metrics?.totalAmount.toFixed(2)}
          </Text>
        </View>


        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-3">
          <Text className="text-gray-500 text-sm">Total Litres</Text>
          <Text className="text-2xl font-bold text-indigo-600">
            {metrics?.totalLitres.toFixed(1)} L
          </Text>
        </View>


        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm">
          <Text className="text-gray-500 text-sm">Received Amount</Text>
          <Text className="text-2xl font-bold text-green-600">
            ₹{metrics?.receivedAmount.toFixed(2)}
          </Text>
        </View>


        <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm">
          <Text className="text-gray-500 text-sm">Received Litres</Text>
          <Text className="text-2xl font-bold text-green-600">
            {metrics?.receivedLitres.toFixed(1)} L
          </Text>
        </View>
      </View>


      <View className="bg-white p-4 rounded-xl shadow-sm mb-4">
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-gray-500 text-sm">Remaining Amount</Text>
            <Text
              className={`text-xl font-bold ${remainingAmount > 0 ? "text-amber-600" : "text-green-600"
                }`}
            >
              ₹{remainingAmount.toFixed(2)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-sm">Remaining Litres</Text>
            <Text
              className={`text-xl font-bold ${remainingLitres > 0 ? "text-amber-600" : "text-green-600"
                }`}
            >
              {remainingLitres.toFixed(1)} L
            </Text>
          </View>
        </View>
      </View>

      <Animated.View
        entering={FadeIn.duration(300)}
        className="flex-row border-b border-gray-200 py-3 bg-gray-100"
      >
        <Text className="font-bold text-center flex-[1.5]">Date</Text>
        <Text className="font-bold text-center flex-1">Liter</Text>
        <Text className="font-bold text-center flex-[1.2]">Amount</Text>
        <Text className="font-bold text-center flex-1">Status</Text>
      </Animated.View>

      <ScrollView className="bg-white rounded-b-lg shadow-sm">
        {data?.map((item, index) => {
          const regularQuantity = getRegularQuantity(item);
          const originalQuantity = toNumber(item?.quantity);
          const reduced = hasAdjustedQuantity(item) && regularQuantity < originalQuantity;
          const regularAmount = getUnitPrice(item) * regularQuantity;

          return (
          <Animated.View
            key={item.date}
            entering={FadeInDown.delay(index * 50).duration(300)}
            className={`flex-row border-b border-gray-100 py-3 ${item.cancelled ? "bg-red-50" : ""
              }`}
          >

            <View className="flex-[1.5] justify-center">
              <Text
                className={`text-center ${item.cancelled ? "text-red-500" : ""
                  }`}
              >
                {item.date}
                {isDailyMilkCancelled(item.cancelled) && (
                  <Text className="text-xs italic">
                    {` (Cancelled${getDailyMilkCancellationReason(item.cancelled) ? `: ${getDailyMilkCancellationReason(item.cancelled)}` : ''})`}
                  </Text>
                )}
              </Text>
            </View>


            <View className="flex-1 items-center justify-center">
              {item.cancelled ? (
                <Text className="text-red-500">-</Text>
              ) : (
                <>
                  <Text className="text-center">{regularQuantity}</Text>
                  {reduced && (
                    <Text className="text-amber-600 text-xs">
                      from {originalQuantity}
                    </Text>
                  )}
                  {item.extra && item.extra > 0 && (
                    <Text className="text-green-500 text-sm">
                      +{item.extra}
                    </Text>
                  )}
                </>
              )}
            </View>


            <View className="flex-[1.2] items-center justify-center">
              {item.cancelled ? (
                <Text className="text-red-500">-</Text>
              ) : (
                <>
                  <Text className="text-center">₹{regularAmount.toFixed(2)}</Text>
                  {item.extra && item.extra > 0 && (
                    <Text className="text-green-500 text-sm">
                      +₹{calculateExtraAmount(item).toFixed(2)}
                    </Text>
                  )}
                </>
              )}
            </View>


            {/* <View className="flex-1 items-center justify-center">
              {item.cancelled ? (
                <Text className="text-red-500 text-xs italic">-</Text>
              ) : item.received ? (
                <View className="items-center">
                  <MaterialIcons name="check" size={20} color="#10B981" />
                  {item.receivedtime && (
                    <Text className="text-gray-500 text-xs">
                      {new Date(item.receivedtime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}
                </View>
              ) : (
                <MaterialIcons name="close" size={20} color="#EF4444" />
              )}


            </View> */}

            {/* Status Column */}
            {/* <View className="flex-1 items-center justify-center">
              {item.cancelled ? (
                <Text className="text-red-500 text-xs italic">-</Text>
              ) : item.received ? (
                <View className="items-center">
                  <MaterialIcons name="check" size={20} color="#10B981" />
              
                  {item.cans_returned === 1 && (
                    <FontAwesome5 name="wine-bottle" size={16} color="black" />
                  )}
                  {item.receivedtime && (
                    <Text className="text-gray-500 text-xs">
                      {formatLocalTime(item.receivedtime)}
                    </Text>
                  )}
                  <DailyMilkCanStatusBadge value={item.cans_returned} />
                </View>
              ) : (
                <View className="items-center">
                  <MaterialIcons name="close" size={20} color="#EF4444" />

               


              
                  {item.cans_returned === 1 && (
                    // <MaterialIcons name="local-drink" size={16} color="#3B82F6" /> 
                    <FontAwesome5 name="wine-bottle" size={16} color="black" />
                  )}
                </View>
              )}
            </View> */}




            {/* <View className="flex-1 items-center justify-center">
              {item.cancelled ? (
                <Text className="text-red-500 text-xs italic">-</Text>
              ) : item.received ? (
                <View className="items-center">
                  <MaterialIcons name="check" size={20} color="#10B981" />

                  
                  {item.groery_status !== "NO_GROCERY_ORDER" && (
                    <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                  )}

               
                  {item.cans_returned === 1 && ( // Can Returned
                    <FontAwesome5 name="wine-bottle" size={16} color="#10B981" />
                  )}
                  {item.cans_returned === 2 && ( // Can Damaged
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
                  )}
                  {item.cans_returned === 0 && ( // Can Not Returned
                    <MaterialIcons name="error-outline" size={20} color="#EF4444" />
                  )}
                  {item.receivedtime && (
                    <Text className="text-gray-500 text-xs">
                      {formatLocalTime(item.receivedtime)}
                    </Text>
                  )}
                </View>
              ) : (
                <View className="items-center">
                  <MaterialIcons name="close" size={20} color="#EF4444" />

              
                  {item.groery_status !== "NO_GROCERY_ORDER" && (
                    <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                  )}

            
                  {item.cans_returned === 1 && ( // Can Returned
                    <FontAwesome5 name="wine-bottle" size={16} color="#10B981" />
                  )}
                  {item.cans_returned === 2 && ( // Can Damaged
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F59E0B" />
                  )}
                  {item.cans_returned === 0 && ( // Can Not Returned
                    <MaterialIcons name="error-outline" size={20} color="#EF4444" />
                  )}
                </View>
              )}
            </View> */}

          
            <View className="flex-1 items-center justify-center">
              {item.cancelled ? (

                <Text className="text-red-500 text-xs italic">-</Text>
              ) : item.received ? (
                <View className="items-center">

                  <FontAwesome5 name="check-circle" size={20} color="#10B981" solid className="mb-1" />

                  {/* Grocery status icon */}
                  {item.groery_status !== "NO_GROCERY_ORDER" && (
                    <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                  )}

                  <DailyMilkCanStatusBadge value={item.cans_returned} />
                  {item.receivedtime && (
                    <Text className="text-gray-500 text-xs">
                      {formatLocalTime(item.receivedtime)}
                    </Text>
                  )}
                </View>
              ) : (
                <View className="items-center">
                  {/* <MaterialIcons name="close" size={20} color="#EF4444" /> */}
                  <FontAwesome5 name="times-circle" size={20} color="#DC2626" solid />
                  {/* Grocery status icon */}
                  {item.groery_status !== "NO_GROCERY_ORDER" && (
                    <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                  )}

                  <DailyMilkCanStatusBadge value={item.cans_returned} />
                </View>
              )}
            </View>


          </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default MilkStatusTable_Admin;
