// controllers/menuController.js
const db = require("../db/database");
const { ApiError } = require("../middleware/errorMiddleware");

function rowToFood(row, { full = false } = {}) {
  const base = {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    image: row.image,
    rating: row.rating,
    prepTime: row.prep_time,
    spiceLevel: row.spice_level,
    popular: !!row.popular,
    available: !!row.available,
    customizable: !!row.customizable,
  };
  if (full) {
    base.fullDescription = row.full_description;
    base.ingredients = JSON.parse(row.ingredients_json || "[]");
  }
  return base;
}

async function listFoods(req, res) {
  const { category, search, minPrice, maxPrice, sort } = req.query;

  let sql = "SELECT * FROM foods WHERE available = 1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND (name LIKE ? OR category LIKE ? OR description LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (minPrice) {
    sql += " AND price >= ?";
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += " AND price <= ?";
    params.push(Number(maxPrice));
  }

  const sortMap = {
    price_asc: "price ASC",
    price_desc: "price DESC",
    rating: "rating DESC",
    name: "name ASC",
  };
  sql += ` ORDER BY ${sortMap[sort] || "popular DESC, rating DESC"}`;

  const rows = db.prepare(sql).all(...params);
  // NOTE: this small menu (a few dozen items) is returned with full detail
  // (fullDescription + ingredients included) rather than just summary
  // fields. That lets the frontend cache the whole menu from this one call
  // and render the Food Details page from the cache without a second
  // request per dish. See API_DOCUMENTATION.md for details.
  const data = rows.map((r) => rowToFood(r, { full: true }));

  res.json({ success: true, count: data.length, data });
}

async function getFoodById(req, res) {
  const row = db.prepare("SELECT * FROM foods WHERE id = ?").get(req.params.id);
  if (!row) throw new ApiError(404, "Food item not found");
  res.json({ success: true, data: rowToFood(row, { full: true }) });
}

async function listCategories(req, res) {
  const rows = db
    .prepare("SELECT category, COUNT(*) as count FROM foods WHERE available = 1 GROUP BY category ORDER BY category")
    .all();
  res.json({ success: true, data: rows.map((r) => ({ name: r.category, count: r.count })) });
}

async function listAddons(req, res) {
  const rows = db
    .prepare(`
      SELECT id, name, price
      FROM addons
      WHERE available = 1
      ORDER BY name
    `)
    .all();

  res.json({
    success: true,
    count: rows.length,
    data: rows
  });
}

module.exports = { listFoods, getFoodById, listCategories, listAddons };
