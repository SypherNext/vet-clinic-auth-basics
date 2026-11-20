// Every setting the app reads, in one place. Values come from environment
// variables (or a .env file), with defaults that work on your own computer.
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

export const CLINIC_NAME = 'Maple Street Vet Clinic';

export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 18820);
  return {
    port,
    // 127.0.0.1 means "only this computer can connect".
    host: env.HOST ?? '127.0.0.1',
    // The address you type in the browser.
    appOrigin: env.APP_ORIGIN ?? `http://localhost:${port}`,
    databaseFile: env.DATABASE_FILE ?? path.join(root, 'data', 'vet-clinic.db'),
    clinicName: CLINIC_NAME,
  };
}
