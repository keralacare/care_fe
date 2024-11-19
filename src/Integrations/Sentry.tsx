import careConfig from "@careConfig";
import * as Sentry from "@sentry/browser";

export function initSentry() {
  if (!careConfig.sentry.dsn || !careConfig.sentry.environment) {
    console.error(
      "Sentry is not configured correctly. Please check your environment variables.",
    );
    return;
  }
  Sentry.init(careConfig.sentry);
}

/**
 * Captures an exception and sends it to Sentry for monitoring and logging.
 *
 * @param {any} error - The error object that needs to be captured and sent to Sentry.
 */
export function captureException(error: any) {
  Sentry.captureException(error);
}
