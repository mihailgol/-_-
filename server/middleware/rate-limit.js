const attemptsMap = new Map();

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 20;
  const message = options.message || "Слишком много попыток. Пожалуйста, попробуйте позже.";

  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "global";
    const now = Date.now();
    const record = attemptsMap.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;
    attemptsMap.set(key, record);

    if (record.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}
