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
        profilePic: profilePic || null,
        bio: bio || null,
        isSetupComplete: true,
      },
    });

    const defaultPage = await prisma.page.create({
      data: {
        isDefault: true,
        userId: updatedUser.id,
        slug: updatedUser.username,
        socialLinks: {
          twitter: "",
          instagram: "",
          linkedin: "", // Pre-filled with empty strings for user to edit
        },
        background: "bg-gradient-to-r from-blue-500 to-pink-500",
        visibility: true,
      },
    });

    return res.status(200).json({
      message: "Profile setup complete",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        profilePic: updatedUser.profilePic,
        bio: updatedUser.bio,
        isSetupComplete: updatedUser.isSetupComplete,
      },
      defaultPage: {
        id: defaultPage.id,
        slug: defaultPage.slug,
        socialLinks: defaultPage.socialLinks,
        background: defaultPage.background,
        visibility: defaultPage.visibility,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error saving profile data" });
  }
};
const hasChanged = (newValue, oldValue) => {
  if (newValue === null || newValue === undefined) {
    return oldValue !== null && oldValue !== undefined;
  }
  if (oldValue === null || oldValue === undefined) {
    return true;
  }
  return JSON.stringify(newValue) !== JSON.stringify(oldValue);
};

exports.updateProfile = async (req, res, next) => {
  const { displayName, bio, profilePic } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        errors: ["No user ID found"],
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
        errors: ["User does not exist"],
      });
    }

    const dataToUpdate = {};

    // if (username !== undefined) {
    //   if (typeof username !== "string" || !username.trim()) {
    //     return res.status(400).json({
    //       message: "Invalid input",
    //       errors: ["Username must be a non-empty string"],
    //     });
    //   }
    //   const sanitizedUsername = username.trim();

    //   if (hasChanged(sanitizedUsername, currentUser.username)) {
    //     const existingUser = await prisma.user.findUnique({
    //       where: {
    //         username: sanitizedUsername,
    //       },
    //     });

    //     if (existingUser && existingUser.id !== userId) {
    //       return res.status(400).json({
    //         message: "Username already in use",
    //         errors: ["Username is already taken"],
    //       });
    //     }
    //     dataToUpdate.username = sanitizedUsername;
    //   }
    // }

    if (displayName !== undefined) {
      if (typeof displayName !== "string") {
        return res.status(400).json({
          message: "Invalid input",
          errors: ["Display name must be a string"],
        });
      }
      const sanitizedDisplayName = displayName.trim();
      if (hasChanged(sanitizedDisplayName, currentUser.displayName)) {
        dataToUpdate.displayName = sanitizedDisplayName || null;
      }
    }

    // Bio vaalidation
    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({
          message: "Invalid input",
          errors: ["Bio must be a string"],
        });
      }
      const sanitizedBio = bio.trim();
      if (sanitizedBio.length > 160) {
        return res.status(400).json({
          message: "Invalid input",
          errors: ["Bio must be 160 characters or less"],
        });
      }
      if (hasChanged(sanitizedBio, currentUser.bio)) {
        dataToUpdate.bio = sanitizedBio || null;
      }
    }

    if (profilePic !== undefined) {
      if (typeof profilePic !== "string") {
        return res.status(400).json({
          message: "Invalid input",
          errors: ["Profile picture must be a string (URL)"],
        });
      }
      const sanitizedProfilePic = profilePic.trim();
      const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
      if (sanitizedProfilePic && !urlRegex.test(sanitizedProfilePic)) {
        return res.status(400).json({
          message: "Invalid input",
          errors: ["Profile picture must be a valid URL"],
        });
      }
      if (hasChanged(sanitizedProfilePic, currentUser.profilePic)) {
        dataToUpdate.profilePic = sanitizedProfilePic || null;
      }
    }

    if (Object.keys(dataToUpdate).length > 0) {
      dataToUpdate.updatedAt = new Date();

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: {
          username: true,
          displayName: true,
          bio: true,
          profilePic: true,
        },
      });

      return res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    }

    const responseUser = {
      username: currentUser.username,
      displayName: currentUser.displayName,
      bio: currentUser.bio,
      profilePic: currentUser.profilePic,
    };

    res.status(200).json({
      message: "No changes to update",
      user: responseUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    // Handle Prisma-specific errors
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Constraint violation",
        errors: ["Username is already taken"],
      });
    }

    res.status(500).json({
      message: "Internal server error",
      errors: ["Failed to update profile"],
    });
  }
};

const profileInfo = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        displayName: true,
        bio: true,
        profilePic: true,
        email: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching profile info:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.auth = async (req, res, next) => {
  res.json({ message: "Authenticated" });
};
