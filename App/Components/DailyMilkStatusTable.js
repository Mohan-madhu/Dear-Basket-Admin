import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Icon from "react-native-vector-icons/FontAwesome";
const MilkStatusTable = ({ data, embedded = false }) => {
  const calculateExtraAmount = (item) => {
    if (!item.extra) return 0;
    return (item.amount / item.quantity) * item.extra;
  };

  let statusIcon = 'check-circle';
  let statusColor = '#9ca3af';
  let statusText = 'No Data';

  //console.log("Milk Status Data:", data);
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
      if (item.cancelled) return acc;

      const extraAmount = calculateExtraAmount(item);
      const totalAmount = item.amount + extraAmount;

      return {
        totalAmount: acc.totalAmount + totalAmount,
        totalLitres: acc.totalLitres + item.quantity + (item.extra || 0),
        receivedAmount: acc.receivedAmount + (item.received ? totalAmount : 0),
        receivedLitres:
          acc.receivedLitres +
          (item.received ? item.quantity + (item.extra || 0) : 0),
      };
    },
    { totalAmount: 0, totalLitres: 0, receivedAmount: 0, receivedLitres: 0 }
  );

  const remainingAmount = metrics?.totalAmount - metrics?.receivedAmount;
  const remainingLitres = metrics?.totalLitres - metrics?.receivedLitres;

  if (embedded) {
    return (
      <View className="bg-gray-900 px-3 py-3">
        <View className="flex-row mb-3">
          <View className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 mr-1">
            <Text className="text-[10px] text-gray-400">Total</Text>
            <Text className="text-sm font-black text-blue-300 mt-0.5">{metrics.totalLitres.toFixed(1)} L</Text>
            <Text className="text-[10px] text-gray-500">₹{metrics.totalAmount.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 mx-1">
            <Text className="text-[10px] text-gray-400">Received</Text>
            <Text className="text-sm font-black text-green-300 mt-0.5">{metrics.receivedLitres.toFixed(1)} L</Text>
            <Text className="text-[10px] text-gray-500">₹{metrics.receivedAmount.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 ml-1">
            <Text className="text-[10px] text-gray-400">Remaining</Text>
            <Text className="text-sm font-black text-amber-300 mt-0.5">{remainingLitres.toFixed(1)} L</Text>
            <Text className="text-[10px] text-gray-500">₹{remainingAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View className="flex-row bg-gray-800 border border-gray-700 rounded-t-lg px-2 py-2">
          <Text className="text-[10px] font-bold text-gray-400 flex-[1.5]">DATE</Text>
          <Text className="text-[10px] font-bold text-gray-400 flex-1 text-center">MILK</Text>
          <Text className="text-[10px] font-bold text-gray-400 flex-1 text-center">AMOUNT</Text>
          <Text className="text-[10px] font-bold text-gray-400 flex-1 text-right">STATUS</Text>
        </View>

        {(Array.isArray(data) ? data : []).map((item, index) => {
          const cancelled = item?.cancelled != null;
          const received = item?.received != null;
          const quantity = Number(item?.quantity || 0);
          const extra = Number(item?.extra || 0);
          const amount = Number(item?.amount || 0);
          const extraAmount = calculateExtraAmount(item);

          return (
            <View
              key={`${item?.date || "date"}-${index}`}
              className={`flex-row items-center px-2 py-2.5 border-b border-x border-gray-700 ${cancelled ? "bg-red-950" : "bg-gray-900"}`}
            >
              <Text className={`text-[11px] flex-[1.5] ${cancelled ? "text-red-300" : "text-gray-200"}`}>
                {item?.date || "N/A"}
              </Text>
              <View className="flex-1 items-center">
                <Text className={`text-[11px] font-semibold ${cancelled ? "text-red-400" : "text-gray-200"}`}>
                  {cancelled ? "-" : `${quantity} L`}
                </Text>
                {!cancelled && extra > 0 ? <Text className="text-[10px] text-green-400">+{extra} L</Text> : null}
              </View>
              <View className="flex-1 items-center">
                <Text className={`text-[11px] font-semibold ${cancelled ? "text-red-400" : "text-gray-200"}`}>
                  {cancelled ? "-" : `₹${amount.toFixed(2)}`}
                </Text>
                {!cancelled && extra > 0 ? <Text className="text-[10px] text-green-400">+₹{extraAmount.toFixed(2)}</Text> : null}
              </View>
              <View className="flex-1 items-end">
                <View className={`flex-row items-center px-2 py-1 rounded-full ${cancelled ? "bg-red-900" : received ? "bg-green-900" : "bg-amber-900"}`}>
                  <MaterialIcons
                    name={cancelled ? "block" : received ? "check" : "schedule"}
                    size={11}
                    color={cancelled ? "#fca5a5" : received ? "#86efac" : "#fcd34d"}
                  />
                  <Text className={`text-[9px] font-bold ml-1 ${cancelled ? "text-red-200" : received ? "text-green-200" : "text-amber-200"}`}>
                    {cancelled ? "Cancelled" : received ? "Done" : "Pending"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

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

      <ScrollView
        className="bg-white rounded-b-lg shadow-sm"
        scrollEnabled={!embedded}
        nestedScrollEnabled={!embedded}
      >
        {data?.map((item, index) => (
          <Animated.View
            key={item.date + index}
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
                {item.cancelled && (
                  <Text className="text-xs italic"> (Cancelled)</Text>
                )}
              </Text>
            </View>


            <View className="flex-1 items-center justify-center">
              {item.cancelled ? (
                <Text className="text-red-500">-</Text>
              ) : (
                <>
                  <Text className="text-center">{item.quantity}</Text>
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
                  <Text className="text-center">₹{item.amount.toFixed(2)}</Text>
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

                  {/* Container status icons  color="#10B981"*/}
                  {item.cans_returned === 1 && ( // Can Returned
                    <FontAwesome5 name="wine-bottle" size={16}  />
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
                  {/* <MaterialIcons name="close" size={20} color="#EF4444" /> */}
                  <FontAwesome5 name="times-circle" size={20} color="#DC2626" solid />
                  {/* Grocery status icon */}
                  {item.groery_status !== "NO_GROCERY_ORDER" && (
                    <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                  )}

                  {/* Container status icons */}
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
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

export default MilkStatusTable;
