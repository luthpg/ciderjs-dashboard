import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    GA4_SERVICE_ACCOUNT_KEY: z.string().min(1),
    GA4_PROPERTY_ID: z.string().min(1),
    GITHUB_TOKEN: z.string().min(1),
    QIITA_TOKEN: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_USER_NAME: z.string().min(1),
    NEXT_PUBLIC_OSS_PACKAGES: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_USER_NAME: process.env.USER_NAME,
    NEXT_PUBLIC_OSS_PACKAGES: process.env.NEXT_PUBLIC_OSS_PACKAGES,
    GA4_SERVICE_ACCOUNT_KEY: process.env.GA4_SERVICE_ACCOUNT_KEY,
    GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    QIITA_TOKEN: process.env.QIITA_TOKEN,
  },
});
