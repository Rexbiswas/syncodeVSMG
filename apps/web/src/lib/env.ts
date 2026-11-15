import { webEnvSchema, WebEnv } from '@syncode/validation';

export function getWebEnv(): WebEnv {
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  };

  const parsed = webEnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.warn('Web environment validation warning:', parsed.error.format());
    return {
      NODE_ENV: 'development',
      PORT: 3000,
      WEB_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_APP_NAME: 'SYNCODE',
      NEXT_PUBLIC_APP_VERSION: '0.1.0',
    };
  }

  return parsed.data;
}

export const env = getWebEnv();

