import { type Counter, type Histogram, metrics } from '@opentelemetry/api';
import { context, type Span, SpanStatusCode, trace } from '@opentelemetry/api';

import type { TelemetryAttributes, TelemetryPort } from './telemetry.port.js';

/**
 * OpenTelemetry adapter implementing the TelemetryPort
 * @description Uses @opentelemetry/api for manual instrumentation alongside auto-instrumentation
 */
export class OpenTelemetryAdapter implements TelemetryPort {
    private readonly counters = new Map<string, Counter>();
    private readonly histograms = new Map<string, Histogram>();
    private readonly meter;
    private readonly tracer;

    constructor(serviceName = 'default') {
        this.tracer = trace.getTracer(serviceName);
        this.meter = metrics.getMeter(serviceName);
    }

    counter(name: string, value = 1, attributes?: TelemetryAttributes): void {
        let counter = this.counters.get(name);
        if (!counter) {
            counter = this.meter.createCounter(name);
            this.counters.set(name, counter);
        }
        counter.add(value, this.sanitizeAttributes(attributes));
    }

    event(name: string, attributes?: TelemetryAttributes): void {
        const currentSpan = trace.getActiveSpan();
        if (!currentSpan) {
            // No active span - event will be dropped. This is often intentional.
            return;
        }
        currentSpan.addEvent(name, this.sanitizeAttributes(attributes));
    }

    /**
     * Get the current context (useful for context propagation)
     */
    getCurrentContext() {
        return context.active();
    }

    /**
     * Get the current active span (useful for advanced use cases)
     */
    getCurrentSpan(): Span | undefined {
        return trace.getActiveSpan();
    }

    histogram(name: string, value: number, attributes?: TelemetryAttributes): void {
        let histogram = this.histograms.get(name);
        if (!histogram) {
            histogram = this.meter.createHistogram(name);
            this.histograms.set(name, histogram);
        }
        histogram.record(value, this.sanitizeAttributes(attributes));
    }

    setAttribute(key: string, value: boolean | number | string): void {
        const currentSpan = trace.getActiveSpan();
        if (!currentSpan) {
            // No active span - attribute will be dropped. This is often intentional.
            return;
        }
        currentSpan.setAttribute(key, value);
    }

    async span<T>(
        name: string,
        fn: () => Promise<T>,
        attributes?: TelemetryAttributes,
    ): Promise<T> {
        return this.tracer.startActiveSpan(name, async (span: Span) => {
            try {
                if (attributes) {
                    this.setSpanAttributes(span, attributes);
                }

                const result = await fn();

                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                span.recordException(error instanceof Error ? error : new Error(String(error)));
                throw error;
            } finally {
                span.end();
            }
        });
    }

    private sanitizeAttributes(
        attributes?: TelemetryAttributes,
    ): Record<string, boolean | number | string> {
        if (!attributes) return {};

        const sanitized: Record<string, boolean | number | string> = {};
        for (const [key, value] of Object.entries(attributes)) {
            if (value !== undefined) {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    private setSpanAttributes(span: Span, attributes: TelemetryAttributes): void {
        for (const [key, value] of Object.entries(attributes)) {
            if (value !== undefined) {
                span.setAttribute(key, value);
            }
        }
    }
}
