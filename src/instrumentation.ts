import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryBaseOptions } from "@/lib/sentry/options";

export async function register() {
  if (!SENTRY_DSN) return;
  Sentry.init(sentryBaseOptions);
}

// Server Components / Route Handlers / Server Actions 的未捕捉錯誤
export const onRequestError = Sentry.captureRequestError;
