const express = require("express");
const PrismaClient = require("@prisma/client").PrismaClient;
const prisma = new PrismaClient();
// routes/booksRoutes.js
// const profileController = require("../controllers/profileController");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const pageController = require("../controllers/pageController");
// const isAuthenticated = require("../middlewares/auth");

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

router.put("/visibility", pageController.changeVisibility);
router.get("/createpageinfo", isAuthenticated, pageController.createPageinfo);
router.post("/", isAuthenticated, pageController.createPage);
router.put("/:id", isAuthenticated, pageController.updatePage);
router.get("/:id", isAuthenticated, pageController.getpage);
router.get("/", isAuthenticated, pageController.getAllPages);

// router.get("/checkauth", isAuthenticated, analyticsController.auth);

module.exports = router;
