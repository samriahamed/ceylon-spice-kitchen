// backend/database/seed.js
//
// Seeds the Ceylon Spice Kitchen SQLite database from csk_data.json.
//
// Safe to run multiple times:
// - Foods are inserted/updated using their existing IDs.
// - Add-ons are inserted/updated using their existing IDs.
// - Existing records are NOT duplicated.
//
// Run with:
//   npm run db:seed
//
// Source:
//   backend/database/csk_data.json
//

const fs = require("fs");
const path = require("path");
const db = require("../db/database");

// ---------------------------------------------------------
// Load seed data
// ---------------------------------------------------------

const dataPath = path.join(__dirname, "csk_data.json");

if (!fs.existsSync(dataPath)) {
  throw new Error(`Seed data file not found: ${dataPath}`);
}

const CSK_DATA = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// ---------------------------------------------------------
// Seed Foods
// ---------------------------------------------------------

function seedFoods() {
  const insert = db.prepare(`
    INSERT INTO foods
      (
        id,
        name,
        category,
        description,
        full_description,
        image,
        price,
        rating,
        prep_time,
        spice_level,
        ingredients_json,
        popular,
        available,
        customizable
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      description = excluded.description,
      full_description = excluded.full_description,
      image = excluded.image,
      price = excluded.price,
      rating = excluded.rating,
      prep_time = excluded.prep_time,
      spice_level = excluded.spice_level,
      ingredients_json = excluded.ingredients_json,
      popular = excluded.popular,
      available = excluded.available,
      customizable = excluded.customizable
  `);

  let count = 0;

  const foods = Array.isArray(CSK_DATA.foods)
    ? CSK_DATA.foods
    : [];

  for (const food of foods) {
    insert.run(
      food.id,
      food.name,
      food.category,
      food.description || "",
      food.fullDescription || food.description || "",
      food.image || "",
      food.price || 0,
      food.rating || 0,
      food.prepTime || "",
      food.spiceLevel || "",
      JSON.stringify(food.ingredients || []),
      food.popular ? 1 : 0,
      food.available === false ? 0 : 1,
      food.customizable ? 1 : 0
    );

    count++;
  }

  return count;
}

// ---------------------------------------------------------
// Seed Add-ons
// ---------------------------------------------------------

function seedAddons() {
  const insert = db.prepare(`
    INSERT INTO addons
      (
        id,
        name,
        price,
        available
      )
    VALUES (?, ?, ?, ?)

    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      price = excluded.price,
      available = excluded.available
  `);

  let count = 0;

  const addons = Array.isArray(CSK_DATA.addons)
    ? CSK_DATA.addons
    : [];

  for (const addon of addons) {
    insert.run(
      addon.id,
      addon.name,
      addon.price || 0,
      1
    );

    count++;
  }

  return count;
}

// ---------------------------------------------------------
// Run Seeding
// ---------------------------------------------------------

console.log(" Ceylon Spice Kitchen Database Seeding");


// Foods
const foodCount = seedFoods();

console.log(
  `Food seed complete: ${foodCount} food items inserted/updated.`
);

const totalFoodsInDb = db
  .prepare("SELECT COUNT(*) AS c FROM foods")
  .get().c;

console.log(
  `Total food rows in database.sqlite: ${totalFoodsInDb}`
);

// Add-ons
const addonCount = seedAddons();

console.log(
  `Add-on seed complete: ${addonCount} add-ons inserted/updated.`
);

const totalAddonsInDb = db
  .prepare("SELECT COUNT(*) AS c FROM addons")
  .get().c;

console.log(
  `Total add-on rows in database.sqlite: ${totalAddonsInDb}`
);

console.log(" Database seeding completed successfully");
