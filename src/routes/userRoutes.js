const express = require("express");
const PrismaClient = require("@prisma/client").PrismaClient;
const prisma = new PrismaClient();
// routes/booksRoutes.js
const userController = require("../controllers/userController");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const path = require("path");
const multerS3 = require("multer-s3");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/user/auth/google/callback",
    },
    async (token, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findFirst({
          where: {
            providerId: profile.id,
            provider: "google",
          },
        });
        if (user) {
          return done(null, user);
        }

        const email = profile.emails[0].value;
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          return done(
            new Error(
              "This email is already registered with another provider. Please log in using that provider."
            )
          );
        }

        user = await prisma.user.create({
          data: {
            name: profile.displayName,
            email: profile.emails[0].value,
            providerId: profile.id,
            provider: "google",
            isSetupComplete: false,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return done(null, false, { message: "Email not found" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
          return done(null, false, { message: "Incorrect password" });
        return done(null, user);
      } catch (error) {
        console.log(error);
        return done(error);
      }
    }
  )
);
// GET /api/books - List all books

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.OAUTH_GITHUB_CLIENT_ID,
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
      callbackURL: "/api/user/auth/github/callback",
      scope: ["user:email"],
    },
    async (token, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findFirst({
          where: {
            providerId: profile.id,
            provider: "github",
          },
        });

        if (user) {
          return done(null, user);
        }

        const email = profile.emails[0].value;
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          return done(
            new Error(
              "This email is already registered with another provider. Please log in using that provider."
            )
          );
        }

        if (!user) {
          const email =
            profile.emails && profile.emails[0]
              ? profile.emails[0].value
              : null;
          if (!email) {
            return done(
              new Error(
                "Email is required but not provided by GitHub. Please update your GitHub profile or use another login method."
              )
            );
          }

          user = await prisma.user.create({
            data: {
              name:
                profile.username ||
                profile.displayName ||
                `GitHub User ${profile.id}`,
              email: email,
              providerId: profile.id,
              provider: "github",
              isSetupComplete: false,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
// s3 initiation to upload th user profiles to the s3 bucket
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
     const folder =
       req.body.uploadType === "background"
         ? "backgrounds"
         : "profile-pictures";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${folder}/${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5mb limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only JPEG and PNG files are allowed!"));
  },
});

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ isAuthenticated: false, error: "Unauthorized" });
};
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({
      message: "Invalid input",
      error: ["Email is required and must be a non-empty string"],
    });
  }

  if (!password || typeof password !== "string" || password.trim() === "") {
    return res.status(400).json({
      message: "Invalid input",
      error: ["Password is required and must be a non-empty string"],
    });
  }

  next();
};
router.post("/login", validateLoginInput, (req, res, next) => {
  passport.authenticate("local", { session: true }, (err, user, info) => {
    // Handle unexpected errors during authentication
    if (err) {
      console.error("Authentication error:", err);
      return res.status(500).json({
        message: "Internal server error during authentication",
        error: ["An unexpected error occurred"],
      });
    }
    if (!user) {
      const errorMessage = info?.message || "Invalid email or password";
      return res.status(401).json({
        message: "Login failed",
        error: [errorMessage],
      });
    }

    req.logIn(user, { session: true }, (loginErr) => {
      if (loginErr) {
        console.error("Login error:", loginErr);
        return res.status(500).json({
          message: "Internal server error during login",
          error: ["Failed to establish user session"],
        });
      }


      try {
        return userController.login(req, res, next);
      } catch (controllerErr) {
        console.error("Error in userController.login:", controllerErr);
        return res.status(500).json({
          message: "Internal server error in login controller",
          error: ["Failed to process login"],
        });
      }
    });
  })(req, res, next);
});

router.post("/register", userController.register);
router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/login");
});
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get("/auth/google/callback", userController.googleCallback);
router.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);
router.get("/auth/github/callback", userController.githubCallback);

router.post("/setup", isAuthenticated, userController.setup);
router.get("/isAuthenticated", isAuthenticated, userController.isAuthenticated);
router.post(
  "/profile-picture",
  isAuthenticated,
  upload.single("profilePicture"),
  userController.uploadProfilePicture
);
router.post(
  "/upload-file",
  isAuthenticated,
  upload.single("file"),
  userController.uploadFile
);

module.exports = router;
