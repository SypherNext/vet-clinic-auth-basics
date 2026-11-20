// Starts the web server. Run it with `npm start`.
import { loadConfig } from './config.js';
import { systemClock } from './clock.js';
import { openDatabase } from './db/database.js';
import { createMailer } from './mail/mailer.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = openDatabase(config.databaseFile);
const clock = systemClock;
const mailer = createMailer(config.mail);

const app = createApp({ config, db, clock, mailer });

app.listen(config.port, config.host, () => {
  console.log(`Vet clinic portal running at ${config.appOrigin}`);
  if (config.mail.transport === 'smtp') {
    console.log(`Emails go to the SMTP server at ${config.mail.smtpHost}:${config.mail.smtpPort}`);
  }
});
