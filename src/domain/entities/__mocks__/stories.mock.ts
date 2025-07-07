import { randomUUID } from 'crypto';

import { getCategory } from '../../value-objects/__mocks__/categories.mock.js';
import { getCountry } from '../../value-objects/__mocks__/countries.mock.js';
import { getClassification } from '../../value-objects/story/__mocks__/classifications.mock.js';
import { mockStoryPerspectives as mockPerspectives } from '../../value-objects/story-perspective/__mocks__/story-perspectives.mock.js';
import { type StoryPerspective } from '../../value-objects/story-perspective/story-perspective.vo.js';
import { Story } from '../story.entity.js';

/**
 * Generates an array of mock `Story` entities.
 */
export function getMockStories(count: number): Story[] {
    return Array.from({ length: count }, (_, index) => createMockStory(index));
}

/**
 * Generates a single mock `Story` with optional overrides.
 */
export function getMockStory(options?: {
    categoryIndex?: number;
    classificationIndex?: number;
    countryIndex?: number;
    id?: string;
    perspectives?: StoryPerspective[];
}): Story {
    const storyId = options?.id || randomUUID();
    return new Story({
        category:
            options?.categoryIndex !== undefined
                ? getCategory(options.categoryIndex)
                : getCategory(0),
        classification:
            options?.classificationIndex !== undefined
                ? getClassification(options.classificationIndex)
                : getClassification(2),
        country:
            options?.countryIndex !== undefined ? getCountry(options.countryIndex) : getCountry(0),
        createdAt: new Date(),
        dateline: new Date(),
        facts: 'Mock Story Facts: A comprehensive list of key political developments across multiple regions, outlining actors, timelines, and data points that shape the public discourse on this evolving situation.',
        id: storyId,
        perspectives: options?.perspectives || mockPerspectives(1),
        sourceReferences: ['worldnewsapi:mock-article-1', 'worldnewsapi:mock-article-2'],
        updatedAt: new Date(),
    });
}

function createMockStory(index: number): Story {
    const category = getCategory(index);
    const classification = getClassification(index + 1);
    const storyId = randomUUID();
    return new Story({
        category,
        classification,
        country: getCountry(index + 1),
        createdAt: new Date(),
        dateline: new Date(),
        facts: `These are key facts for story ${index}. Topic: ${category.toString()}. It lists all major events, actors, and evidence in a concise factual format long enough to satisfy validation requirements.`,
        id: storyId,
        perspectives: mockPerspectives(2),
        sourceReferences: [`source-ref-${index}`],
        updatedAt: new Date(),
    });
}
