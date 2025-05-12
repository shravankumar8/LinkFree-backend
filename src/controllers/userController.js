// controllers/booksController.js
const { provider } = require("@prisma/client");
const bcrypt = require("bcrypt");
const PrismaClient = require("@prisma/client").PrismaClient;
const jwt = require("jsonwebtoken");
const passport = require("passport");
const prisma = new PrismaClient();

exports.login = async (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
const redirectUrl = req.user.isSetupComplete
  ? "http://localhost:3000/dashboard"
  : "http://localhost:3000/setup";
 res.status(200).json({
   message: "login successful",
   user: {
     id: req.user.id,
     name: req.user.name,
     email: req.user.email,
     isSetupComplete: req.user.isSetupComplete,
   },
   redirectUrl,
 });

};

// List all books
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;
  console.log({ name: name, email: email, password: password });
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isSetupComplete:false,
      },
    });
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1Day" }
    );
    res.status(201).json({
      status: "user registraation successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        isSetupComplete:user.isSetupComplete,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating user" });
  }

  // console.Console("hashedPassword",hashedPassword);
};

exports.githubCallback = async (req, res, next) => {
  passport.authenticate("github", (err, user, info) => {
    if (err) {
      const errorMessage = encodeURIComponent(err.message);
      return res.redirect(`http://localhost:3000/signup?error=${errorMessage}`);
    }
    if (!user) {
      return res.redirect(
        "http://localhost:3000/signup?error=Authentication failed"
      );
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        const errorMessage = encodeURIComponent(loginErr.message);
        return res.redirect(
          `http://localhost:3000/signup?error=${errorMessage}`
        );
      }

const redirectUrl = user.isSetupComplete
  ? "http://localhost:3000/dashboard"
  : "http://localhost:3000/setup";
return res.redirect(redirectUrl);
    });
  })(req, res, next);
};
exports.googleCallback = async (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      const errorMessage = encodeURIComponent(err.message);
      return res.redirect(`http://localhost:3000/signup?error=${errorMessage}`);
    }
    if (!user) {
      return res.redirect(
        "http://localhost:3000/signup?error=Authentication failed"
      );
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        const errorMessage = encodeURIComponent(loginErr.message);
        return res.redirect(
          `http://localhost:3000/signup?error=${errorMessage}`
        );
      }

      const redirectUrl = user.isSetupComplete
        ? "http://localhost:3000/dashboard"
        : "http://localhost:3000/setup";
      return res.redirect(redirectUrl);
    });
  })(req, res, next);
};

exports.isAuthenticated = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ isAuthenticated: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res
        .status(404)
        .json({ isAuthenticated: false, error: "User not found" });
    }

    res.status(200).json({
      isAuthenticated: true,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        isSetupComplete: existingUser.isSetupComplete,
      },
    });
  } catch (err) {
    console.error("Auth check failed:", err);
    next(err);
  }
};



exports.setup = async (req, res, next) => {
  const { username, displayName, profilePic, bio } = req.body;
  const userId = req.user.id;
  try {
    const existingUser= await prisma.user.findUnique({where:{username}} )
    if(existingUser&& existingUser.id !== userId){
      return res.status(400).json({error:"Username already taken"})
    }

    const updatedUser= await prisma.user.update({
      where:{id:userId},
      data:{
        username,
        displayName,
        profilePic,
        bio,
        isSetupComplete:true
      }
    })
res.status(200).json({
  message:"Profile setup complete",
  user:updatedUser,
})


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error saving profile data" });
  }
}

exports.uploadProfilePicture = async (req, res) => {
try {
  if(!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`;

    const userId = req.user.id;
  await prisma.user.update({
    where:{id:userId},
    data:{
      profilePic:fileUrl,
    }
  })
  res.status(200).json({ message: "Profile picture uploaded", url: fileUrl });
  
} catch (error) {
  console.error("Error uploading profile picture:", error);
  res.status(500).json({ error: "Failed to upload profile picture" });
}
  
}
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`;
    res
      .status(200)
      .json({ message: "File uploaded successfully", url: fileUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};