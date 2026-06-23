/**
 * errorHandler.js — Global Express error handler middleware
 *
 * Must be registered LAST in server.js after all routes:
 *   app.use(errorHandler);
 *
 * Handles:
 *  - Mongoose CastError (invalid ObjectId) → 400
 *  - Mongoose ValidationError → 400
 *  - Mongoose duplicate key error → 409
 *  - Everything else → 500
 */

import logger from "../utils/logger.js";

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`);

  // Mongoose: invalid ObjectId (e.g. findById with bad string)
  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid ID format: ${err.value}` });
  }

  // Mongoose: schema validation failure
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(", ") });
  }

  // Mongoose: duplicate key (unique index violated)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Generic fallback
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

export default errorHandler;
