import { z } from 'zod/v4';

export const discourseSchema = z.enum(['mainstream', 'alternative', 'underreported', 'dubious']);

export type DiscourseValue = z.infer<typeof discourseSchema>;

export class Discourse {
    public readonly value: DiscourseValue;

    constructor(value: DiscourseValue) {
        const res = discourseSchema.safeParse(value);
        if (!res.success) throw new Error(`Invalid discourse type: ${res.error.message}`);
        this.value = res.data;
    }

    public toString(): string {
        return this.value;
    }

    public valueOf(): string {
        return this.value;
    }
}
