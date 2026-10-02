const db = require("../db/database");
const {
  calculateTotals,
  generateOrderNumber,
  BUSINESS_RULES,
} = require("../utils/orderUtils");

const {
  isValidPhone,
  isNonEmptyString,
} = require("../utils/validators");

const {
  ApiError,
} = require("../middleware/errorMiddleware");

const ORDER_TYPES = ["Delivery", "Pickup"];

const PAYMENT_METHODS = [
  "Cash on Delivery",
  "Card Demo",
];

// Convert database order + items into API response format

function rowToOrderSummary(order, items) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    orderType: order.order_type,
    status: order.status,
    paymentMethod: order.payment_method,
    address: order.address,
    city: order.city,
    note: order.note,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    total: order.total,

    items: items.map((item) => ({
      foodId: item.food_id,
      name: item.food_name,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      spiceLevel: item.spice_level,
      addons: JSON.parse(item.addons_json || "[]"),
      subtotal: item.subtotal,
    })),
  };
}

// POST /api/orders
// Requires authentication
async function createOrder(req, res) {
  const {
    orderType,
    phone,
    address,
    city,
    note,
    paymentMethod,
    items,
    customerName,
    customerEmail,
  } = req.body || {};

 
  // Validate basic order information
  if (!ORDER_TYPES.includes(orderType)) {
    throw new ApiError(
      400,
      "orderType must be 'Delivery' or 'Pickup'."
    );
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(
      400,
      `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`
    );
  }

  if (!isValidPhone(phone)) {
    throw new ApiError(
      400,
      "Please provide a valid 10-digit phone number."
    );
  }

  if (
    orderType === "Delivery" &&
    !isNonEmptyString(address, 5)
  ) {
    throw new ApiError(
      400,
      "Delivery address is required."
    );
  }

  if (
    orderType === "Delivery" &&
    !isNonEmptyString(city, 1)
  ) {
    throw new ApiError(
      400,
      "City is required for delivery."
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(
      400,
      "Order must contain at least one item."
    );
  }


  // Get authenticated user from SQLite
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user) {
    throw new ApiError(
      401,
      "User not found."
    );
  }


  // Validate and price every food item
  const priced = [];

  for (const item of items) {
    const {
      foodId,
      quantity,
      spiceLevel,
      addons,
    } = item || {};

    if (!isNonEmptyString(foodId)) {
      throw new ApiError(
        400,
        "Each item requires a foodId."
      );
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ApiError(
        400,
        `Invalid quantity for ${foodId}.`
      );
    }


    // Get food information and price from SQLite
    const food = db
      .prepare(
        `
        SELECT *
        FROM foods
        WHERE id = ?
        `
      )
      .get(foodId);

    if (!food) {
      throw new ApiError(
        404,
        `Food item not found: ${foodId}`
      );
    }

    if (!food.available) {
      throw new ApiError(
        409,
        `Food item is currently unavailable: ${food.name}`
      );
    }


    // Get add-ons and prices from SQLite

    const addonList = Array.isArray(addons)
      ? addons
      : [];

    const pricedAddons = [];

    for (const addon of addonList) {
      const addonId = addon?.id;

      if (!isNonEmptyString(addonId)) {
        throw new ApiError(
          400,
          "Invalid add-on."
        );
      }

      const knownAddon = db
        .prepare(
          `
          SELECT id, name, price
          FROM addons
          WHERE id = ?
            AND available = 1
          `
        )
        .get(addonId);

      if (!knownAddon) {
        throw new ApiError(
          400,
          `Unknown or unavailable add-on: ${addonId}`
        );
      }

      pricedAddons.push(knownAddon);
    }

    // Calculate item price
    // IMPORTANT:
    // The client does NOT provide the price.
    // Food price and add-on price both come from SQLite.

    const addonTotal = pricedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );

    const unitPrice =
      food.price + addonTotal;

    const lineSubtotal =
      unitPrice * qty;

    priced.push({
      food,
      quantity: qty,
      spiceLevel:
        spiceLevel || food.spice_level,
      addons: pricedAddons,
      unitPrice,
      lineSubtotal,
    });
  }

  // Calculate order subtotal

  const subtotal = priced.reduce(
    (sum, item) => sum + item.lineSubtotal,
    0
  );

  const isDelivery =
    orderType === "Delivery";


  // Minimum delivery order validation
  if (
    isDelivery &&
    subtotal < BUSINESS_RULES.MINIMUM_DELIVERY_ORDER
  ) {
    throw new ApiError(
      400,
      `Delivery orders must be at least LKR ${BUSINESS_RULES.MINIMUM_DELIVERY_ORDER}. Add more items or choose pickup.`
    );
  }


  // Calculate final totals

  const totals = calculateTotals(
    subtotal,
    isDelivery
  );

  const orderNumber =
    generateOrderNumber();


  // Start database transaction

  db.exec("BEGIN");

  try {
    // Insert order
    const orderInfo = db
      .prepare(
        `
        INSERT INTO orders
          (
            user_id,
            order_number,
            customer_name,
            customer_email,
            customer_phone,
            order_type,
            address,
            city,
            note,
            payment_method,
            subtotal,
            delivery_fee,
            discount,
            total,
            status
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')
        `
      )
      .run(
        user.id,
        orderNumber,
        customerName || user.full_name,
        customerEmail || user.email,
        phone.trim(),
        orderType,
        isDelivery
          ? address.trim()
          : "Collect at restaurant",
        city ? city.trim() : null,
        note ? note.trim() : null,
        paymentMethod,
        totals.subtotal,
        totals.deliveryFee,
        totals.discount,
        totals.total
      );

    const orderId =
      orderInfo.lastInsertRowid;


    // Insert order items
    const insertItem = db.prepare(
      `
      INSERT INTO order_items
        (
          order_id,
          food_id,
          food_name,
          unit_price,
          quantity,
          spice_level,
          addons_json,
          subtotal
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (const item of priced) {
      insertItem.run(
        orderId,
        item.food.id,
        item.food.name,
        item.unitPrice,
        item.quantity,
        item.spiceLevel,
        JSON.stringify(item.addons),
        item.lineSubtotal
      );
    }


    // Commit transaction
    db.exec("COMMIT");


    // Read newly created order
    const order = db
      .prepare(
        "SELECT * FROM orders WHERE id = ?"
      )
      .get(orderId);

    const orderItems = db
      .prepare(
        `
        SELECT *
        FROM order_items
        WHERE order_id = ?
        `
      )
      .all(orderId);


    // Return created order
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: rowToOrderSummary(
        order,
        orderItems
      ),
    });

  } catch (err) {

    // Roll back transaction on failure
    db.exec("ROLLBACK");

    throw err;
  }
}


// GET /api/orders/my
// Requires authentication
async function getMyOrders(req, res) {
  const orders = db
    .prepare(
      `
      SELECT *
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      `
    )
    .all(req.user.id);

  const data = orders.map((order) => {
    const items = db
      .prepare(
        `
        SELECT *
        FROM order_items
        WHERE order_id = ?
        `
      )
      .all(order.id);

    return rowToOrderSummary(
      order,
      items
    );
  });

  res.json({
    success: true,
    count: data.length,
    data,
  });
}


// GET /api/orders/:id
// Requires authentication
async function getOrderById(req, res) {
  const order = db
    .prepare(
      `
      SELECT *
      FROM orders
      WHERE id = ?
      `
    )
    .get(req.params.id);

  if (!order) {
    throw new ApiError(
      404,
      "Order not found."
    );
  }

  if (order.user_id !== req.user.id) {
    throw new ApiError(
      403,
      "You do not have access to this order."
    );
  }

  const items = db
    .prepare(
      `
      SELECT *
      FROM order_items
      WHERE order_id = ?
      `
    )
    .all(order.id);

  res.json({
    success: true,
    data: rowToOrderSummary(
      order,
      items
    ),
  });
}


// Export controllers
module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
};