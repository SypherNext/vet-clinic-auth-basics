// Sends email. The rest of the app only ever calls mailer.send({ to, subject, text }),
// so it does not care which kind of mailer it was given:
//   - the SMTP mailer delivers to a mail server (Mailpit on your computer)
//   - the memory mailer keeps messages in a list, for tests and for running
//     without Docker (MAIL_TRANSPORT=memory prints each message to the terminal)
import nodemailer from 'nodemailer';

export function createSmtpMailer({ smtpHost, smtpPort, from }) {
  const transport = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: false });
  return {
    async send({ to, subject, text }) {
      await transport.sendMail({ from, to, subject, text });
    },
  };
}

export function createMemoryMailer({ from = 'test@vetclinic.test', print = false } = {}) {
  const sent = [];
  return {
    sent,
    async send({ to, subject, text }) {
      sent.push({ from, to, subject, text });
      if (print) console.log(`\n--- email to ${to} ---\nSubject: ${subject}\n\n${text}\n--- end of email ---\n`);
    },
  };
}

export function createMailer(mailConfig) {
  if (mailConfig.transport === 'memory') return createMemoryMailer({ from: mailConfig.from, print: true });
  return createSmtpMailer(mailConfig);
}
