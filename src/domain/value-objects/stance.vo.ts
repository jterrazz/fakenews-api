import { z } from 'zod/v4';

export const stanceSchema = z.enum([
    'supportive',
    'critical',
    'neutral',
    'mixed',
    'concerned',
    'optimistic',
    'skeptical',
]);

export type StanceValue = z.infer<typeof stanceSchema>;

/**
 * @description Domain value object representing a stance toward a story.
 */
export class Stance {
    public readonly value: StanceValue;

    constructor(value: StanceValue) {
        const res = stanceSchema.safeParse(value);
        if (!res.success) throw new Error(`Invalid stance: ${res.error.message}`);
        this.value = res.data;
    }

    public toString(): string {
        return this.value;
    }

    public valueOf(): string {
        return this.value;
    }
}
