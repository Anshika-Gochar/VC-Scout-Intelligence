/**
 * asyncWrapper.js — DRY async route handler wrapper
 *
 * Wraps an async route handler so any thrown error is automatically
 * forwarded to the global Express error handler via next(err).
 *
 * Usage:
 *   import asyncWrapper from '../middleware/asyncWrapper.js';
 *   router.get('/', asyncWrapper(async (req, res) => { ... }));
 */

const asyncWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncWrapper;
