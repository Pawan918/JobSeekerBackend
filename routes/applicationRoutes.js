const express = require("express");
const prisma = require("../prismaClient");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const applications = await prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { job: true },
    });

    res.json(applications);
  } catch (err) {
    next(err);
  }
});

router.get("/by-job/:jobId", authenticate, async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);

    if (isNaN(jobId)) {
      const error = new Error("Invalid job ID");
      error.statusCode = 400;
      throw error;
    }

    const applicants = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    res.json({ data: applicants });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
