const express = require("express");
const prisma = require("../prismaClient");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { authenticate } = require("../middleware/authMiddleware");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// Register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      const err = new Error("Name, email, and password are required");
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error("Password must be at least 6 characters");
      err.statusCode = 400;
      throw err;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const err = new Error("Email already registered");
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || "user" },
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    next(error);
  }
});

//  Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const err = new Error("Email and password are required");
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error("Invalid credentials");
      err.statusCode = 400;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const err = new Error("Invalid credentials");
      err.statusCode = 400;
      throw err;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "mysecret",
      { expiresIn: "5m" }
    );

    const refreshToken = crypto.randomBytes(40).toString("hex");
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Refresh token (if you’re using DB-stored tokens)
router.post("/refresh-token", async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!savedToken || savedToken.expiresAt < new Date()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: savedToken.userId },
      process.env.JWT_SECRET || "mysecret",
      { expiresIn: "5m" }
    );
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      const err = new Error("Email is required");
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: tokenExpiry },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "🔐 Reset your password",
      html: `
        <h2>Reset your password</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}" style="background:#3b82f6;padding:10px 20px;border-radius:6px;color:white;text-decoration:none;">
          Reset Password
        </a>
        <p>This link will expire in 30 minutes.</p>
      `,
    });

    res.json({ message: "Reset link sent successfully" });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      const err = new Error("Token and password are required");
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error("Password must be at least 6 characters");
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      const err = new Error("Invalid or expired reset token");
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "✅ Password reset successful" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
