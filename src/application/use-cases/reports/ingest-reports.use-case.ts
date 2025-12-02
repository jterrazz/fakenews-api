import { type LoggerPort } from '@jterrazz/logger';
import { randomUUID } from 'node:crypto';

// Domain
import { Report } from '../../../domain/entities/report.entity.js';
import { type Country } from '../../../domain/value-objects/country.vo.js';
import { type Language } from '../../../domain/value-objects/language.vo.js';
import { AngleNarrative } from '../../../domain/value-objects/report-angle/angle-narrative.vo.js';
import { ReportAngle } from '../../../domain/value-objects/report-angle/report-angle.vo.js';
import { Background } from '../../../domain/value-objects/report/background.vo.js';
import { Core } from '../../../domain/value-objects/report/core.vo.js';
import { DeduplicationState } from '../../../domain/value-objects/report/deduplication-state.vo.js';
import { ClassificationState } from '../../../domain/value-objects/report/tier-state.vo.js';

// Ports
import { type ReportIngestionAgentPort } from '../../ports/outbound/agents/report-ingestion.agent.js';
import { type ReportRepositoryPort } from '../../ports/outbound/persistence/report/report-repository.port.js';
import { type NewsProviderPort } from '../../ports/outbound/providers/news.port.js';

/**
 * Use case for digesting reports from news sources
 */
export class IngestReportsUseCase {
    private static readonly DAILY_TARGET = 14;

    constructor(
        private readonly reportIngestionAgent: ReportIngestionAgentPort,
        private readonly logger: LoggerPort,
        private readonly newsProvider: NewsProviderPort,
        private readonly reportRepository: ReportRepositoryPort,
    ) {}

    /**
     * Digest reports for a specific language and country
     */
    public async execute(language: Language, country: Country): Promise<Report[]> {
        try {
            this.logger.info('Starting report ingestion', {
                country: country.toString(),
                language: language.toString(),
            });

            // Step 1: Get today's report count for dynamic thresholds
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const todayReportCount = await this.reportRepository.countByDateRange(
                country,
                todayStart,
                new Date(),
            );

            const { minArticles, maxReportsPerRun } = this.getDynamicThresholds(todayReportCount);

            this.logger.info('Dynamic thresholds calculated', {
                maxReportsPerRun,
                minArticles,
                todayReportCount,
            });

            // Step 2: Get existing source IDs for deduplication
            const existingSourceReferences =
                await this.reportRepository.getAllSourceReferences(country);

            // Step 3: Fetch news from external providers
            const newsStories = await this.newsProvider.fetchNews({
                country,
                language,
            });

            if (newsStories.length === 0) {
                this.logger.warn('No news reports fetched', {
                    country: country.toString(),
                    language: language.toString(),
                });
                return [];
            }
            this.logger.info('Fetched news reports', { count: newsStories.length });

            // Step 4: Filter by dynamic article threshold
            const articleFilteredReports = newsStories.filter(
                (report) => report.articles.length >= minArticles,
            );

            if (articleFilteredReports.length === 0) {
                this.logger.warn('No valid reports after article-count filtering', {
                    minArticles,
                });
                return [];
            }

            this.logger.info('Valid reports after article-count filtering', {
                count: articleFilteredReports.length,
                minArticles,
            });

            // Step 5: Filter out reports that have already been processed by source ID
            const newNewsReports = articleFilteredReports.filter(
                (report) =>
                    !report.articles.some((article) =>
                        existingSourceReferences.includes(article.id),
                    ),
            );

            if (newNewsReports.length === 0) {
                this.logger.info('No non-duplicate reports found');
                return [];
            }

            this.logger.info('Valid reports after source deduplication', {
                count: newNewsReports.length,
            });

            // Step 6: Prioritize by article count and limit to max per run
            const prioritizedReports = newNewsReports
                .sort((a, b) => b.articles.length - a.articles.length)
                .slice(0, maxReportsPerRun);

            this.logger.info('Reports selected for ingestion', {
                available: newNewsReports.length,
                selected: prioritizedReports.length,
            });

            // Step 7: Process each selected news report
            const digestedReports: Report[] = [];

            for (const newsReport of prioritizedReports) {
                try {
                    // Step 7.1: Ingest the report
                    const ingestionResult = await this.reportIngestionAgent.run({ newsReport });
                    if (!ingestionResult) {
                        this.logger.warn('Ingestion agent returned no result', {
                            articleCount: newsReport.articles.length,
                        });
                        continue;
                    }

                    const reportId = randomUUID();
                    const now = new Date();
                    const angles = ingestionResult.angles.map(
                        (angle) =>
                            new ReportAngle({
                                narrative: new AngleNarrative(angle.narrative),
                            }),
                    );

                    const report = new Report({
                        angles,
                        background: new Background(ingestionResult.background),
                        categories: ingestionResult.categories,
                        classificationState: new ClassificationState('PENDING'), // Will be set during classification
                        core: new Core(ingestionResult.core),
                        country,
                        createdAt: now,
                        dateline: newsReport.publishedAt,
                        // Deduplication will be performed in a separate step
                        deduplicationState: new DeduplicationState('PENDING'),
                        id: reportId,
                        sourceReferences: newsReport.articles.map((a) => a.id),
                        tier: undefined, // Will be set during classification
                        // traits: undefined - will be set during classification
                        updatedAt: now,
                    });

                    // Step 7.2: Persist the report
                    const savedReport = await this.reportRepository.create(report);
                    digestedReports.push(savedReport);
                    this.logger.info('Report ingested successfully', {
                        reportId: savedReport.id,
                    });
                } catch (reportError) {
                    this.logger.warn('Error while processing individual report', {
                        error: reportError,
                    });
                }
            }

            return digestedReports;
        } catch (error) {
            this.logger.error('Report ingestion encountered an error', { error });
            throw error;
        }
    }

    /**
     * Calculate dynamic thresholds based on how many reports exist today.
     * Morning: lenient → Evening: strict → At quota: only blockbusters.
     */
    private getDynamicThresholds(todayReportCount: number): {
        maxReportsPerRun: number;
        minArticles: number;
    } {
        const remaining = IngestReportsUseCase.DAILY_TARGET - todayReportCount;

        // Daily quota reached - only exceptional breaking news
        if (remaining <= 0) {
            return { maxReportsPerRun: 1, minArticles: 30 };
        }
        // Almost full - very strict
        if (remaining <= 2) {
            return { maxReportsPerRun: 1, minArticles: 22 };
        }
        // Afternoon/evening
        if (remaining <= 5) {
            return { maxReportsPerRun: 1, minArticles: 16 };
        }
        // Mid-day
        if (remaining <= 9) {
            return { maxReportsPerRun: 2, minArticles: 12 };
        }
        // Morning - build coverage
        return { maxReportsPerRun: 3, minArticles: 8 };
    }
}
