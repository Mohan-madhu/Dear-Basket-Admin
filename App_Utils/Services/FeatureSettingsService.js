import { API } from "./APIService";
import Storage from "./StorageService";

export const FEATURE_KEYS = {
  DEMO_DAILY_MILK: "demo_daily_milk_enabled",
  DAILY_MILK: "daily_milk_enabled",
  DEAR_KITCHEN: "dear_kitchen_enabled",
  FAST_DELIVERY: "fast_delivery_enabled",
  DAILY_MILK_GROCERY: "daily_milk_grocery_enabled",
};

export const FEATURE_LABELS = {
  [FEATURE_KEYS.DEMO_DAILY_MILK]: "Demo Daily Milk",
  [FEATURE_KEYS.DAILY_MILK]: "Daily Milk",
  [FEATURE_KEYS.DEAR_KITCHEN]: "Dear Kitchen",
  [FEATURE_KEYS.FAST_DELIVERY]: "Fast Delivery",
  [FEATURE_KEYS.DAILY_MILK_GROCERY]: "Daily Milk Grocery",
};

export const DEFAULT_FEATURE_SETTINGS = {
  [FEATURE_KEYS.DEMO_DAILY_MILK]: true,
  [FEATURE_KEYS.DAILY_MILK]: true,
  [FEATURE_KEYS.DEAR_KITCHEN]: true,
  [FEATURE_KEYS.FAST_DELIVERY]: true,
  [FEATURE_KEYS.DAILY_MILK_GROCERY]: true,
};

const CACHE_KEY = "ADMIN_FEATURE_SETTINGS";

const toBool = (value, fallback = true) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
};

const normalizeSettings = (payload) => {
  const rows = Array.isArray(payload?.Response)
    ? payload.Response
    : Array.isArray(payload)
      ? payload
      : [];

  const next = { ...DEFAULT_FEATURE_SETTINGS };

  rows.forEach((row) => {
    const key = row?.settingkey || row?.setting_key || row?.key || row?.name;
    if (!key || !(key in next)) return;
    next[key] = toBool(row?.settingvalue ?? row?.setting_value ?? row?.value ?? row?.enabled);
  });

  return next;
};

export const getFeatureSettings = async ({ fresh = false } = {}) => {
  try {
    if (!fresh) {
      const cached = await Storage.getData(CACHE_KEY);
      if (cached && typeof cached === "object") {
        return { ...DEFAULT_FEATURE_SETTINGS, ...cached };
      }
    }

    const request = fresh && API.GET_FRESH ? API.GET_FRESH : API.GET;
    const res = await request("AdminSettings/features");
    const settings = normalizeSettings(res);
    await Storage.storeData(CACHE_KEY, settings);
    return settings;
  } catch (error) {
    const cached = await Storage.getData(CACHE_KEY);
    if (cached && typeof cached === "object") {
      return { ...DEFAULT_FEATURE_SETTINGS, ...cached };
    }
    return DEFAULT_FEATURE_SETTINGS;
  }
};

export const isFeatureEnabled = (settings, key) =>
  toBool(settings?.[key], DEFAULT_FEATURE_SETTINGS[key] ?? true);

export const saveFeatureSetting = async (key, enabled, updatedBy) => {
  const payload = {
    settingkey: key,
    settingvalue: enabled ? "1" : "0",
    settinggroup: "FEATURE",
    settinglabel: FEATURE_LABELS[key] || key,
    luu: updatedBy || "ADMIN",
  };

  await API.PUT("AdminSettings/features", payload);
  const current = await getFeatureSettings();
  const next = { ...current, [key]: !!enabled };
  await Storage.storeData(CACHE_KEY, next);
  return next;
};
