/**
 * Instrumentation entry point
 * @description Load via: node --import ./dist/instrumentation.js
 */
import config from 'config';

import { initializeTelemetry } from './shared/telemetry/index.js';

await initializeTelemetry({
    rawConfig: config.get('outbound.telemetry'),
});

