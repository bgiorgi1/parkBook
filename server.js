require("dotenv").config();
const express = require("express");
const layouts = require("express-ejs-layouts");
const app = express();
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("./config/ppConfig");
const isLoggedIn = require("./middleware/isLoggedIn");
const db = require("./models");
const axios = require("axios");
const router = express.Router();
const methodOverride = require("method-override")

const SECRET_SESSION = process.env.SECRET_SESSION;
console.log(SECRET_SESSION);

app.set("view engine", "ejs");

app.use(require("morgan")("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));
app.use(layouts);
app.use(methodOverride('_method'));

app.use(
  session({
    secret: SECRET_SESSION, // What we actually will be giving the user on our site as a session cookie
    resave: false, // Save the session even if it's modified, make this false
    saveUninitialized: true, // If we have a new session, we save it, therefore making that true
  })
);

app.use(flash()); // flash middleware
app.use(passport.initialize()); // Initialize passport
app.use(passport.session()); // Add a session

app.use((req, res, next) => {
  console.log(res.locals);
  res.locals.alerts = req.flash(); //library that allows quick flash messages anytime a user logsin/logsout/wrong pw
  res.locals.currentUser = req.user;
  next();
});

app.get("/", (req, res) => {
  res.render("index");
});




app.use("/auth", require("./controllers/auth"));
app.use("/reviews", require("./controllers/reviews"));
app.use("/favs", require("./controllers/favs"));


app.get("/profile", isLoggedIn, (req, res) => {
  const { id, name, email } = req.user.get();
  console.log("inside of profile");
  res.render("profile", { id, name, email });
});

// ---------------------------------------------

app.get("/results/:parkName", (req, res) => {
  const query = req.query.q;
  
  const credentials = process.env.APIKEY;
  axios
    .get(`https://${credentials}@developer.nps.gov/api/v1/parks?q=${query}`)
    .then((response) => {
      console.log(response.data);
      res.render("searchresult", { data: response.data });
    });
});



// select details from favs page and redirect with details to details page
app.get("/details/:parkName", (req, res) => {
  const query = req.params.parkName;
  console.log(query)
  const credentials = process.env.APIKEY;
  axios
    .get(`https://${credentials}@developer.nps.gov/api/v1/parks?limit=423`)
    .then((response) => {
      const parkInfo = response.data.data;
      console.log(parkInfo.length);
      for (let i=0; i < parkInfo.length; i++) {
        let park = parkInfo[i]
        console.log(park.fullName)
        if (park.fullName === query) {
          res.render("details", { data: park });
        }
      }
      
    });
});

app.post("/details", async function (req, res) {
  const newFav = { name: req.body.name };
  try {
    const isInFavs = await db.fav.findAll({ where: newFav });
    if (isInFavs.length > 0) {
      res.send({
        message: "Park already a favorite",
        redirect: "http://localhost:3000/",
      });
    } else {
      const newParkFav = await db.fav.create(newFav);
      console.log(newParkFav.name, "created.");
      res.redirect("/details/");
    }
  } catch (err) {
    res.send("something went wrong trying to create favs");
  }
});

app.get("/index", (req, res) => {
  res.render("index");
});



// // --------------------------------------------------

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🎧 You're listening to the smooth sounds of port ${PORT} 🎧`);
});

module.exports = server;


