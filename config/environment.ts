import 'dotenv/config';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

export const environment = {
  baseUrl: process.env.BASE_URL?.trim() || getRequiredEnv('LMS_BASE_URL'),
  credentials: () => ({
    username: getRequiredEnv('LMS_USERNAME'),
    password: getRequiredEnv('LMS_PASSWORD'),
  }),
} as const;
