import { getImageUrl } from "../../../../config";
import { DearKitchenAPI } from "../../../../App_Utils/Services/APIService";

export const DEAR_KITCHEN_CATEGORY_ID = "dear_kitchen";

const asArray = (payload) => {
  const response = payload?.Response;
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") return [response];
  
  if (Array.isArray(payload)) return payload;
  return [];
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isEnabled = (value) => asNumber(value) === 1;

const getDearKitchen = (endpoint, { fresh = false } = {}) =>
  fresh && DearKitchenAPI.GET_FRESH
    ? DearKitchenAPI.GET_FRESH(endpoint)
    : DearKitchenAPI.GET(endpoint);

export const getKitchenImageUrl = (imagePath) => {
  if (!imagePath || imagePath === "No Image Uploaded") return null;
  if (/^https?:\/\//i.test(String(imagePath))) return imagePath;
  return getImageUrl(String(imagePath).replace(/^\/+/, "").replace("~/", ""));
};

export const normalizeKitchen = (kitchen = {}) => ({
  ...kitchen,
  id: kitchen.kitchenid,
  name: kitchen.kitchenname || "Dear Kitchen",
  description: kitchen.description || "",
  cuisine: kitchen.cuisinetype || "",
  location: [kitchen.city, kitchen.state].filter(Boolean).join(", "),
  addressText: [kitchen.address, kitchen.city, kitchen.state, kitchen.pincode]
    .filter(Boolean)
    .join(", "),
  ratingValue: asNumber(kitchen.rating, 0),
  totalOrdersValue: asNumber(kitchen.totalorders, 0),
  isApproved: isEnabled(kitchen.isapproved),
  isActive: isEnabled(kitchen.isactive),
  isOpen: isEnabled(kitchen.isopen),
  allowsPrebooking: isEnabled(kitchen.allowprebooking),
  isHalal: isEnabled(kitchen.ishalal),
  isPureVeg: isEnabled(kitchen.ispureveg),
  profileImageUrl: getKitchenImageUrl(kitchen.profileimage),
  coverImageUrl: getKitchenImageUrl(kitchen.coverimage),
});

export const normalizeMenuItem = (item = {}) => ({
  ...item,
  id: item.itemid,
  name: item.itemname || "Menu item",
  description: item.description || "",
  price: asNumber(item.price, 0),
  image: getKitchenImageUrl(item.imageurl),
  unit: item.isveg != null ? (isEnabled(item.isveg) ? "Veg" : "Non-veg") : "",
  isVeg: isEnabled(item.isveg),
  isNew: isEnabled(item.isnew),
  isAvailable: item.isavailable == null || isEnabled(item.isavailable),
  isActive: item.isactive == null || isEnabled(item.isactive),
});

export const fetchVisibleKitchens = async () => {
  const res = await DearKitchenAPI.GET("Kitchens");
  return asArray(res)
    .map(normalizeKitchen)
    .filter((kitchen) => kitchen.isApproved && kitchen.isActive);
};

export const fetchKitchenDetailBundle = async (kitchenid, { fresh = false } = {}) => {
  const [kitchenRes, imagesRes, mealTypesRes, timeslotsRes, menuItemsRes] =
    await Promise.all([
      getDearKitchen(`Kitchens/${kitchenid}`, { fresh }),
      getDearKitchen(`KitchenImages/${kitchenid}`, { fresh }),
      getDearKitchen("MealTypes", { fresh }),
      getDearKitchen(`Timeslots/${kitchenid}`, { fresh }),
      getDearKitchen(`MenuItems/${kitchenid}`, { fresh }),
    ]);

  const kitchen = normalizeKitchen(asArray(kitchenRes)[0] || {});
  const images = asArray(imagesRes)
    .filter((image) => image.isactive == null || isEnabled(image.isactive))
    .map((image) => ({
      ...image,
      url: getKitchenImageUrl(image.imageurl),
    }))
    .filter((image) => !!image.url);

  const mealTypes = asArray(mealTypesRes);
  const timeslots = asArray(timeslotsRes).filter(
    (slot) => slot.isactive == null || isEnabled(slot.isactive)
  );
  const menuItems = asArray(menuItemsRes)
    .map(normalizeMenuItem)
    .filter((item) => item.isAvailable && item.isActive);

  return {
    kitchen,
    images,
    mealTypes,
    timeslots,
    menuItems,
  };
};

export const fetchMenuCategories = async (kitchenid, mealtypeid, { fresh = false } = {}) => {
  console.log("Fetching menu categories for kitchenid:", kitchenid, "mealtypeid:", mealtypeid);
  const endpoint = mealtypeid
    ? `MenuCategories/${kitchenid}/${mealtypeid}`
    : `MenuCategories/${kitchenid}`;
  const res = await getDearKitchen(endpoint, { fresh });
  console.log("Fetched menu categories:", res);
  console.log("Raw response for menu categories:", asArray(res).filter(
    (category) => category.isactive == null || isEnabled(category.isactive)));
  return asArray(res).filter(
    (category) => category.isactive == null || isEnabled(category.isactive)
  );
};
