import React from 'react';
import { View, Text, Animated } from 'react-native';
import { FadeIn } from 'react-native-reanimated';

const ViewDailyMilkDeliveryOrdersScreen = () => {
    return (
        <View className="flex-1 justify-center items-center bg-white p-6">
            <Animated.View
                entering={FadeIn.duration(600)}  // Reanimated fade-in effect
                className="flex items-center justify-center"
            >
                <Text className="text-xl font-bold text-gray-700 mb-4">
                    No Daily Milk Delivery Orders
                </Text>
                <Text className="text-center text-gray-500">
                    It looks like you don’t have any orders at the moment.
                    {'\n'}Please check back later or create a new order.
                </Text>
            </Animated.View>
        </View>
    );
};

export default ViewDailyMilkDeliveryOrdersScreen;
