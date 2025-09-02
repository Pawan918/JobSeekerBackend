const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret");
    req.user = decoded;
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { authenticate };
