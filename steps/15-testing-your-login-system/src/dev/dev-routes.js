// Pages that exist only on a developer's computer (config.devTools is false
// in production). The SMS outbox shows the SIMULATED text messages.
import express from 'express';

export function devRoutes(deps) {
  const router = express.Router();
  if (!deps.config.devTools) return router;

  router.get('/dev/sms-outbox', (req, res) => {
    res.render('sms-outbox', { messages: deps.sms.latest() });
  });

  return router;
}
