// database/init.js
// Creates database.sqlite and all tables (if they don't already exist).
// Run with: npm run db:init
require("../db/database"); // importing it runs initSchema()
console.log("Database initialized at backend/database/database.sqlite");
