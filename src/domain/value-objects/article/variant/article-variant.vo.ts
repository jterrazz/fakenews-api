import { z } from 'zod/v4';

import { Discourse } from '../../discourse.vo.js';
import { Stance } from '../../stance.vo.js';
import { Body } from '../body.vo.js';
import { Headline } from '../headline.vo.js';

export const articleVariantSchema = z.object({
    body: z.instanceof(Body),
    discourse: z.instanceof(Discourse),
    headline: z.instanceof(Headline),
    stance: z.instanceof(Stance),
});

export type ArticleVariantData = z.input<typeof articleVariantSchema>;

/**
 * @description Represents a specific viewpoint variant of an article
 */
export class ArticleVariant {
    public readonly body: Body;
    public readonly discourse: Discourse;
    public readonly headline: Headline;
    public readonly stance: Stance;

    constructor(data: ArticleVariantData) {
        const result = articleVariantSchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid article variant data: ${result.error.message}`);
        }

        const validatedData = result.data;
        this.headline = validatedData.headline;
        this.body = validatedData.body;
        this.stance = validatedData.stance;
        this.discourse = validatedData.discourse;
    }
}
