const express = require("express");
const PrismaClient = require("@prisma/client").PrismaClient;
const prisma = new PrismaClient();
// routes/booksRoutes.js
// const profileController = require("../controllers/profileController");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const pageController = require("../controllers/pageController");
const portfolioControllder= require('../controllers/portfolioController')
// const isAuthenticated = require("../middlewares/auth");

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

router.get("/:username/:slug?", portfolioControllder.getPortfolio);
router.post("/:username/:slug?/track-link", portfolioControllder.trackLinkClick);
router.post("/", isAuthenticated, pageController.createPage);
router.put("/visibility", pageController.changeVisibility);
router.get("/createpageinfo", isAuthenticated, pageController.createPageinfo);
router.put("/:id", isAuthenticated, pageController.updatePage);
router.get("/", isAuthenticated, pageController.getAllPages);
// router.get("/checkauth", isAuthenticated, analyticsController.auth);

module.exports = router;
