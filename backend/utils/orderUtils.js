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
