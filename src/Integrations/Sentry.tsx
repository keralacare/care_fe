import careConfig from "@careConfig";
import * as Sentry from "@sentry/browser";

export function initSentry() {
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
