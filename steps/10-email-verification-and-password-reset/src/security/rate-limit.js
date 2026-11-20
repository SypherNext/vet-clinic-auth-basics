// Limits how often something can happen, for example "30 login attempts per
// IP address every 15 minutes". Counts are kept in memory, which is fine for
// one server process. With several servers you would keep them in a shared
// store such as Redis so every server sees the same counts.
import { sendError } from '../http/errors.js';
import { formatDuration } from '../format.js';

export function createRateLimiter({ windowMs, max, clock }) {
  const counters = new Map(); // key -> { count, resetAt }

  function removeOldCounters(now) {
    for (const [key, counter] of counters) if (counter.resetAt <= now) counters.delete(key);
  }

  return {
    // Counts one attempt for this key and says whether it is still allowed.
    hit(key) {
      const now = clock.now();
      let counter = counters.get(key);
      if (!counter || counter.resetAt <= now) {
        if (counters.size > 10_000) removeOldCounters(now);
        counter = { count: 0, resetAt: now + windowMs };
        counters.set(key, counter);
      }
      counter.count += 1;
      return { allowed: counter.count <= max, retryAfterMs: counter.resetAt - now };
    },
  };
}

// Express middleware: refuse with 429 Too Many Requests once the limit is hit.
export function rateLimit(limiter, keyFor) {
  return (req, res, next) => {
    const { allowed, retryAfterMs } = limiter.hit(keyFor(req));
    if (allowed) return next();
    const waitMs = Math.max(retryAfterMs, 60_000);
    res.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
    sendError(req, res, 429, 'Too many attempts', `Too many attempts. Try again in ${formatDuration(waitMs)}.`);
  };
}

// The rate limiters the app shares between its login methods.
export function createRateLimiters({ config, clock }) {
  const { login, sendMessage } = config.rateLimits;
  return {
    // Every form that checks a password, counted per IP address.
    login: createRateLimiter({ ...login, clock }),
    // Every form that sends an email, counted per email address.
    sendMessage: createRateLimiter({ ...sendMessage, clock }),
  };
}

export const byIp = (req) => req.ip;
export const byEmailField = (req) => String(req.body?.email ?? '').trim().toLowerCase();

// Ready-made middleware for the two kinds of form in the app:
// forms that check a password...
export function limitAttempts(rateLimiters) {
  return rateLimit(rateLimiters.login, byIp);
}

// ...and forms that send an email.
export function limitMessageSending(rateLimiters) {
  return [rateLimit(rateLimiters.login, byIp), rateLimit(rateLimiters.sendMessage, byEmailField)];
}
