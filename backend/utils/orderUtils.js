// utils/orderUtils.js
//
// These constants are copied verbatim from the existing frontend's
// data.js (window.CSK_DATA.DELIVERY_FEE etc.) so behaviour does not change
// for the customer. The backend is now the ONLY place that uses them to
// compute a final price — the frontend numbers become display-only.

const BUSINESS_RULES = {
  DELIVERY_FEE: 350,
  FREE_DELIVERY_THRESHOLD: 5000,
  DISCOUNT_THRESHOLD: 4000,
  DISCOUNT_RATE: 0.1,
  MINIMUM_DELIVERY_ORDER: 1000,
};

// subtotal: integer LKR, isDelivery: boolean
function calculateTotals(subtotal, isDelivery) {
  const deliveryFee =
    !isDelivery || !subtotal || subtotal >= BUSINESS_RULES.FREE_DELIVERY_THRESHOLD
      ? 0
      : BUSINESS_RULES.DELIVERY_FEE;
  const discount =
    subtotal >= BUSINESS_RULES.DISCOUNT_THRESHOLD
      ? Math.round(subtotal * BUSINESS_RULES.DISCOUNT_RATE)
      : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  return { subtotal, deliveryFee, discount, total };
}

function generateOrderNumber() {
  return `CSK-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

module.exports = { BUSINESS_RULES, calculateTotals, generateOrderNumber };
