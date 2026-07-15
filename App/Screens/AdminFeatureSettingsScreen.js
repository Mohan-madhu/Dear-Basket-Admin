import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Storage from "../../App_Utils/Services/StorageService";
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  getFeatureSettings,
  isFeatureEnabled,
  saveFeatureSetting,
} from "../../App_Utils/Services/FeatureSettingsService";
import { getUserFacingErrorMessage } from "../../App_Utils/Services/APIService";

const FEATURE_ROWS = [
  {
    key: FEATURE_KEYS.DEMO_DAILY_MILK,
    icon: "flask-outline",
    title: FEATURE_LABELS[FEATURE_KEYS.DEMO_DAILY_MILK],
    subtitle: "Show or hide the demo milk request option for users.",
    color: "#16a34a",
  },
  {
    key: FEATURE_KEYS.DAILY_MILK,
    icon: "calendar-number-outline",
    title: FEATURE_LABELS[FEATURE_KEYS.DAILY_MILK],
    subtitle: "Control Daily Milk booking and renewal entry from the user app.",
    color: "#2563eb",
  },
  {
    key: FEATURE_KEYS.DEAR_KITCHEN,
    icon: "restaurant-outline",
    title: FEATURE_LABELS[FEATURE_KEYS.DEAR_KITCHEN],
    subtitle: "Control the Dear Kitchen food ordering section.",
    color: "#db2777",
  },
  {
    key: FEATURE_KEYS.FAST_DELIVERY,
    icon: "flash-outline",
    title: FEATURE_LABELS[FEATURE_KEYS.FAST_DELIVERY],
    subtitle: "Allow users to choose paid fast grocery delivery.",
    color: "#f59e0b",
  },
  {
    key: FEATURE_KEYS.DAILY_MILK_GROCERY,
    icon: "leaf-outline",
    title: FEATURE_LABELS[FEATURE_KEYS.DAILY_MILK_GROCERY],
    subtitle: "Allow eligible users to combine grocery orders with milk delivery.",
    color: "#059669",
  },
];

const Toggle = ({ enabled, saving }) => (
  <View className={`h-8 w-14 rounded-full p-1 ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
    <View className={`h-6 w-6 rounded-full bg-white items-center justify-center ${enabled ? "ml-6" : "ml-0"}`}>
      {saving ? <ActivityIndicator size="small" color={enabled ? "#059669" : "#64748b"} /> : null}
    </View>
  </View>
);

export default function AdminFeatureSettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const loadSettings = useCallback(async ({ fresh = false } = {}) => {
    try {
      if (!fresh) setLoading(true);
      const next = await getFeatureSettings({ fresh });
      setSettings(next);
    } catch (error) {
      Alert.alert("Settings", getUserFacingErrorMessage(error, "Failed to load feature settings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings({ fresh: true });
  };

  const toggleFeature = async (key) => {
    if (savingKey) return;
    const current = isFeatureEnabled(settings, key);

    try {
      setSavingKey(key);
      setSettings((prev) => ({ ...prev, [key]: !current }));
      const userData = await Storage.getData("DATA");
      const adminId = userData?.transid || userData?.userid || "ADMIN";
      const next = await saveFeatureSetting(key, !current, adminId);
      setSettings(next);
    } catch (error) {
      setSettings((prev) => ({ ...prev, [key]: current }));
      Alert.alert("Settings", getUserFacingErrorMessage(error, "Failed to update this setting."));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      <View className="bg-slate-950 px-4 pt-4 pb-5">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.85}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[22px] font-black text-white">App Settings</Text>
            <Text className="mt-1 text-[12px] font-semibold text-slate-300">
              Enable or disable major user-facing features.
            </Text>
          </View>
        </View>
      </View>

      {loading && !settings ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0f172a" />
          <Text className="mt-2 text-sm font-semibold text-slate-500">Loading settings...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <View className="flex-row">
              <Ionicons name="information-circle-outline" size={20} color="#b45309" />
              <Text className="ml-2 flex-1 text-[12px] font-semibold leading-5 text-amber-800">
                Changes apply to users after the app refreshes settings. Existing orders are not changed.
              </Text>
            </View>
          </View>

          {FEATURE_ROWS.map((feature) => {
            const enabled = isFeatureEnabled(settings, feature.key);
            const saving = savingKey === feature.key;

            return (
              <TouchableOpacity
                key={feature.key}
                activeOpacity={0.9}
                disabled={!!savingKey}
                onPress={() => toggleFeature(feature.key)}
                className={`mb-3 rounded-2xl border bg-white p-4 ${
                  enabled ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${feature.color}18` }}
                  >
                    <Ionicons name={feature.icon} size={23} color={feature.color} />
                  </View>
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <Text className="flex-1 text-[15px] font-black text-slate-950">
                        {feature.title}
                      </Text>
                      <Text className={`text-[11px] font-black ${enabled ? "text-emerald-700" : "text-slate-500"}`}>
                        {enabled ? "ON" : "OFF"}
                      </Text>
                    </View>
                    <Text className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
                      {feature.subtitle}
                    </Text>
                  </View>
                  <Toggle enabled={enabled} saving={saving} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
