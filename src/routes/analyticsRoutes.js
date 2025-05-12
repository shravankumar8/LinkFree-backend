const express = require("express");
const PrismaClient = require("@prisma/client").PrismaClient;
const prisma = new PrismaClient();
// routes/booksRoutes.js
// const profileController = require("../controllers/profileController");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const analyticsController = require("../controllers/analyticsController");
// const isAuthenticated = require("../middlewares/auth");

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect(`${process.env.FRONTEND_URL}/login`);
};

router.get("/overview", isAuthenticated, analyticsController.overview);
// router.get("/checkauth", isAuthenticated, analyticsController.auth);

module.exports = router;
