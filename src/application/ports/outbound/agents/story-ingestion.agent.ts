import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type DiscourseValue } from '../../../../domain/value-objects/discourse.vo.js';
import { type StanceValue } from '../../../../domain/value-objects/stance.vo.js';

import { type NewsStory } from '../providers/news.port.js';

/**
 * @description
 * Port for the Story Ingestion Agent that processes raw news articles
 * into structured story data with perspectives and facts
 */
export interface StoryIngestionAgentPort {
    run(params: { newsStory: NewsStory }): Promise<null | StoryIngestionResult>;
}

/**
 * @description
 * Result of story ingestion containing structured perspectives and facts
 */
export interface StoryIngestionResult {
    category: Category;
    facts: string;
    perspectives: Array<{
        discourse: DiscourseValue;
        perspectiveCorpus: string;
        stance: StanceValue;
    }>;
}
