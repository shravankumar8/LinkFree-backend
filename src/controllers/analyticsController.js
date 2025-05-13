// controllers/booksController.js
const { provider } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const PrismaClient = require("@prisma/client").PrismaClient;
const jwt = require("jsonwebtoken");
const passport = require("passport");
const prisma = new PrismaClient();

exports.checkUsername = async (req, res, next) => {
  const { username } = req.body;
  if (!username)
    return res.status(400).json({ message: "Username is required" });
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });
  res.json({ available: !user });
};
exports.setup = async (req, res, next) => {
  const { username, displayName, profilePic, bio } = req.body;
  const userId = req.user.id;
  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        displayName,
        profilePic,
        bio,
        isSetupComplete: true,
      },
    });
    res.status(200).json({
      message: "Profile setup complete",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error saving profile data" });
  }
};

exports.overview = async (req, res, next) => {
  const userId = req.user.id;


  try {
   const analyticsRecord = await prisma.analytics.findUnique({
     where: { userId: userId },
   });


if (!analyticsRecord) {
  return res.status(404).json({
    message: "Analytics not found for this user",
  });
}

res.status(200).json([
  { title: "Total Profile Views", value: analyticsRecord.profileViews ?? 0 },
  { title: "Total Link Clicks", value: analyticsRecord.linkClicks ?? 0 },
  { title: "Engagement Rate", value: analyticsRecord.engagementRate ?? 0 },
]);

    // res.status(200).json(overviewData);
  } catch (error) {
  console.error("Error fetching analytics:", error);
  res.status(500).json({
    message: "Internal server error",
    errors: ["Failed to fetch analytics"],
  });
  }
};
