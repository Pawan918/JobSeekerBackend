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
      return res.status(400).json({ message: "Invalid job ID" });
    }

    // Ensure job belongs to the logged-in user
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { postedById: true },
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.postedById !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to view applications" });
    }

    // Fetch applications only
    const applicants = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ applicants });
  } catch (err) {
    next(err);
  }
});

router.patch("/:applicationId/status", authenticate, async (req, res, next) => {
  try {
    const applicationId = Number(req.params.applicationId);
    const { status } = req.body;

    if (isNaN(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Fetch the application with related job
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application)
      return res.status(404).json({ message: "Application not found" });

    // Only the user who posted the job can update the application
    if (application.job.postedById !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this application" });
    }

    // Update status
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
    });

    res.json({
      message: `Application ${status.toLowerCase()} successfully`,
      application: updated,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
