import { v4 as uuidv4 } from "uuid";
import { Config } from "../../../../config";

const normalizeText = (value) => String(value || "").trim();
const DEAR_KITCHEN_DELIVERY_CHARGE = Number(Config.DEAR_KITCHEN_DELIVERY_CHARGE || 0);
const DEAR_KITCHEN_TAX_PERCENTAGE = Number(Config.DEAR_KITCHEN_TAX_PERCENTAGE || 0);

export const getDearKitchenCartItems = (cart = []) =>
  (Array.isArray(cart) ? cart : []).filter((item) => item?.source === "dearkitchen");

export const getDearKitchenOrderTotals = (cart = []) => {
  const items = getDearKitchenCartItems(cart);

  const itemSummary = items.reduce(
    (summary, item) => {
      const quantity = Number(item.orderquantity) || 0;
      const price = Number(item.price) || 0;

      return {
        count: summary.count + quantity,
        itemTotal: summary.itemTotal + quantity * price,
      };
    },
    { count: 0, itemTotal: 0 }
  );

  const tax = (itemSummary.itemTotal * DEAR_KITCHEN_TAX_PERCENTAGE) / 100;
  const totalAmount = itemSummary.itemTotal + DEAR_KITCHEN_DELIVERY_CHARGE + tax;

  return {
    ...itemSummary,
    deliveryCharge: DEAR_KITCHEN_DELIVERY_CHARGE,
    taxPercentage: DEAR_KITCHEN_TAX_PERCENTAGE,
    tax,
    totalAmount,
  };
};

export const buildDearKitchenOrderId = () => `DK-${uuidv4()}`;

export const buildDearKitchenOrderPayload = ({
  userData,
  kitchenId,
  slotId,
  mealTypeId,
  deliveryDate,
  address,
  city,
  state,
  pincode,
  latitude,
  longitude,
  specialInstructions,
  cart,
}) => {
  const totals = getDearKitchenOrderTotals(cart);
  const items = getDearKitchenCartItems(cart);
  const nowName = normalizeText(userData?.name || userData?.username || "Dear Kitchen User");

  return {
    userid: userData?.transid || userData?.userid || userData?.id || null,
    kitchenid: kitchenId || null,
    slotid: slotId || null,
    mealtypeid: mealTypeId || null,
    deliverydate: deliveryDate || null,
    itemtotal: totals.itemTotal,
    deliverycharge: totals.deliveryCharge,
    tax: totals.tax,
    deliveryaddress: normalizeText(address),
    deliverycity: normalizeText(city),
    deliverystate: normalizeText(state),
    deliverypincode: normalizeText(pincode),
    latitude: normalizeText(latitude),
    longitude: normalizeText(longitude),
    specialinstructions: normalizeText(specialInstructions),
    totalamount: totals.totalAmount,
    paymentmode: "COD",
    rcu: nowName,
    orderdata: JSON.stringify(items),
  };
};   

export const buildDearKitchenOrderItems = ({ orderId, cart, userData }) => {
  const nowName = normalizeText(userData?.name || userData?.username || "Dear Kitchen User");

  return getDearKitchenCartItems(cart).map((item) => ({
    orderid: orderId,
    itemid: item?.itemid || item?.variantid || item?.id || null,
    quantity: Number(item?.orderquantity) || 1,
    rcu: nowName,
  }));
};
