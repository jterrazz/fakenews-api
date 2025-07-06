import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type HolisticDigest } from '../../../../domain/value-objects/perspective/holistic-digest.vo.js';
import { type PerspectiveTags } from '../../../../domain/value-objects/perspective/perspective-tags.vo.js';

import { type NewsStory } from '../providers/news.port.js';

/**
 * @description
 * Port for the Story Ingestion Agent that processes raw news articles
 * into structured story data with perspectives and synopsis
 */
export interface StoryIngestionAgentPort {
    run(params: { newsStory: NewsStory }): Promise<null | StoryIngestionResult>;
}

/**
 * @description
 * Result of story ingestion containing structured perspectives and synopsis
 */
export interface StoryIngestionResult {
    category: Category;
    perspectives: Array<{
        holisticDigest: HolisticDigest;
        tags: PerspectiveTags;
    }>;
    synopsis: string;
}
