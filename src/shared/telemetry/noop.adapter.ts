import type { TelemetryAttributes, TelemetryPort } from './telemetry.port.js';

/**
 * No-operation telemetry adapter for testing or disabled telemetry
 * @description All methods are no-ops, useful for unit tests or when telemetry is disabled
 */
export class NoopTelemetryAdapter implements TelemetryPort {
    counter(_name: string, _value?: number, _attributes?: TelemetryAttributes): void {
        // No-op
    }

    event(_name: string, _attributes?: TelemetryAttributes): void {
        // No-op
    }

    histogram(_name: string, _value: number, _attributes?: TelemetryAttributes): void {
        // No-op
    }

    setAttribute(_key: string, _value: boolean | number | string): void {
        // No-op
    }

    async span<T>(
        _name: string,
        fn: () => Promise<T>,
        _attributes?: TelemetryAttributes,
    ): Promise<T> {
        return fn();
    }
}
