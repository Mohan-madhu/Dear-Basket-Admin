/**
 * idHelper.js
 * Returns ONLY ONE ID value for the given number
 * Uses CURRENT IST DATE for Order IDs
 */

/* ---------- UTILS ---------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getISTDateYYYYMMDD() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  const y = ist.getUTCFullYear();
  const m = pad2(ist.getUTCMonth() + 1);
  const d = pad2(ist.getUTCDate());

  return `${y}${m}${d}`;
}

/**
 * 0 → A, 25 → Z, 26 → AA ...
 */
function indexToLetters(index) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("index must be a non-negative integer");
  }

  let n = index + 1;
  let out = "";

  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }

  return out;
}

/* ---------- SINGLE VALUE GENERATORS ---------- */

/**
 * PARTNER ID
 * getPartnerId(95) → 369DP-CR
 */
function getPartnerId(index) {
  return `369DP-${indexToLetters(index)}`;
}

/**
 * USER ID
 * getUserId(95) → 369DU-CR
 */
function getUserId(index) {
  return `369DU-${indexToLetters(index)}`;
}

/**
 * ORDER ID
 * getOrderId("A", 1) → DBO-A-YYYYMMDD-02
 */
function getOrderId(code, orderIndex) {
  if (!code) throw new Error("code is required (A, B, AB, etc.)");
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new Error("orderIndex must be >= 0");
  }

  const date = getISTDateYYYYMMDD();
  return `DBO-${code}-${date}-${pad2(orderIndex + 1)}`;
}

/**
 * ADMIN ID
 * getAdminId(0)  → 369DA-A
 * getAdminId(25) → 369DA-Z
 * getAdminId(26) → 369DA-AA
 */
function getAdminId(index) {
  return `369DA-${indexToLetters(index)}`;
}


/* ---------- EXPORTS ---------- */

module.exports = {
  getPartnerId,
  getUserId,
  getOrderId,
  getAdminId
};
