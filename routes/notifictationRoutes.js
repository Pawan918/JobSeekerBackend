const express = require("express");
const prisma = require("../prismaClient");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");


router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
        skip,
        take,
      }),
      prisma.notification.count({ where: { userId: req.user.userId } }),
    ]);

    res.json({ notifications, total });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    const notificationId = parseInt(req.params.id, 10);

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get("/unread/count", authenticate, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

module.exports = router;