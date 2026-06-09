import { v4 as uuidv4 } from "uuid";

const normalizeText = (value) => String(value || "").trim();

export const getDearKitchenCartItems = (cart = []) =>
  (Array.isArray(cart) ? cart : []).filter((item) => item?.source === "dearkitchen");

export const getDearKitchenOrderTotals = (cart = []) => {
  const items = getDearKitchenCartItems(cart);

  return items.reduce(
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
    deliverycharge: 0,
    deliveryaddress: normalizeText(address),
    deliverycity: normalizeText(city),
    deliverystate: normalizeText(state),
    deliverypincode: normalizeText(pincode),
    latitude: normalizeText(latitude),
    longitude: normalizeText(longitude),
    specialinstructions: normalizeText(specialInstructions),
    totalamount: totals.itemTotal,
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
