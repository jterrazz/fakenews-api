import { z } from 'zod/v4';

import { Discourse } from '../../discourse.vo.js';
import { Stance } from '../../stance.vo.js';

import { Corpus } from './corpus.vo.js';

export const storyPerspectiveSchema = z.object({
    discourse: z.instanceof(Discourse),
    perspectiveCorpus: z.instanceof(Corpus),
    stance: z.instanceof(Stance),
});

export type StoryPerspectiveData = z.input<typeof storyPerspectiveSchema>;

/**
 * @description A value object representing a unique viewpoint on a story.
 * It contains the complete digest of that viewpoint plus its descriptive tags.
 * It purposefully has **no identity of its own** – two perspectives
 * with the same digest & tags are considered equal.
 */
export class StoryPerspective {
    public readonly discourse: Discourse;
    public readonly perspectiveCorpus: Corpus;
    public readonly stance: Stance;

    constructor(data: StoryPerspectiveData) {
        const result = storyPerspectiveSchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid story perspective data: ${result.error.message}`);
        }

        const validated = result.data;
        this.perspectiveCorpus = validated.perspectiveCorpus;
        this.stance = validated.stance;
        this.discourse = validated.discourse;
    }
}
