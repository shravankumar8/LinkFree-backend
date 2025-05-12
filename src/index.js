const express = require("express");
 // Load environment variables from .env
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const session = require("express-session");
const passport = require("passport");
const expressSession = require("express-session");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const usersRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const pageRoutes = require("./routes/pageRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
require("./cronJobs/updateEngagementRate.js")
const cors = require("cors");
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};


app.use(cors(corsOptions));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET|| "your_secret_key", // Replace with a strong, unique secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, String(user.id)); // Ensure the id is stored as a string
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(id) } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});



app.use("/api/user", usersRoutes);
// app.use("/api/edit-page", pageRoutes);
app.use("/api/profile",profileRoutes)
app.use("/api/analytics", analyticsRoutes);
app.use("/api/pages",pageRoutes);
app.use("/api/portfolio", portfolioRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
