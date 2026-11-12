import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryBaseOptions } from "@/lib/sentry/options";

if (SENTRY_DSN) Sentry.init(sentryBaseOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
