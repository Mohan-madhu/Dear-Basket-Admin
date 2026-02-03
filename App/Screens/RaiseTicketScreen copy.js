import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";

const colors = {
  background: "#F9FAFB",
  text: "#111827",
  card: "#FFFFFF",
  accent: "#10B981",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF4444",
};

export default function RaiseTicketScreen({ navigation }) {
  const [showInfo, setShowInfo] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Title is required";
    if (!category.trim()) e.category = "Category is required";
    if (!priority.trim()) e.priority = "Priority is required";
    if (!description.trim()) e.description = "Please describe the problem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;

    // TODO: Replace with your API call
    const payload = {
      title: title.trim(),
      category: category.trim(),
      priority: priority.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      platform: Platform.OS,
      appVersion: "x.y.z", // inject real version if you track it
    };

    console.log("Ticket payload:", payload);

    // simple UX: go back and maybe show a toast in your app
    navigation.goBack();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
        🛠️ Raise a Ticket
      </Text>
      <Text style={{ color: colors.muted, marginTop: 6 }}>
        Tell us what's going wrong—we’ll take it from here.
      </Text>

      {/* Info Toggle */}
      <TouchableOpacity
        onPress={() => setShowInfo(!showInfo)}
        activeOpacity={0.8}
        style={{
          marginTop: 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.text }}>
          {showInfo ? "ℹ️ Hide" : "ℹ️ How to raise a ticket"}
        </Text>
        {showInfo && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              • Add a clear <Text style={{ fontWeight: "700" }}>Title</Text> (e.g., “Unable to login”).{"\n"}
              • Choose a <Text style={{ fontWeight: "700" }}>Category</Text> (e.g., Login, Payments, UI, Performance).{"\n"}
              • Set <Text style={{ fontWeight: "700" }}>Priority</Text> (Low / Medium / High / Critical).{"\n"}
              • In <Text style={{ fontWeight: "700" }}>Description</Text>, include steps to reproduce, expected vs. actual result, and any error messages.
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Form Card */}
      <View
        style={{
          marginTop: 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Title */}
        <Text style={{ color: colors.text, fontWeight: "700" }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., App crashes on startup"
          placeholderTextColor={colors.muted}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.title ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.title && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>{errors.title}</Text>
        )}

        {/* Category */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>
          Category
        </Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Login / Payments / UI / Performance / Other"
          placeholderTextColor={colors.muted}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.category ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.category && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>
            {errors.category}
          </Text>
        )}

        {/* Priority */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>
          Priority
        </Text>
        <TextInput
          value={priority}
          onChangeText={setPriority}
          placeholder="Low / Medium / High / Critical"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.priority ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        {errors.priority && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>
            {errors.priority}
          </Text>
        )}

        {/* Description */}
        <Text style={{ color: colors.text, fontWeight: "700", marginTop: 16 }}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Steps to reproduce, expected vs. actual, any screenshots or error codes…"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: errors.description ? colors.danger : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: colors.text,
            minHeight: 120,
          }}
        />
        {errors.description && (
          <Text style={{ color: colors.danger, marginTop: 6 }}>
            {errors.description}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmit}
          activeOpacity={0.85}
          style={{
            marginTop: 18,
            backgroundColor: colors.accent,
            paddingVertical: 14,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Submit Ticket
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cancel */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: 14, paddingVertical: 12 }}
      >
        <Text style={{ textAlign: "center", color: colors.muted, fontWeight: "600" }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
