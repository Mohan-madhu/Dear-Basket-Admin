import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_CONFIG = {
  0: {
    label: 'Not Returned',
    icon: 'close-circle-outline',
    wrap: 'bg-red-950 border-red-800',
    text: 'text-red-300',
    color: '#fca5a5',
  },
  1: {
    label: 'Returned',
    icon: 'bottle-soda-classic-outline',
    wrap: 'bg-emerald-950 border-emerald-800',
    text: 'text-emerald-300',
    color: '#6ee7b7',
  },
  2: {
    label: 'Damaged',
    icon: 'alert-circle-outline',
    wrap: 'bg-amber-950 border-amber-800',
    text: 'text-amber-300',
    color: '#fcd34d',
  },
};

export default function DailyMilkCanStatusBadge({ value, compact = false }) {
  if (value === null || value === undefined || value === '') return null;

  const status = STATUS_CONFIG[Number(value)];
  if (!status) return null;

  return (
    <View className={`flex-row items-center border rounded-md ${status.wrap} ${compact ? 'px-1.5 py-0.5 mt-1' : 'px-2 py-1 mt-1'}`}>
      <MaterialCommunityIcons name={status.icon} size={compact ? 11 : 14} color={status.color} />
      <Text className={`${status.text} font-semibold ml-1 ${compact ? 'text-[8px]' : 'text-[10px]'}`} numberOfLines={1}>
        {status.label}
      </Text>
    </View>
  );
}
