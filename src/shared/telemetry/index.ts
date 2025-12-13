// =============================================================================
// SETUP (Configuration & Initialization)
// =============================================================================

export {
    initializeTelemetry,
    type InitializeTelemetryOptions,
    type TelemetryConfig,
    telemetryConfigSchema,
} from './setup/index.js';

// =============================================================================
// SDK (Port & Adapters)
// =============================================================================

export {
    NoopTelemetryAdapter,
    OpenTelemetryAdapter,
    type TelemetryAttributes,
    type TelemetryPort,
} from './sdk/index.js';
