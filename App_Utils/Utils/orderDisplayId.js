const isKitchenOrder = (order) =>
  Number(order?.isdailymilkuser) === 4 ||
  String(order?.order_type || order?.ordertype || '').trim().toLowerCase() === 'kitchen_order';

export const usesCompactCustomerOrderId = (order) =>
  Number(order?.isdailymilkuser) === 0 || isKitchenOrder(order);

export const getRawOrderId = (order) =>
  order?.dailymilkorderid ||
  order?.productorderid ||
  order?.orderid ||
  order?.transid ||
  '';

export const formatCustomerOrderId = (order, options = {}) => {
  const rawId = String(options.fallbackId || getRawOrderId(order) || '').trim();
  if (!rawId) return options.emptyValue || 'N/A';

  if (usesCompactCustomerOrderId(order)) {
    return `#${rawId.slice(-5).toUpperCase()}`;
  }

  return options.prefixOtherIds ? `#${rawId}` : rawId;
};
