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
require("./cronJobs/updateEngagementRate.js");

const pgSession = require("connect-pg-simple")(session);

const cors = require("cors");
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000", 
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL, // Use the same DATABASE_URL as Prisma
      tableName: "user_sessions", // Name of the table to store sessions
      ttl: 24 * 60 * 60, // Session TTL (1 day in seconds)
      schemaName: "public",
      createTableIfMissing: true, // Create table if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || "your_secret_key", // Replace with a strong, unique secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" }, // Set to true if using HTTPS
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
app.get("/", (req, res) => {
  res.send("Hello World!");
})
app.use("/api/user", usersRoutes);
// app.use("/api/edit-page", pageRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/portfolio", portfolioRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
