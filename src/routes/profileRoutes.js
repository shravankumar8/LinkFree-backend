const express = require("express");
const PrismaClient = require("@prisma/client").PrismaClient;
const prisma = new PrismaClient();
// routes/booksRoutes.js
const profileController = require("../controllers/profileController");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

router.post("/check-username", profileController.checkUsername);
router.post("/setup",isAuthenticated, profileController.setup);
router.get("/checkauth", isAuthenticated,profileController.auth);
router.put("/update", isAuthenticated,profileController.updateProfile);
router.get("/profileInfo",isAuthenticated ,profileController.updateProfile);

module.exports = router;