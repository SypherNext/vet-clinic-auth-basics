// A SIMULATED text message service. Nothing is sent to a real phone.
// Messages are saved in the sms_outbox table and shown on the developer page
// /dev/sms-outbox. A real app would pass in an object with the same send()
// method that calls an SMS provider's API instead.
export function createSmsOutbox({ db, clock }) {
  return {
    async send({ to, body }) {
      db.prepare('INSERT INTO sms_outbox (to_phone, body, created_at) VALUES (?, ?, ?)').run(to, body, clock.now());
    },
    latest(limit = 20) {
      return db.prepare('SELECT * FROM sms_outbox ORDER BY id DESC LIMIT ?').all(limit);
    },
  };
}
