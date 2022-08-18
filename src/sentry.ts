import path from 'path';

import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { RewriteFrames } from '@sentry/integrations';

if (process.env.SENTRY_DSN) {
  console.log(`[Sentry] Connexion de Sentry...`);
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.Integrations.Modules(),
      new Sentry.Integrations.FunctionToString(),
      new Sentry.Integrations.LinkedErrors(),
      new Sentry.Integrations.Console(),
      new Sentry.Integrations.Http({ breadcrumbs: true, tracing: true }),
      new RewriteFrames({ root: path.join(__dirname, '..') })
    ]
  });
}

process.on('uncaughtException', (error) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(error);
  console.error(error);
});

process.on('unhandledRejection', (error) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(error);
  console.error(!(error instanceof Error) ? console.trace(error) : error);
});
