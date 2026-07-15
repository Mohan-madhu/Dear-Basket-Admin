import NowInIST from "../Services/DateService";

export const DELIVERY_TYPE = {
  MORNING: "Morning",
  EVENING: "Evening",
};

export const DAILY_MILK_DELIVERY_SCHEDULE = {
  [DELIVERY_TYPE.MORNING]: {
    startHour: 7,
    endHour: 9,
    cutoffHour: 6,
  },
  [DELIVERY_TYPE.EVENING]: {
    startHour: 17,
    endHour: 19,
    cutoffHour: 16,
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

  if (hour >= schedule.cutoffHour) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return {
    date,
    hour,
    orderdate: formatDateForApi(date),
    orderDateKey: formatDateKey(date),
    deliveryType: normalizedDeliveryType,
    schedule,
  };
};

export const formatHourLabel = (hour24) => {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:00 ${period}`;
};

export const getDailyMilkDeliveryPromise = (deliveryType) => {
  const orderInfo = getDailyMilkOrderDate(deliveryType);
  const now = NowInIST();
  const deliveryDay =
    formatDateForApi(orderInfo.date) === formatDateForApi(now) ? "today" : "tomorrow";
  const cutoffTime = formatHourLabel(orderInfo.schedule.cutoffHour);
  const startTime = formatHourLabel(orderInfo.schedule.startHour);
  const endTime = formatHourLabel(orderInfo.schedule.endHour);

  return {
    ...orderInfo,
    cutoffTime,
    startTime,
    endTime,
    deliveryDay,
    headline: `Order before ${cutoffTime} & get it by ${startTime} ${deliveryDay}`,
    subtext: `${orderInfo.deliveryType} milk route delivery window ${startTime} - ${endTime}`,
  };
};
