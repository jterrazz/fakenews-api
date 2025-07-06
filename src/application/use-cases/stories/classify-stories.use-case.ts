import { type LoggerPort } from '@jterrazz/logger';

import { type StoryClassificationAgentPort } from '../../ports/outbound/agents/story-classification.agent.js';
import { type StoryRepositoryPort } from '../../ports/outbound/persistence/story-repository.port.js';

/**
 * Use case for classifying stories
 * @description Reviews stories that are pending classification and assigns them appropriate classifications
 */
export class ClassifyStoriesUseCase {
    constructor(
        private readonly storyClassificationAgent: StoryClassificationAgentPort,
        private readonly logger: LoggerPort,
        private readonly storyRepository: StoryRepositoryPort,
    ) {}

    /**
     * Execute the story classification process
     * @description Finds stories pending classification and processes them through the AI agent
     */
    public async execute(): Promise<void> {
        this.logger.info('Starting story classification process...');

        let successfulClassifications = 0;
        let failedClassifications = 0;

        try {
            // Fetch stories that need to be classified
            const storiesToReview = await this.storyRepository.findMany({
                limit: 50,
                where: { classification: 'PENDING_CLASSIFICATION' },
            });

            if (storiesToReview.length === 0) {
                this.logger.info('No stories found pending classification.');
                return;
            }

            this.logger.info(`Found ${storiesToReview.length} stories to classify.`);

            // Process each story through the classification agent
            for (const story of storiesToReview) {
                try {
                    const result = await this.storyClassificationAgent.run({ story });

                    if (result) {
                        await this.storyRepository.update(story.id, {
                            classification: result.classification,
                        });

                        this.logger.info(
                            `Story ${story.id} classified as ${result.classification}: ${result.reason}`,
                        );
                        successfulClassifications++;
                    } else {
                        this.logger.warn(
                            `Failed to classify story ${story.id}: AI agent returned null.`,
                        );
                        failedClassifications++;
                    }
                } catch (error) {
                    this.logger.error(`Error classifying story ${story.id}`, { error });
                    failedClassifications++;
                }
            }
        } catch (error) {
            this.logger.error('Story classification process failed with an unhandled error.', {
                error,
            });
            throw error;
        }

        this.logger.info('Story classification process finished.', {
            failed: failedClassifications,
            successful: successfulClassifications,
            totalReviewed: successfulClassifications + failedClassifications,
        });
    }
}
