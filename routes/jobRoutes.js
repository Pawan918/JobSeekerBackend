const express = require("express");
const prisma = require("../prismaClient");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

// Get all jobs with filters & pagination
router.get("/", async (req, res, next) => {
  try {
    const { search, type, location, page = 1, limit = 6 } = req.query;

    const filters = {};
    if (search) {
      filters.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type) filters.type = type;
    if (location)
      filters.location = { contains: location, mode: "insensitive" };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: filters,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where: filters }),
    ]);

    res.json({ jobs, total });
  } catch (error) {
    next(error);
  }
});

// Create a new job
router.post("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      company,
      location,
      type,
      tags,
      description,
      applyUrl,
      applyEmail,
    } = req.body;

    if (!title || !company || !location || !type || !description) {
      const err = new Error("Missing required fields");
      err.statusCode = 400;
      throw err;
    }

    const newJob = await prisma.job.create({
      data: {
        title,
        company,
        location,
        type,
        tags,
        description,
        applyUrl: applyUrl || null,
        applyEmail: applyEmail || null,
        postedBy: { connect: { id: userId } },
      },
    });

    res.status(201).json(newJob);
  } catch (error) {
    next(error);
  }
});

// Get jobs created by current user
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const jobs = await prisma.job.findMany({
      where: { postedById: userId },
      orderBy: { id: "desc" },
    });

    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

// Apply to a job
router.post("/apply/:jobId", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const jobId = parseInt(req.params.jobId);

  try {
    const alreadyApplied = await prisma.application.findFirst({
      where: { userId: userId, jobId },
    });

    if (alreadyApplied)
      return res.status(400).json({ error: "Already applied" });

    const newApp = await prisma.application.create({
      data: {
        userId,
        jobId,
      },
    });

    res.json({ message: "Applied successfully", application: newApp });
  } catch (error) {
    next(error);
  }
});

// Get job by ID
router.get("/:id", async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) {
      const err = new Error("Invalid job ID");
      err.statusCode = 400;
      throw err;
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { postedBy: true },
    });

    if (!job) {
      const err = new Error("Job not found");
      err.statusCode = 404;
      throw err;
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});

// Update a job by ID
router.put("/:id", authenticate, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.userId;

    const existingJob = await prisma.job.findUnique({ where: { id: jobId } });

    if (!existingJob) return res.status(404).json({ error: "Job not found" });
    if (existingJob.postedById !== userId) throw err;

    const {
      title,
      description,
      location,
      company,
      type,
      tags,
      applyUrl,
      applyEmail,
    } = req.body || {};
    if (!title || !description || !company) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        description,
        location,
        company,
        type,
        tags,
        applyUrl: applyUrl || null,
        applyEmail: applyEmail || null,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete all jobs created by current user
router.delete("/me/delete-all", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const deleted = await prisma.job.deleteMany({
      where: { postedById: userId },
    });

    res.json({ message: `Deleted ${deleted.count} job(s)` });
  } catch (error) {
    next(error);
  }
});

//  Delete job by id
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const jobId = parseInt(req.params.id, 10);

    if (isNaN(jobId)) {
      const err = new Error("Invalid job ID");
      err.statusCode = 400;
      throw err;
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      const err = new Error("Job not found");
      err.statusCode = 404;
      throw err;
    }

    if (job.postedById !== userId) {
      const err = new Error("Not authorized to delete this job");
      err.statusCode = 403;
      throw err;
    }

    await prisma.job.delete({ where: { id: jobId } });
    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
