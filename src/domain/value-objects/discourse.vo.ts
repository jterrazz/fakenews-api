import { z } from 'zod/v4';

export const discourseSchema = z.enum(['MAINSTREAM', 'ALTERNATIVE', 'UNDERREPORTED', 'DUBIOUS']);

export type DiscourseValue = z.infer<typeof discourseSchema>;

export class Discourse {
    public readonly value: DiscourseValue;

    constructor(value: string) {
        const res = discourseSchema.safeParse(value.toUpperCase() as unknown as DiscourseValue);
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
