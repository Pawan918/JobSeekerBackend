// middleware/errorHandler.js
const { Prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");

function formatValidationDetails(err) {
  // Zod
  if (err.name === "ZodError" && Array.isArray(err.issues)) {
    return err.issues.map((i) => ({ path: i.path, message: i.message }));
  }

  // Joi
  if (err.isJoi && Array.isArray(err.details)) {
    return err.details.map((d) => ({ path: d.path, message: d.message }));
  }

  // express-validator (result.mapped())
  if (Array.isArray(err.errors)) {
    return err.errors.map((e) => ({
      path: e.param || e.path,
      message: e.msg || e.message,
    }));
  }

  return undefined;
}

function errorHandler(err, req, res, next) {
  // Basic log info
  const metaLog = {
    method: req.method,
    path: req.originalUrl || req.url,
    user: req.user
      ? { id: req.user.userId || req.user.id, role: req.user.role }
      : undefined,
    time: new Date().toISOString(),
  };

  // Default response
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details;

  // Handle JSON parse error (body-parser)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON payload";
  }

  // JWT errors
  if (
    err.name === "JsonWebTokenError" ||
    err instanceof jwt.JsonWebTokenError
  ) {
    statusCode = 401;
    message = "Invalid token";
  } else if (
    err.name === "TokenExpiredError" ||
    err instanceof jwt.TokenExpiredError
  ) {
    statusCode = 401;
    message = "Token expired";
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.message || "File upload error";
  }

  // Zod / Joi / express-validator details
  const validationDetails = formatValidationDetails(err);
  if (validationDetails) {
    statusCode = 400;
    message = "Validation failed";
    details = validationDetails;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Known Prisma DB errors with codes (e.g. P2002, P2025, P2003)
    switch (err.code) {
      case "P2002": // Unique constraint failed
        statusCode = 400;
        // meta.target often contains which columns
        message = "Duplicate entry. This record already exists.";
        details =
          err.meta && err.meta.target ? { target: err.meta.target } : undefined;
        break;

      case "P2025": // Record not found
        statusCode = 404;
        message = "Record not found.";
        break;

      case "P2003": // Foreign key constraint failed
        statusCode = 400;
        message = "Invalid reference. Related record does not exist.";
        details =
          err.meta && err.meta.field_name
            ? { field: err.meta.field_name }
            : undefined;
        break;

      default:
        // leave message and status as-is, but add meta for debugging
        message = err.message || message;
        details = { prismaCode: err.code, meta: err.meta };
        console.warn("Unhandled Prisma error code:", err.code, err.meta);
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Database validation error";
    details = { message: err.message };
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError === false &&
    err.name &&
    err.name.startsWith("Prisma")
  ) {
    // generic Prisma fallback
    message = err.message || message;
  }

  // If the error object attached any custom details, surface them
  if (err.details && !details) details = err.details;
  if (err.errors && !details) details = err.errors;

  // Structured logging (stack only in dev)
  const isProd = process.env.NODE_ENV === "production";
  const logEntry = {
    message: err.message,
    statusCode,
    path: metaLog.path,
    method: metaLog.method,
    time: metaLog.time,
    user: metaLog.user,
    // include Prisma meta if present
    prisma: err.meta || (err.code ? { code: err.code } : undefined),
    stack: isProd ? undefined : err.stack,
  };

  // Choose logging method
  if (statusCode >= 500) {
    console.error("Server Error:", logEntry);
  } else {
    console.warn("Client Error:", logEntry);
  }

  // Response body
  const responseBody = {
    error: message,
    status: statusCode,
    path: metaLog.path,
    method: metaLog.method,
  };

  if (details) responseBody.details = details;
  if (!isProd) responseBody.stack = err.stack;

  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;
