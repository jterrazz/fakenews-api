import { z } from 'zod/v4';

export const authenticitySchema = z
    .object({
        falsificationReason: z.string().nullable().default(null),
        isFalsified: z.boolean().default(false),
    })
    .refine((data) => !data.isFalsified || (data.isFalsified && data.falsificationReason), {
        message: 'Falsified articles must include a falsificationReason',
        path: ['falsificationReason'],
    });

export class Authenticity {
    public readonly falsificationReason: null | string;
    public readonly isFalsified: boolean;

    constructor(isFalsified: boolean, falsificationReason: null | string = null) {
        const result = authenticitySchema.safeParse({ falsificationReason, isFalsified });

        if (!result.success) {
            throw new Error(`Invalid authenticity: ${result.error.message}`);
        }

        this.isFalsified = result.data.isFalsified;
        this.falsificationReason = result.data.falsificationReason;
    }

    public toString(): string {
        return this.isFalsified
            ? `Falsified article (Reason: ${this.falsificationReason})`
            : 'Authentic article';
    }
}
