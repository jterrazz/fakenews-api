import { type Story } from '../../../../domain/entities/story.entity.js';
import {
    Classification,
    classificationSchema,
} from '../../../../domain/value-objects/story/classification.vo.js';

export { Classification, classificationSchema };

/**
 * @description
 * Port for the Story Classification Agent that determines story priority and audience relevance
 */
export interface StoryClassificationAgentPort {
    run(input: StoryClassificationInput): Promise<null | StoryClassificationResult>;
}

/**
 * @description
 * Input data required for story classification
 */
export interface StoryClassificationInput {
    story: Story;
}

/**
 * @description
 * Result of story classification containing the assigned classification and reasoning
 */
export interface StoryClassificationResult {
    classification: Classification;
    reason: string;
}
