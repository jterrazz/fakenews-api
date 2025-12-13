import { z } from 'zod';

/**
 * Telemetry configuration schema
 * @description Validates OpenTelemetry configuration, reusable across projects
 */
export const telemetryConfigSchema = z.object({
    enabled: z.boolean().default(false),
    serviceName: z.string().default('unknown-service'),
    endpoint: z.string().url().optional(),
    resourceDetectors: z
        .array(z.enum(['env', 'host', 'os', 'process', 'container']))
        .default(['env', 'host', 'os']),
});

export type TelemetryConfig = z.infer<typeof telemetryConfigSchema>;

