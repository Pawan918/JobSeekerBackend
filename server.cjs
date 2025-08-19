// // backend/server.js
// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const crypto = require("crypto");
// const { PrismaClient } = require("@prisma/client");
// const sendEmail = require("./utils/sendEmail");

// dotenv.config();

// const app = express();
// const prisma = new PrismaClient();

// app.use(cors());
// app.use(express.json());

// // Basic route
// app.get("/", (req, res) => {
//   res.send("DevJobsHub API is running");
// });

// // Get all jobs
// // Example: /api/jobs?search=dev&page=2&limit=6
// app.get("/api/jobs", async (req, res) => {
//   const { search, type, location, page = 1, limit = 6 } = req.query;
//   const filters = {};

//   if (search) {
//     filters.OR = [
//       { title: { contains: search, mode: "insensitive" } },
//       { description: { contains: search, mode: "insensitive" } },
//       { company: { contains: search, mode: "insensitive" } },
//     ];
//   }
//   if (type) filters.type = type;
//   if (location) filters.location = { contains: location, mode: "insensitive" };

//   const skip = (parseInt(page) - 1) * parseInt(limit);
//   const take = parseInt(limit);

//   const [jobs, total] = await Promise.all([
//     prisma.job.findMany({
//       where: filters,
//       skip,
//       take,
//       orderBy: { createdAt: "desc" },
//     }),
//     prisma.job.count({ where: filters }),
//   ]);

//   res.json({ jobs, total });
// });

// // Create a job
// app.post("/api/jobs", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res.status(401).json({ error: "Missing Authorization header" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
//     const userId = decoded.userId;

//     const {
//       title,
//       company,
//       location,
//       type,
//       tags,
//       description,
//       applyUrl,
//       applyEmail,
//     } = req.body;

//     const newJob = await prisma.job.create({
//       data: {
//         title,
//         company,
//         location,
//         type,
//         tags,
//         description,
//         applyUrl: applyUrl || null, // ✅ new
//         applyEmail: applyEmail || null, // ✅ new
//         postedBy: {
//           connect: { id: userId },
//         },
//       },
//     });

//     res.status(201).json(newJob);
//   } catch (err) {
//     console.error("Job creation error:", err);
//     res.status(500).json({ error: "Failed to create job" });
//   }
// });

// // Get job by ID
// app.get("/api/jobs/:id", async (req, res) => {
//   const jobId = parseInt(req.params.id);
//   try {
//     const job = await prisma.job.findUnique({
//       where: { id: jobId },
//       include: { postedBy: true },
//     });

//     if (!job) {
//       return res.status(404).json({ error: "Job not found" });
//     }

//     res.json(job);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch job" });
//   }
// });

// // Seed route to populate dummy data
// app.post("/api/seed", async (req, res) => {
//   try {
//     await prisma.refreshToken.deleteMany();
//     await prisma.application.deleteMany();
//     await prisma.bookmark.deleteMany();
//     await prisma.job.deleteMany();
//     await prisma.user.deleteMany();

//     const hashPassword = async (raw) => await bcrypt.hash(raw, 10);

//     const user1 = await prisma.user.create({
//       data: {
//         email: "alice@example.com",
//         name: "Alice",
//         password: await hashPassword("test123@alice"),
//         role: "user",
//       },
//     });

//     const user2 = await prisma.user.create({
//       data: {
//         email: "bob@example.com",
//         name: "Bob",
//         password: await hashPassword("test123@bob"),
//         role: "admin",
//       },
//     });

//     const jobTitles = [
//       "Frontend Developer",
//       "Backend Developer",
//       "Full Stack Engineer",
//       "UI/UX Designer",
//       "DevOps Engineer",
//       "Product Manager",
//       "QA Tester",
//       "Technical Writer",
//       "Data Analyst",
//       "ML Engineer",
//       "Blockchain Developer",
//       "Mobile App Developer",
//       "Cloud Engineer",
//       "SRE",
//       "SEO Specialist",
//       "Security Analyst",
//       "SysAdmin",
//       "Game Developer",
//       "AI Engineer",
//       "Support Engineer",
//       "Content Strategist",
//       "IT Support",
//       "Data Engineer",
//       "Web Designer",
//       "Scrum Master",
//     ];

//     const companies = [
//       "TechNova",
//       "Cloudify",
//       "SecureX",
//       "AgencyTwo",
//       "StartupOne",
//     ];
//     const locations = [
//       "Remote",
//       "Bangalore",
//       "Berlin",
//       "San Francisco",
//       "London",
//     ];
//     const types = ["full-time", "part-time", "freelance"];
//     const tagsPool = [
//       "vue",
//       "nuxt",
//       "nodejs",
//       "express",
//       "postgresql",
//       "tailwind",
//       "typescript",
//       "graphql",
//       "restapi",
//     ];

//     const createdJobs = [];

//     for (let i = 0; i < 25; i++) {
//       const job = await prisma.job.create({
//         data: {
//           title: jobTitles[i % jobTitles.length],
//           description: `Join our ${
//             jobTitles[i % jobTitles.length]
//           } team to build cutting-edge products.`,
//           location: locations[i % locations.length],
//           company: companies[i % companies.length],
//           type: types[i % types.length],
//           tags: [
//             tagsPool[i % tagsPool.length],
//             tagsPool[(i + 1) % tagsPool.length],
//           ],
//           postedById: i % 2 === 0 ? user1.id : user2.id,
//           createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i), // backdate for realism
//           applyEmail:
//             i % 3 === 0
//               ? `jobs@${companies[i % companies.length].toLowerCase()}.com`
//               : null,
//           applyUrl:
//             i % 3 !== 0
//               ? `https://jobs.${companies[
//                   i % companies.length
//                 ].toLowerCase()}.com/apply/${i}`
//               : null,
//         },
//       });
//       createdJobs.push(job);
//     }

//     const bookmarksToCreate = [
//       { userId: user1.id, jobId: createdJobs[0].id },
//       { userId: user1.id, jobId: createdJobs[2].id },
//       { userId: user1.id, jobId: createdJobs[4].id },
//       { userId: user1.id, jobId: createdJobs[6].id },
//       { userId: user2.id, jobId: createdJobs[1].id },
//       { userId: user2.id, jobId: createdJobs[3].id },
//       { userId: user2.id, jobId: createdJobs[5].id },
//       { userId: user2.id, jobId: createdJobs[7].id },
//     ];

//     for (const bookmark of bookmarksToCreate) {
//       await prisma.bookmark.create({ data: bookmark });
//     }

//     const applicationsToCreate = [
//       { userId: user1.id, jobId: createdJobs[8].id },
//       { userId: user1.id, jobId: createdJobs[10].id },
//       { userId: user2.id, jobId: createdJobs[11].id },
//       { userId: user2.id, jobId: createdJobs[12].id },
//     ];

//     for (const application of applicationsToCreate) {
//       await prisma.application.create({ data: application });
//     }

//     res.json({
//       message: "✅ Seeded 2 users, 25 jobs, 8 bookmarks, and 4 applications",
//     });
//   } catch (error) {
//     console.error("❌ Seed error:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Register
// app.post("/api/register", async (req, res) => {
//   const { name, email, password, role } = req.body;

//   const existingUser = await prisma.user.findUnique({ where: { email } });
//   if (existingUser)
//     return res.status(400).json({ error: "Email already registered" });

//   const hashedPassword = await bcrypt.hash(password, 10);
//   const user = await prisma.user.create({
//     data: { name, email, password: hashedPassword, role: role || "user" },
//   });

//   res.json({ message: "User registered successfully" });
// });

// app.get("/api/me", async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader?.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");

//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.json({ user });
//   } catch (err) {
//     console.error("GET /me error:", err);
//     res.status(401).json({ error: "Invalid or expired token" });
//   }
// });

// // Login

// app.post("/api/login", async (req, res) => {
//   const { email, password } = req.body;

//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user) return res.status(400).json({ error: "Invalid credentials" });

//   const isValid = await bcrypt.compare(password, user.password);
//   if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

//   // Create Access Token
//   const accessToken = jwt.sign(
//     { userId: user.id },
//     process.env.JWT_SECRET || "mysecret",
//     { expiresIn: "15m" } // short lifespan for access token
//   );

//   // Create Refresh Token
//   const refreshToken = crypto.randomBytes(40).toString("hex");
//   const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

//   // Save Refresh Token to DB
//   await prisma.refreshToken.create({
//     data: {
//       token: refreshToken,
//       userId: user.id,
//       expiresAt: refreshTokenExpires,
//     },
//   });

//   res.json({
//     accessToken,
//     refreshToken,
//     user: { id: user.id, name: user.name, email: user.email },
//   });
// });

// app.post("/api/refresh-token", async (req, res) => {
//   const { refreshToken } = req.body;

//   if (!refreshToken)
//     return res.status(400).json({ error: "Refresh token required" });

//   const savedToken = await prisma.refreshToken.findUnique({
//     where: { token: refreshToken },
//     include: { user: true },
//   });

//   if (!savedToken || savedToken.expiresAt < new Date()) {
//     return res.status(403).json({ error: "Invalid or expired refresh token" });
//   }

//   const newAccessToken = jwt.sign(
//     { userId: savedToken.userId },
//     process.env.JWT_SECRET || "mysecret",
//     { expiresIn: "15m" }
//   );

//   res.json({
//     accessToken: newAccessToken,
//   });
// });

// app.post("/api/logout", async (req, res) => {
//   const { refreshToken } = req.body;

//   try {
//     await prisma.refreshToken.delete({ where: { token: refreshToken } });
//     res.json({ message: "Logged out successfully" });
//   } catch {
//     res.status(404).json({ error: "Refresh token not found" });
//   }
// });

// app.post("/api/forgot-password", async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.status(400).json({ message: "Email is required" });

//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user) return res.status(404).json({ message: "User not found" });

//   const token = crypto.randomBytes(32).toString("hex");
//   const tokenExpiry = new Date(Date.now() + 1000 * 60 * 30);

//   await prisma.user.update({
//     where: { email },
//     data: {
//       resetToken: token,
//       resetTokenExpiry: tokenExpiry,
//     },
//   });

//   const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

//   try {
//     await sendEmail({
//       to: email,
//       subject: "🔐 Reset your password",
//       html: `
//         <h2>Reset your password</h2>
//         <p>Click the button below to reset your password:</p>
//         <a href="${resetLink}" style="background:#3b82f6;padding:10px 20px;border-radius:6px;color:white;text-decoration:none;">
//           Reset Password
//         </a>
//         <p>This link will expire in 15 minutes.</p>
//       `,
//     });
//     return res.status(200).json({ message: "Reset link sent successfully" });
//   } catch (err) {
//     console.error("Email sending failed:", err);
//     return res.status(500).json({ message: "Failed to send reset email" });
//   }
// });

// app.post("/api/reset-password", async (req, res) => {
//   try {
//     const { token, password } = req.body;

//     if (!token || !password) {
//       return res.status(400).json({ error: "Token and password are required" });
//     }

//     const user = await prisma.user.findFirst({
//       where: {
//         resetToken: token,
//         resetTokenExpiry: {
//           gte: new Date(),
//         },
//       },
//     });

//     if (!user) {
//       return res.status(400).json({ error: "Invalid or expired reset token" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         password: hashedPassword,
//         resetToken: null,
//         resetTokenExpiry: null,
//       },
//     });

//     return res.json({ message: "✅ Password reset successful" });
//   } catch (err) {
//     console.error("Reset password error:", err);
//     return res
//       .status(500)
//       .json({ error: "Something went wrong. Please try again." });
//   }
// });

// app.get("/api/my-jobs", async (req, res) => {
//   console.log("Hit /api/my-jobs");

//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     console.log("Missing token");
//     return res.status(401).json({ error: "Missing token" });
//   }

//   const token = authHeader.split(" ")[1];
//   console.log("Token:", token);

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
//     const userId = decoded.userId;
//     console.log("User ID:", userId);

//     const jobs = await prisma.job.findMany({
//       where: { postedById: userId },
//       orderBy: { id: "desc" },
//     });

//     console.log("Jobs found:", jobs.length);
//     res.json(jobs);
//   } catch (err) {
//     console.error("JWT or DB error:", err);
//     res.status(401).json({ error: "Invalid or expired token" });
//   }
// });

// app.delete("/api/my-jobs/delete-all", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
//     const userId = decoded.userId;

//     const deleted = await prisma.job.deleteMany({
//       where: { postedById: userId },
//     });

//     res.json({ message: `Deleted ${deleted.count} job(s)` });
//   } catch (err) {
//     console.error("Delete all jobs error:", err);
//     res.status(500).json({ error: "Failed to delete jobs" });
//   }
// });

// app.delete("/api/jobs/:id", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
//     const jobId = parseInt(req.params.id);

//     // Find the job first
//     const job = await prisma.job.findUnique({ where: { id: jobId } });
//     if (!job) return res.status(404).json({ error: "Job not found" });

//     // Check ownership
//     if (job.postedById !== decoded.userId) {
//       return res
//         .status(403)
//         .json({ error: "Not authorized to delete this job" });
//     }

//     await prisma.job.delete({ where: { id: jobId } });
//     res.json({ message: "Job deleted successfully" });
//   } catch (err) {
//     console.error("Delete job error:", err);
//     res.status(500).json({ error: "Failed to delete job" });
//   }
// });
// // Update a job by ID
// app.put("/api/jobs/:id", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
//     const jobId = parseInt(req.params.id);
//     const userId = decoded.userId;

//     const existingJob = await prisma.job.findUnique({ where: { id: jobId } });

//     if (!existingJob) return res.status(404).json({ error: "Job not found" });
//     if (existingJob.postedById !== userId)
//       return res
//         .status(403)
//         .json({ error: "Not authorized to update this job" });

//     const {
//       title,
//       description,
//       location,
//       company,
//       type,
//       tags,
//       applyUrl,
//       applyEmail,
//     } = req.body || {};
//     if (!title || !description || !company) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const updated = await prisma.job.update({
//       where: { id: jobId },
//       data: {
//         title,
//         description,
//         location,
//         company,
//         type,
//         tags,
//         applyUrl: applyUrl || null, // ✅ update
//         applyEmail: applyEmail || null, // ✅ update
//       },
//     });

//     res.json(updated);
//   } catch (err) {
//     console.error("Update job error:", err);
//     res.status(500).json({ error: "Failed to update job" });
//   }
// });

// // Get all bookmarks for logged-in user
// app.get("/api/bookmarks", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
//     const bookmarks = await prisma.bookmark.findMany({
//       where: { userId: decoded.userId },
//       include: { job: true },
//     });

//     res.json(bookmarks.map((b) => b.job));
//   } catch (err) {
//     console.error("Bookmarks error:", err);
//     res.status(500).json({ error: "Failed to fetch bookmarks" });
//   }
// });

// // Bookmark a job
// app.post("/api/bookmarks/:jobId", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];
//   const jobId = parseInt(req.params.jobId);

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");

//     const alreadyBookmarked = await prisma.bookmark.findFirst({
//       where: { userId: decoded.userId, jobId },
//     });

//     if (alreadyBookmarked)
//       return res.status(400).json({ error: "Already bookmarked" });

//     await prisma.bookmark.create({
//       data: {
//         userId: decoded.userId,
//         jobId,
//       },
//     });

//     res.json({ message: "Bookmarked successfully" });
//   } catch (err) {
//     console.error("Bookmark error:", err);
//     res.status(500).json({ error: "Failed to bookmark job" });
//   }
// });

// // Remove a bookmark
// app.delete("/api/bookmarks/:jobId", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];
//   const jobId = parseInt(req.params.jobId);

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");

//     await prisma.bookmark.deleteMany({
//       where: {
//         userId: decoded.userId,
//         jobId,
//       },
//     });

//     res.json({ message: "Bookmark removed" });
//   } catch (err) {
//     console.error("Delete bookmark error:", err);
//     res.status(500).json({ error: "Failed to remove bookmark" });
//   }
// });

// app.post("/api/apply/:jobId", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];
//   const jobId = parseInt(req.params.jobId);

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");

//     const alreadyApplied = await prisma.application.findFirst({
//       where: { userId: decoded.userId, jobId },
//     });

//     if (alreadyApplied)
//       return res.status(400).json({ error: "Already applied" });

//     const newApp = await prisma.application.create({
//       data: {
//         userId: decoded.userId,
//         jobId,
//       },
//     });

//     res.json({ message: "Applied successfully", application: newApp });
//   } catch (err) {
//     console.error("Apply error:", err);
//     res.status(500).json({ error: "Failed to apply" });
//   }
// });

// app.get("/api/my-applications", async (req, res) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ error: "Missing token" });

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");

//     const applications = await prisma.application.findMany({
//       where: { userId: decoded.userId },
//       orderBy: { createdAt: "desc" },
//       include: { job: true },
//     });

//     res.json(applications);
//   } catch (err) {
//     console.error("Applications fetch error:", err);
//     res.status(500).json({ error: "Failed to fetch applications" });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Route imports
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
