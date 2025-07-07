import { z } from 'zod/v4';

import { Category } from '../value-objects/category.vo.js';
import { Country } from '../value-objects/country.vo.js';
import { Classification } from '../value-objects/story/classification.vo.js';
import { StoryPerspective } from '../value-objects/story-perspective/story-perspective.vo.js';

export const factsSchema = z
    .string()
    .describe(
        'Facts are a concise, information-dense collection of essential data points, key actors, and the core narrative in ~50 words. Example: "Tesla CEO Musk acquires Twitter ($44B, Oct 2022), fires executives, adds $8 verification fee, restores suspended accounts, triggers advertiser exodus (GM, Pfizer), 75 % staff cuts, sparks free-speech vs. safety debate."',
    );

export const categorySchema = z
    .instanceof(Category)
    .describe('The primary category classification of the story.');

export const classificationSchema = z
    .instanceof(Classification)
    .describe('The editorial classification assigned to the story.');

export const countrySchema = z
    .instanceof(Country)
    .describe('The country where the story is relevant.');

export const createdAtSchema = z
    .date()
    .describe('The timestamp when the story was first created in the system.');

export const datelineSchema = z
    .date()
    .describe('The publication date of the story, typically based on the source articles.');

export const idSchema = z.uuid().describe('The unique identifier for the story.');

export const perspectivesSchema = z
    .array(z.instanceof(StoryPerspective))
    .describe('A list of different viewpoints or angles on the story.');

export const sourceReferencesSchema = z
    .array(z.string())
    .describe('A list of IDs from the original source articles used to create the story.');

export const updatedAtSchema = z.date().describe('The timestamp when the story was last updated.');

export const storySchema = z.object({
    category: categorySchema,
    classification: classificationSchema,
    country: countrySchema,
    createdAt: createdAtSchema,
    dateline: datelineSchema,
    facts: factsSchema,
    id: idSchema,
    perspectives: perspectivesSchema,
    sourceReferences: sourceReferencesSchema,
    updatedAt: updatedAtSchema,
});

export type StoryProps = z.input<typeof storySchema>;

/**
 * @description Represents a news story in the timeline of events
 */
export class Story {
    public readonly category: Category;
    public readonly classification: Classification;
    public readonly country: Country;
    public readonly createdAt: Date;
    public readonly dateline: Date;
    public readonly facts: string;
    public readonly id: string;
    public readonly perspectives: StoryPerspective[];
    public readonly sourceReferences: string[];
    public readonly updatedAt: Date;

    public constructor(data: StoryProps) {
        const result = storySchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid story data: ${result.error.message}`);
        }

        const validatedData = result.data;
        this.id = validatedData.id;
        this.facts = validatedData.facts;
        this.category = validatedData.category;
        this.perspectives = validatedData.perspectives;
        this.dateline = validatedData.dateline;
        this.sourceReferences = validatedData.sourceReferences;
        this.createdAt = validatedData.createdAt;
        this.updatedAt = validatedData.updatedAt;
        this.country = validatedData.country;
        this.classification = validatedData.classification;
    }
}
