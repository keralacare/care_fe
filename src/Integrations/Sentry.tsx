import careConfig from "@careConfig";
import * as Sentry from "@sentry/browser";

export function initSentry() {
  if (!careConfig.sentry.dsn || !careConfig.sentry.environment) {
    console.error(
      `Sentry configuration incomplete: ${[
        !careConfig.sentry.dsn && "DSN",
        !careConfig.sentry.environment && "environment",
      ]
        .filter(Boolean)
        .join(", ")} missing`,
    );
    return;
  }
  Sentry.init(careConfig.sentry);
}

/**
 * Captures an exception and sends it to Sentry for monitoring and logging.
 *
 * @param {Error | unknown} error - The error object that needs to be captured and sent to Sentry.
 */
export function captureException(error: Error | unknown) {
  Sentry.captureException(error);
}
