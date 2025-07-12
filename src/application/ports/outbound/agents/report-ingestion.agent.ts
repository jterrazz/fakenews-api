import { type Category } from '../../../../domain/value-objects/category.vo.js';
import { type DiscourseValue } from '../../../../domain/value-objects/discourse.vo.js';
import { type StanceValue } from '../../../../domain/value-objects/stance.vo.js';

import { type NewsStory } from '../providers/news.port.js';

/**
 * @description
 * Port for the Report Ingestion Agent that processes raw news articles
 * into structured report data with angles and facts
 */
export interface ReportIngestionAgentPort {
    run(params: { newsStory: NewsStory }): Promise<null | ReportIngestionResult>;
}

/**
 * @description
 * Result of report ingestion containing structured angles and facts
 */
export interface ReportIngestionResult {
    angles: Array<{
        angleCorpus: string;
        discourse: DiscourseValue;
        stance: StanceValue;
    }>;
    category: Category;
    facts: string;
}

// Legacy exports for backward compatibility during migration
export type StoryIngestionAgentPort = ReportIngestionAgentPort;
export type StoryIngestionResult = ReportIngestionResult;
