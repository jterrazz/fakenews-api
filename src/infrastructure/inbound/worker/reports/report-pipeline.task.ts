import { type LoggerPort } from '@jterrazz/logger';

import { type ReportPipelineTaskConfig } from '../../../../application/ports/inbound/configuration.port.js';

import { type TaskPort } from '../../../../application/ports/inbound/worker.port.js';
import { type GenerateArticlesFromReportsUseCase } from '../../../../application/use-cases/articles/generate-articles-from-reports.use-case.js';
import { type ClassifyReportsUseCase } from '../../../../application/use-cases/reports/classify-reports.use-case.js';
import { type IngestReportsUseCase } from '../../../../application/use-cases/reports/ingest-reports.use-case.js';

import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

export class ReportPipelineTask implements TaskPort {
    public readonly executeOnStartup = true;
    public readonly name = 'report-pipeline';
    public readonly schedule = '0 */2 * * *'; // Every 2 hours

    constructor(
        private readonly ingestReports: IngestReportsUseCase,
        private readonly generateArticlesFromReports: GenerateArticlesFromReportsUseCase,
        private readonly classifyReports: ClassifyReportsUseCase,
        private readonly taskConfigs: ReportPipelineTaskConfig[],
        private readonly logger: LoggerPort,
    ) {}

    async execute(): Promise<void> {
        this.logger.info('task:report-pipeline:start');

        try {
            this.logger.info('task:report-pipeline:config', {
                taskCount: this.taskConfigs.length,
                tasks: this.taskConfigs,
            });

            const languages = this.taskConfigs.map((config) => ({
                country: new Country(config.country),
                language: new Language(config.language),
            }));

            // Step 1: Ingest reports
            await Promise.all(
                languages.map(async ({ country, language }) => {
                    this.logger.info('task:report-pipeline:ingest', {
                        country: country.toString(),
                        language: language.toString(),
                    });
                    return this.ingestReports.execute(language, country);
                }),
            );

            this.logger.info('task:report-pipeline:ingest:done');

            // Step 2: Classify newly ingested reports
            await this.classifyReports.execute();

            this.logger.info('task:report-pipeline:classify:done');

            // Step 3: Generate articles from reports that have been classified
            await Promise.all(
                languages.map(async ({ country, language }) => {
                    this.logger.info('task:report-pipeline:generate', {
                        country: country.toString(),
                        language: language.toString(),
                    });
                    return this.generateArticlesFromReports.execute(language, country);
                }),
            );

            this.logger.info('task:report-pipeline:done');
        } catch (error) {
            this.logger.error('task:report-pipeline:error', { error });
            throw error;
        }
    }
}
