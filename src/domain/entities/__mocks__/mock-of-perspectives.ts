import { HolisticDigest } from '../../value-objects/perspective/holistic-digest.vo.js';
import { PerspectiveTags } from '../../value-objects/perspective/perspective-tags.vo.js';
import { Perspective } from '../perspective.entity.js';

/**
 * Creates an array of mock perspectives for a given story
 */
export function mockPerspectives(count: number, storyId: string): Perspective[] {
    return Array.from({ length: count }, (_, index) => createMockPerspective(index, storyId));
}

/**
 * Creates a single mock perspective with the given parameters
 */
function createMockPerspective(index: number, storyId: string): Perspective {
    return new Perspective({
        createdAt: new Date(),
        holisticDigest: new HolisticDigest(
            `This is a detailed and complete holistic digest for perspective number ${index + 1}. It contains a comprehensive compilation of all information related to this specific viewpoint, including every argument, fact, and piece of evidence presented. This text is intentionally long to satisfy the minimum length validation requirements of the domain value object and to provide a realistic piece of text for testing purposes.`,
        ),
        id: crypto.randomUUID(),
        storyId,
        tags: new PerspectiveTags({
            stance: index % 2 === 0 ? 'critical' : 'supportive',
        }),
        updatedAt: new Date(),
    });
}
