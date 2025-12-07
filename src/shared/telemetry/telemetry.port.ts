/**
 * Attributes that can be attached to spans, metrics, and events
 */
export type TelemetryAttributes = Record<string, string | number | boolean | undefined>;

/**
 * Telemetry port providing unified observability capabilities
 * @description Abstracts tracing, metrics, and events for any backend (OpenTelemetry, etc.)
 */
export interface TelemetryPort {
    /**
     * Execute a function within a traced span
     * @param name - Span name (e.g., "Api/WorldNews/FetchNews")
     * @param fn - Function to execute within the span
     * @param attributes - Optional attributes to attach to the span
     * @returns Promise resolving to the function's return value
     */
    span<T>(name: string, fn: () => Promise<T>, attributes?: TelemetryAttributes): Promise<T>;

    /**
     * Increment a counter metric
     * @param name - Metric name (e.g., "api.requests.count")
     * @param value - Value to increment by (default: 1)
     * @param attributes - Optional attributes for the metric
     */
    counter(name: string, value?: number, attributes?: TelemetryAttributes): void;

    /**
     * Record a histogram value (for timing, sizes, etc.)
     * @param name - Metric name (e.g., "api.request.duration")
     * @param value - Value to record
     * @param attributes - Optional attributes for the metric
     */
    histogram(name: string, value: number, attributes?: TelemetryAttributes): void;

    /**
     * Add an event to the current span
     * @param name - Event name
     * @param attributes - Optional event attributes
     */
    event(name: string, attributes?: TelemetryAttributes): void;

    /**
     * Set an attribute on the current span
     * @param key - Attribute key
     * @param value - Attribute value
     */
    setAttribute(key: string, value: string | number | boolean): void;
}

