import { type LoggerPort } from '@jterrazz/logger';

import { type ReportClassificationAgentPort } from '../../ports/outbound/agents/report-classification.agent.js';
import { type ReportRepositoryPort } from '../../ports/outbound/persistence/report-repository.port.js';

/**
 * Use case for classifying reports
 * @description Reviews reports that are pending classification and assigns them appropriate classifications
 */
export class ClassifyReportsUseCase {
    constructor(
        private readonly reportClassificationAgent: ReportClassificationAgentPort,
        private readonly logger: LoggerPort,
        private readonly reportRepository: ReportRepositoryPort,
    ) {}

    /**
     * Execute the report classification process
     * @description Finds reports pending classification and processes them through the AI agent
     */
    public async execute(): Promise<void> {
        this.logger.info('report:classify:start');

        let successfulClassifications = 0;
        let failedClassifications = 0;

        try {
            // Fetch reports that need to be classified
            const reportsToReview = await this.reportRepository.findMany({
                limit: 50,
                where: { classification: 'PENDING_CLASSIFICATION' },
            });

            if (reportsToReview.length === 0) {
                this.logger.info('report:classify:none');
                return;
            }

            this.logger.info('report:classify:found', { count: reportsToReview.length });

            // Process each report through the classification agent
            for (const report of reportsToReview) {
                try {
                    const result = await this.reportClassificationAgent.run({ report });

                    if (result) {
                        await this.reportRepository.update(report.id, {
                            classification: result.classification,
                        });

                        this.logger.info('report:classify:classified', {
                            classification: result.classification,
                            reason: result.reason,
                            reportId: report.id,
                        });
                        successfulClassifications++;
                    } else {
                        this.logger.warn('report:classify:agent-null', { reportId: report.id });
                        failedClassifications++;
                    }
                } catch (error) {
                    this.logger.error('report:classify:error', { error, reportId: report.id });
                    failedClassifications++;
                }
            }
        } catch (error) {
            this.logger.error('report:classify:unhandled-error', {
                error,
            });
            throw error;
        }

        this.logger.info('report:classify:done', {
            failed: failedClassifications,
            successful: successfulClassifications,
            totalReviewed: successfulClassifications + failedClassifications,
        });
    }
}
