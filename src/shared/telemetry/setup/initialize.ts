import { type TelemetryConfig, telemetryConfigSchema } from './config.js';

export interface InitializeTelemetryOptions {
    /**
     * Raw configuration object to parse with Zod
     */
    rawConfig: unknown;
}

/**
 * Initialize OpenTelemetry instrumentation
 * @description Sets environment variables and imports auto-instrumentation.
 *              Must be called in the instrumentation entry point loaded via --import.
 */
export async function initializeTelemetry(
    options: InitializeTelemetryOptions,
): Promise<null | TelemetryConfig> {
    const config = telemetryConfigSchema.parse(options.rawConfig);

    if (!config.enabled) {
        console.info('[Telemetry] Disabled by configuration');
        return null;
    }

    if (!config.endpoint) {
        console.warn('[Telemetry] Enabled but no endpoint configured, skipping');
        return null;
    }

    // Set environment variables BEFORE importing auto-instrumentation
    process.env.OTEL_SERVICE_NAME = config.serviceName;
    process.env.OTEL_TRACES_EXPORTER = 'otlp';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = config.endpoint;
    process.env.OTEL_NODE_RESOURCE_DETECTORS = config.resourceDetectors.join(',');

    // Import and register auto-instrumentation
    await import('@opentelemetry/auto-instrumentations-node/register');

    console.info('[Telemetry] Initialized', {
        serviceName: config.serviceName,
        endpoint: config.endpoint,
    });

    return config;
}
