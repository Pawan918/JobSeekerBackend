const express = require("express");
const prisma = require("../prismaClient");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

// Get all bookmarks
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: { job: true },
    });

    res.json(bookmarks.map((b) => b.job));
  } catch (error) {
    next(error);
  }
});

// Add a bookmark
router.post("/:jobId", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const jobId = parseInt(req.params.jobId, 10);

    if (isNaN(jobId)) {
      const err = new Error("Invalid jobId");
      err.statusCode = 400;
      throw err;
    }

    await prisma.bookmark.create({ data: { userId, jobId } });
    res.status(201).json({ message: "Bookmarked successfully" });
  } catch (error) {
    next(error);
  }
});

// Remove a bookmark
router.delete("/:jobId", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const jobId = parseInt(req.params.jobId, 10);

    if (isNaN(jobId)) {
      const err = new Error("Invalid jobId");
      err.statusCode = 400;
      throw err;
    }

    const deleted = await prisma.bookmark.deleteMany({
      where: { userId, jobId },
    });

    if (deleted.count === 0) {
      const err = new Error("Bookmark not found");
      err.statusCode = 404;
      throw err;
    }

    res.json({ message: "Bookmark removed" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
