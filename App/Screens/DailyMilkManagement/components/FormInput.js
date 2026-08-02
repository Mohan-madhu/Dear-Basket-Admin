import React from "react";
import { Text, TextInput, View } from "react-native";

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}) {
  return (
    <View className="mb-4">
      <Text className="text-slate-300 text-xs font-bold uppercase tracking-wide mb-2">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        multiline={multiline}
        className={`rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white ${
          multiline ? "min-h-[92px]" : ""
        }`}
      />
    </View>
  );
}
