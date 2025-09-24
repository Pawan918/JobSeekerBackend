const prisma = require("../prismaClient");
const jwt = require("jsonwebtoken");

module.exports = (io, socket) => {
  socket.on("authenticate", async (token) => {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
      const userId = payload.userId;
      socket.join(userId.toString());
      socket.userId = userId;
    } catch (err) {
      console.log("Socket authentication failed:", err.message);
    }
  });

  socket.on("sendNotification", async (data) => {
    const { userId, title, message } = data;

    if (!userId) return;
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    // Emit to the specific user room
    io.to(userId).emit("receiveNotification", {
      title,
      message,
      createdAt: new Date(),
    });
  });
};
