import { type NewsStory } from '../providers/news.port.js';

export interface ReportDeduplicationAgentPort {
    readonly name: string;
    run(params: {
        existingStories: Array<{ facts: string; id: string }>;
        newStory: NewsStory;
    }): Promise<null | ReportDeduplicationResult>;
}

/**
 * Defines the contract for the Report Deduplication Agent.
 * This agent is responsible for determining if a new report is a semantic
 * duplicate of an existing one.
 */
export type ReportDeduplicationResult = {
    /** The ID of the existing report if it's a duplicate, otherwise null. */
    duplicateOfStoryId: null | string;
};

// Legacy exports for backward compatibility during migration
export type StoryDeduplicationAgentPort = ReportDeduplicationAgentPort;
export type StoryDeduplicationResult = ReportDeduplicationResult;
