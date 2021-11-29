// load .env data into process.env
require("dotenv").config();

// Web server config
const PORT = process.env.PORT || 8080;
const sassMiddleware = require("./lib/sass-middleware");
const express = require("express");
const cookieSession = require("cookie-session");
const app = express();
const morgan = require("morgan");

// PG database client/connection setup
const { Pool } = require("pg");
const dbParams = require("./lib/db.js");
const db = new Pool(dbParams);
db.connect();
// const dbConnection = require("./db/database");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan("dev"));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "session",
    keys: ["super", "duper"],
  })
);

app.use(
  "/styles",
  sassMiddleware({
    source: __dirname + "/styles",
    destination: __dirname + "/public/styles",
    isSass: false, // false => scss, true => sass
  })
);

app.use(express.static("public"));

const usersRoutes = require("./routes/users.route");
const mapsRoutes = require("./routes/maps.route");
// const pointsRoutes = require("./routes/points.route");
// const profilesRoutes = require("./routes/profiles.route");

const userDataHelper = require("./db-helper/user.helper");
const mapDataHelper = require("./db-helper/map.helper");
const { getUserWithUserId } = userDataHelper(db);
const { getAllPublicMaps } = mapDataHelper(db);

// Mount all resource routes
app.use("/users", usersRoutes(db));
app.use("/maps", mapsRoutes(db));
// app.use("/api/points", pointsRoutes(db));
// app.use("/api/profiles", profilesRoutes(db));

// Home page
app.get("/", (req, res) => {
  if (!req.session.userId) {
    getAllPublicMaps().then((maps) => {
      return res.render("index", { user: null, maps: maps });
    });
  }

  Promise.all([
    getUserWithUserId(req.session.userId),
    getAllPublicMaps(req.session.userId),
  ]).then((data) =>
    res.render("index", {
      user: data[0],
      maps: data[1],
    })
  );
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
