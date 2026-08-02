import NowInIST from "../Services/DateService";
import { Config } from "../../config";

export const DELIVERY_TYPE = {
  MORNING: "Morning",
  EVENING: "Evening",
};

export const DAILY_MILK_DELIVERY_SCHEDULE = {
  [DELIVERY_TYPE.MORNING]: {
    startHour: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.startHour ?? 7,
    startMinute: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.startMinute ?? 0,
    endHour: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.endHour ?? 9,
    endMinute: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.endMinute ?? 0,
    cutoffHour: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.cutoffHour ?? 21,
    cutoffMinute: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.cutoffMinute ?? 30,
    deliveryOffsetBeforeCutoff: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.deliveryOffsetBeforeCutoff ?? 1,
    deliveryOffsetAfterCutoff: Config.DAILY_MILK_DELIVERY_PROMISE?.Morning?.deliveryOffsetAfterCutoff ?? 2,
  },
  [DELIVERY_TYPE.EVENING]: {
    startHour: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.startHour ?? 17,
    startMinute: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.startMinute ?? 0,
    endHour: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.endHour ?? 19,
    endMinute: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.endMinute ?? 0,
    cutoffHour: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.cutoffHour ?? 16,
    cutoffMinute: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.cutoffMinute ?? 30,
    deliveryOffsetBeforeCutoff: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.deliveryOffsetBeforeCutoff ?? 0,
    deliveryOffsetAfterCutoff: Config.DAILY_MILK_DELIVERY_PROMISE?.Evening?.deliveryOffsetAfterCutoff ?? 1,
  },
};

export const pad2 = (value) => String(value).padStart(2, "0");

export const formatDateForApi = (date) => {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  return `${year}-${month}-${day}`;
};

export const formatDateKey = (date) => formatDateForApi(date).replace(/-/g, "");

export const getRelativeDayLabel = (offset) => {
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  if (offset === 2) return "day after tomorrow";
  return `in ${offset} days`;
};

export const normalizeDeliveryType = (deliveryType) => {
  const normalized = String(deliveryType || "").trim().toLowerCase();

  if (normalized === "evening") return DELIVERY_TYPE.EVENING;
  return DELIVERY_TYPE.MORNING;
};

export const getDailyMilkOrderDate = (deliveryType) => {
  const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
  const schedule = DAILY_MILK_DELIVERY_SCHEDULE[normalizedDeliveryType];
  const date = NowInIST();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  const cutoffMinutes = schedule.cutoffHour * 60 + (schedule.cutoffMinute || 0);
  const isAfterCutoff = currentMinutes >= cutoffMinutes;
  const deliveryOffset = isAfterCutoff
    ? schedule.deliveryOffsetAfterCutoff
    : schedule.deliveryOffsetBeforeCutoff;
  const cutoffOffset = isAfterCutoff ? 1 : 0;

  date.setUTCDate(date.getUTCDate() + deliveryOffset);

  return {
    date,
    hour,
    minute,
    isAfterCutoff,
    cutoffOffset,
    deliveryOffset,
    orderdate: formatDateForApi(date),
    orderDateKey: formatDateKey(date),
    deliveryType: normalizedDeliveryType,
    schedule,
  };
};

export const formatHourLabel = (hour24, minute = 0) => {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${pad2(minute)} ${period}`;
};

export const getDailyMilkDeliveryPromise = (deliveryType) => {
  const orderInfo = getDailyMilkOrderDate(deliveryType);
  const cutoffTime = formatHourLabel(
    orderInfo.schedule.cutoffHour,
    orderInfo.schedule.cutoffMinute || 0
  );
  const startTime = formatHourLabel(
    orderInfo.schedule.startHour,
    orderInfo.schedule.startMinute || 0
  );
  const endTime = formatHourLabel(
    orderInfo.schedule.endHour,
    orderInfo.schedule.endMinute || 0
  );
  const orderDayLabel = getRelativeDayLabel(orderInfo.cutoffOffset);
  const deliveryDayLabel = getRelativeDayLabel(orderInfo.deliveryOffset);

  return {
    ...orderInfo,
    cutoffTime,
    startTime,
    endTime,
    orderDayLabel,
    deliveryDayLabel,
    headline: `Order before ${cutoffTime} ${orderDayLabel} & get it by ${deliveryDayLabel} ${startTime}`,
  };
};
