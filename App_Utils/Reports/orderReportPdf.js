import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatCustomerOrderId } from "../Utils/orderDisplayId";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const parseJsonRows = (value) => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed;
    return parsed && typeof parsed === "object" ? [parsed] : [];
  } catch {
    return [];
  }
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const orderTimestamp = (order) =>
  firstValue(
    order?.orderplacedtime,
    order?.orderpalcedtime,
    order?.order_placed_time,
    order?.orderplacedat,
    order?.ordertime,
    order?.createdat,
    order?.created_at,
    order?.rcm,
    order?.rcd,
    order?.orderdate
  );

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
};

const getOrderTotal = (order) => {
  const explicit = Number(firstValue(order?.totalamount, order?.ordergrandtotal, order?.amount));
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return (
    Number(order?.itemtotal || 0) +
    Number(order?.deliverycharge || 0) +
    Number(order?.tax || 0)
  );
};

const getOrderItems = (order) => {
  const orderRows = parseJsonRows(order?.orderdata);
  const milkRows = parseJsonRows(order?.dailymilk_json);
  const rows = orderRows.length ? orderRows : milkRows;

  if (!rows.length && firstValue(order?.productname, order?.itemname)) {
    return [{
      productname: firstValue(order?.productname, order?.itemname),
      quantity: firstValue(order?.orderquantity, order?.quantity, 1),
    }];
  }

  return rows.map((row) => {
    const product = row?.product || {};
    return {
      name: firstValue(
        row?.productname,
        row?.itemname,
        row?.milkname,
        row?.name,
        product?.productname,
        product?.itemname,
        product?.name,
        "Item"
      ),
      variant: firstValue(
        row?.variantname,
        row?.mealtypename,
        row?.categoryname,
        product?.variantname,
        product?.unit,
        ""
      ),
      quantity: firstValue(
        row?.orderquantity,
        row?.total_quantity,
        row?.regular_quantity,
        row?.quantity,
        1
      ),
    };
  });
};

const getDeliveryShift = (order) => {
  const rows = [
    ...parseJsonRows(order?.dailymilk_json),
    ...parseJsonRows(order?.orderdata),
  ];
  const candidates = [
    order?.deliverytype,
    order?.milkdeliverytype,
    order?.delivery_type,
    order?.shift,
    order?.batch,
    ...rows.flatMap((row) => [
      row?.deliverytype,
      row?.milkdeliverytype,
      row?.delivery_type,
      row?.shift,
      row?.batch,
    ]),
  ];
  const shifts = candidates
    .filter(Boolean)
    .map((value) => {
      const text = String(value).trim();
      if (/morning/i.test(text)) return "Morning";
      if (/evening/i.test(text)) return "Evening";
      return text;
    })
    .filter((value, index, array) => array.indexOf(value) === index);
  return shifts.join(", ") || "Not specified";
};

const ORDER_TYPE_THEMES = {
  fast: { label: "Fast Grocery", legendClass: "legend-fast" },
  dailyGrocery: { label: "Daily Milk Grocery", legendClass: "legend-daily-grocery" },
  demoMilk: { label: "Demo Daily Milk", legendClass: "legend-demo-milk" },
  milk: { label: "Daily Milk", legendClass: "legend-milk" },
  kitchen: { label: "Kitchen Order", legendClass: "legend-kitchen" },
  default: { label: "Order", legendClass: "legend-default" },
};

const getOrderTypeMeta = (order) => {
  const code = Number(order?.isdailymilkuser);
  if (code === 0) return { key: "fast", ...ORDER_TYPE_THEMES.fast };
  if (code === 1) return { key: "daily-grocery", ...ORDER_TYPE_THEMES.dailyGrocery };
  if (code === 2) return { key: "demo-milk", ...ORDER_TYPE_THEMES.demoMilk };
  if (code === 3) return { key: "milk", ...ORDER_TYPE_THEMES.milk };
  if (
    code === 4 ||
    String(order?.order_type || order?.ordertype || "").toLowerCase() === "kitchen_order"
  ) {
    return { key: "kitchen", ...ORDER_TYPE_THEMES.kitchen };
  }
  return { key: "default", ...ORDER_TYPE_THEMES.default };
};

const renderItems = (order) => {
  const items = getOrderItems(order);
  if (!items.length) return '<div class="empty-value">No item details available</div>';
  return `
    <ol class="items">
      ${items.map((item) => `
        <li>
          <strong>${escapeHtml(item.name || item.productname || "Item")}</strong>
          ${item.variant ? `<span class="variant">${escapeHtml(item.variant)}</span>` : ""}
          <span class="qty">Qty: ${escapeHtml(item.quantity)}</span>
        </li>
      `).join("")}
    </ol>
  `;
};

const renderOrder = (order, index) => {
  const typeMeta = getOrderTypeMeta(order);
  const milkRow = parseJsonRows(order?.dailymilk_json)[0] || {};
  const orderId = firstValue(
    order?.dailymilkorderid,
    order?.productorderid,
    order?.orderid,
    milkRow?.dailymilkorderid,
    milkRow?.productorderid,
    milkRow?.orderid,
    "N/A"
  );
  const displayOrderId = formatCustomerOrderId(order, { fallbackId: orderId });
  const partnerId = firstValue(
    order?.mappedpartnerid,
    order?.partnerid,
    order?.orderdeliveredby,
    order?.orderoutofdeliveryby,
    milkRow?.mappedpartnerid,
    milkRow?.partnerid,
    "Not assigned"
  );
  const userId = firstValue(order?.userid, order?.user_id, milkRow?.userid, "N/A");
  const mobile = firstValue(
    order?.user_mobile,
    order?.usermobile,
    order?.mobile,
    milkRow?.user_mobile,
    milkRow?.mobile,
    "N/A"
  );
  const name = firstValue(
    order?.name,
    order?.username,
    order?.customername,
    milkRow?.name,
    milkRow?.username,
    "N/A"
  );

  return `
    <section class="order-card type-${typeMeta.key}">
      <div class="order-heading">
        <div>
          <div class="order-index">ORDER ${index + 1}</div>
          <div class="order-id">${escapeHtml(displayOrderId)}</div>
        </div>
        <div class="order-type">${escapeHtml(typeMeta.label)}</div>
      </div>

      <div class="partner-box">
        <div class="field-label">PARTNER ID</div>
        <div class="partner-id">${escapeHtml(partnerId)}</div>
      </div>

      <div class="details-grid">
        <div><span>Order date &amp; time</span><strong>${escapeHtml(formatDateTime(orderTimestamp(order)))}</strong></div>
        <div><span>Order status</span><strong>${escapeHtml(order?.orderstatus || "N/A")}</strong></div>
        <div><span>User ID</span><strong>${escapeHtml(userId)}</strong></div>
        <div><span>Mobile number</span><strong>${escapeHtml(mobile)}</strong></div>
        <div><span>Name</span><strong>${escapeHtml(name)}</strong></div>
        <div><span>Milk delivery shift</span><strong>${escapeHtml(getDeliveryShift(order))}</strong></div>
      </div>

      <div class="items-block">
        <div class="field-label">GROCERY / ITEM LIST</div>
        ${renderItems(order)}
      </div>

      <div class="total-row">
        <span>Total amount</span>
        <strong>&#8377;${formatMoney(getOrderTotal(order))}</strong>
      </div>
    </section>
  `;
};

const buildHtml = ({ orders, title, filterLabel, orderTypeLabel, searchQuery }) => {
  const reportTotal = orders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const generatedAt = formatDateTime(new Date());
  const typeCounts = orders.reduce((counts, order) => {
    const meta = getOrderTypeMeta(order);
    counts[meta.key] = { ...meta, count: (counts[meta.key]?.count || 0) + 1 };
    return counts;
  }, {});
  const typeLegend = Object.values(typeCounts)
    .map((type) => `
      <div class="legend-item ${type.legendClass}">
        <span class="legend-dot"></span>
        <span>${escapeHtml(type.label)}</span>
        <strong>${type.count}</strong>
      </div>
    `)
    .join("");
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11px; background: #ffffff; }
          .report-header { padding: 18px; color: #ffffff; background: #0f172a; border-bottom: 5px solid #06b6d4; }
          .report-header h1 { margin: 0; font-size: 23px; }
          .report-header p { margin: 6px 0 0; color: #cbd5e1; }
          .filter-strip { display: flex; gap: 10px; margin: 14px 0; }
          .filter-box { flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: #f8fafc; }
          .filter-box span, .field-label { display: block; color: #64748b; font-size: 8px; font-weight: bold; letter-spacing: 0.7px; }
          .filter-box strong { display: block; margin-top: 4px; font-size: 12px; }
          .summary { display: flex; margin-bottom: 14px; border: 1px solid #a5f3fc; background: #ecfeff; }
          .summary div { flex: 1; padding: 11px; border-right: 1px solid #a5f3fc; }
          .summary div:last-child { border-right: 0; }
          .summary span { display: block; color: #0e7490; font-size: 9px; }
          .summary strong { display: block; margin-top: 4px; color: #164e63; font-size: 16px; }
          .type-legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
          .legend-item { display: flex; align-items: center; gap: 5px; padding: 6px 8px; border: 1px solid; font-size: 9px; font-weight: bold; }
          .legend-item strong { min-width: 18px; padding: 2px 5px; color: #ffffff; text-align: center; }
          .legend-dot { width: 9px; height: 9px; border-radius: 50%; }
          .legend-fast { color: #1d4ed8; background: #eff6ff; border-color: #93c5fd; } .legend-fast .legend-dot, .legend-fast strong { background: #2563eb; }
          .legend-daily-grocery { color: #047857; background: #ecfdf5; border-color: #6ee7b7; } .legend-daily-grocery .legend-dot, .legend-daily-grocery strong { background: #059669; }
          .legend-demo-milk { color: #b45309; background: #fffbeb; border-color: #fcd34d; } .legend-demo-milk .legend-dot, .legend-demo-milk strong { background: #d97706; }
          .legend-milk { color: #0e7490; background: #ecfeff; border-color: #67e8f9; } .legend-milk .legend-dot, .legend-milk strong { background: #0891b2; }
          .legend-kitchen { color: #be123c; background: #fff1f2; border-color: #fda4af; } .legend-kitchen .legend-dot, .legend-kitchen strong { background: #e11d48; }
          .legend-default { color: #475569; background: #f8fafc; border-color: #cbd5e1; } .legend-default .legend-dot, .legend-default strong { background: #64748b; }
          .order-card { margin: 0 0 14px; border: 1px solid #cbd5e1; border-left-width: 6px; page-break-inside: avoid; }
          .order-heading { display: flex; align-items: flex-start; justify-content: space-between; padding: 11px 12px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
          .order-index { color: #64748b; font-size: 8px; font-weight: bold; }
          .order-id { margin-top: 3px; font-size: 14px; font-weight: bold; word-break: break-all; }
          .order-type { padding: 5px 8px; color: #0e7490; font-size: 9px; font-weight: bold; background: #cffafe; border: 1px solid #67e8f9; }
          .partner-box { margin: 11px 12px 0; padding: 11px; text-align: center; background: #164e63; border: 2px solid #06b6d4; }
          .partner-box .field-label { color: #a5f3fc; }
          .partner-id { margin-top: 5px; color: #ffffff; font-size: 21px; font-weight: bold; letter-spacing: 0.8px; word-break: break-all; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; margin: 11px 12px 0; border-top: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; }
          .details-grid div { min-height: 47px; padding: 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
          .details-grid span { display: block; color: #64748b; font-size: 9px; }
          .details-grid strong { display: block; margin-top: 4px; font-size: 11px; word-break: break-word; }
          .items-block { margin: 11px 12px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .items { margin: 7px 0 0; padding-left: 19px; }
          .items li { margin-bottom: 5px; padding-left: 3px; }
          .items li:last-child { margin-bottom: 0; }
          .variant { margin-left: 6px; color: #64748b; }
          .qty { float: right; color: #334155; font-weight: bold; }
          .empty-value { margin-top: 6px; color: #94a3b8; }
          .total-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 12px; color: #ffffff; background: #0f172a; }
          .total-row span { font-size: 11px; }
          .total-row strong { font-size: 18px; }
          .footer { margin-top: 14px; padding-top: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }

          .type-fast { border-color: #60a5fa; }
          .type-fast .order-heading { background: #dbeafe; border-color: #93c5fd; }
          .type-fast .order-type { color: #1e40af; background: #ffffff; border-color: #60a5fa; }
          .type-fast .partner-box { background: #1e3a8a; border-color: #60a5fa; }
          .type-fast .partner-box .field-label { color: #bfdbfe; }
          .type-fast .items-block { background: #eff6ff; border-color: #bfdbfe; }
          .type-fast .details-grid, .type-fast .details-grid div { border-color: #bfdbfe; }
          .type-fast .details-grid span { color: #1d4ed8; }
          .type-fast .total-row { background: #1d4ed8; }

          .type-daily-grocery { border-color: #34d399; }
          .type-daily-grocery .order-heading { background: #d1fae5; border-color: #6ee7b7; }
          .type-daily-grocery .order-type { color: #065f46; background: #ffffff; border-color: #34d399; }
          .type-daily-grocery .partner-box { background: #064e3b; border-color: #34d399; }
          .type-daily-grocery .partner-box .field-label { color: #a7f3d0; }
          .type-daily-grocery .items-block { background: #ecfdf5; border-color: #a7f3d0; }
          .type-daily-grocery .details-grid, .type-daily-grocery .details-grid div { border-color: #a7f3d0; }
          .type-daily-grocery .details-grid span { color: #047857; }
          .type-daily-grocery .total-row { background: #047857; }

          .type-demo-milk { border-color: #fbbf24; }
          .type-demo-milk .order-heading { background: #fef3c7; border-color: #fcd34d; }
          .type-demo-milk .order-type { color: #92400e; background: #ffffff; border-color: #f59e0b; }
          .type-demo-milk .partner-box { background: #78350f; border-color: #fbbf24; }
          .type-demo-milk .partner-box .field-label { color: #fde68a; }
          .type-demo-milk .items-block { background: #fffbeb; border-color: #fde68a; }
          .type-demo-milk .details-grid, .type-demo-milk .details-grid div { border-color: #fde68a; }
          .type-demo-milk .details-grid span { color: #b45309; }
          .type-demo-milk .total-row { background: #b45309; }

          .type-milk { border-color: #22d3ee; }
          .type-milk .order-heading { background: #cffafe; border-color: #67e8f9; }
          .type-milk .order-type { color: #155e75; background: #ffffff; border-color: #22d3ee; }
          .type-milk .partner-box { background: #164e63; border-color: #22d3ee; }
          .type-milk .partner-box .field-label { color: #a5f3fc; }
          .type-milk .items-block { background: #ecfeff; border-color: #a5f3fc; }
          .type-milk .details-grid, .type-milk .details-grid div { border-color: #a5f3fc; }
          .type-milk .details-grid span { color: #0e7490; }
          .type-milk .total-row { background: #0e7490; }

          .type-kitchen { border-color: #fb7185; }
          .type-kitchen .order-heading { background: #ffe4e6; border-color: #fda4af; }
          .type-kitchen .order-type { color: #9f1239; background: #ffffff; border-color: #fb7185; }
          .type-kitchen .partner-box { background: #881337; border-color: #fb7185; }
          .type-kitchen .partner-box .field-label { color: #fecdd3; }
          .type-kitchen .items-block { background: #fff1f2; border-color: #fecdd3; }
          .type-kitchen .details-grid, .type-kitchen .details-grid div { border-color: #fecdd3; }
          .type-kitchen .details-grid span { color: #be123c; }
          .type-kitchen .total-row { background: #be123c; }

          .type-default { border-color: #94a3b8; }
          .type-default .partner-box { background: #334155; border-color: #94a3b8; }
          .type-default .total-row { background: #475569; }
        </style>
      </head>
      <body>
        <header class="report-header">
          <h1>${escapeHtml(title)}</h1>
          <p>Filtered order report generated ${escapeHtml(generatedAt)} IST</p>
        </header>

        <div class="filter-strip">
          <div class="filter-box"><span>ACTIVE DATE FILTER</span><strong>${escapeHtml(filterLabel || "All")}</strong></div>
          <div class="filter-box"><span>ORDER TYPE</span><strong>${escapeHtml(orderTypeLabel || "All Types")}</strong></div>
          <div class="filter-box"><span>SEARCH FILTER</span><strong>${escapeHtml(searchQuery || "None")}</strong></div>
        </div>

        <div class="summary">
          <div><span>Filtered orders</span><strong>${orders.length}</strong></div>
          <div><span>Combined amount</span><strong>&#8377;${formatMoney(reportTotal)}</strong></div>
        </div>

        <div class="type-legend">${typeLegend}</div>

        ${orders.map(renderOrder).join("")}
        <div class="footer">Dear-Basket Admin • Filtered order export</div>
      </body>
    </html>
  `;
};

export const exportOrdersToPdf = async ({ orders, title, filterLabel, orderTypeLabel, searchQuery }) => {
  const html = buildHtml({ orders, title, filterLabel, orderTypeLabel, searchQuery });
  const result = await Print.printToFileAsync({ html, base64: false });
  const sharingAvailable = await Sharing.isAvailableAsync();

  if (sharingAvailable) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Export Filtered Orders PDF",
      UTI: "com.adobe.pdf",
    });
    return { uri: result.uri, shared: true };
  }

  await Print.printAsync({ html });
  return { uri: result.uri, shared: false };
};
