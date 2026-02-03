import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
const MilkStatusTable_Admin = ({ data }) => {
  const calculateExtraAmount = (item) => {
    if (!item.extra) return 0;
    return (item.amount / item.quantity) * item.extra;
  };

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
        {data?.map((item, index) => (
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
                {item.cancelled && (
                  <Text className="text-xs italic"> (Cancelled)</Text>
                )}
              </Text>
            </View>
            {/* erroreee when uncommentedd */}

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



        {/* erroreee when uncommentedd */}
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
            <View className="flex-1 items-center justify-center">
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
                      {new Date(item.receivedtime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
            </View>

          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

export default MilkStatusTable_Admin;
