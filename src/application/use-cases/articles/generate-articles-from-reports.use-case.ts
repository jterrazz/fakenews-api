import { type LoggerPort } from '@jterrazz/logger';
import { randomUUID } from 'crypto';

import { Article } from '../../../domain/entities/article.entity.js';
import { Authenticity } from '../../../domain/value-objects/article/authenticity.vo.js';
import { Body } from '../../../domain/value-objects/article/body.vo.js';
import { Headline } from '../../../domain/value-objects/article/headline.vo.js';
import { ArticleFrame } from '../../../domain/value-objects/article-frame/article-frame.vo.js';
import { type Country } from '../../../domain/value-objects/country.vo.js';
import { Discourse } from '../../../domain/value-objects/discourse.vo.js';
import { type Language } from '../../../domain/value-objects/language.vo.js';
import { Stance } from '../../../domain/value-objects/stance.vo.js';

import {
    type ArticleCompositionAgentPort,
    type ArticleCompositionInput,
} from '../../ports/outbound/agents/article-composition.agent.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';
import { type ReportRepositoryPort } from '../../ports/outbound/persistence/report-repository.port.js';

/**
 * Use case for generating articles from reports that don't have articles yet
 * @description Transforms reports into user-facing articles using AI composition
 */
export class GenerateArticlesFromReportsUseCase {
    constructor(
        private readonly articleCompositionAgent: ArticleCompositionAgentPort,
        private readonly logger: LoggerPort,
        private readonly reportRepository: ReportRepositoryPort,
        private readonly articleRepository: ArticleRepositoryPort,
    ) {}

    /**
     * Generate articles from reports that don't have articles yet
     * @param language - Target language for article composition
     * @param country - Target country for article composition
     * @returns Array of generated articles
     */
    public async execute(language: Language, country: Country): Promise<Article[]> {
        try {
            this.logger.info('article:generate:start', {
                country: country.toString(),
                language: language.toString(),
            });

            // Find reports that are ready for article generation
            const reportsToProcess = await this.reportRepository.findStoriesWithoutArticles({
                classification: ['STANDARD', 'NICHE'],
                country: country.toString(),
                limit: 20, // Process in batches to avoid overwhelming the AI agent
            });

            if (reportsToProcess.length === 0) {
                this.logger.info('article:generate:none', {
                    country: country.toString(),
                    language: language.toString(),
                });
                return [];
            }

            this.logger.info('article:generate:found', { count: reportsToProcess.length });

            // Generate articles for each report
            const generatedArticles: Article[] = [];

            for (const report of reportsToProcess) {
                try {
                    const compositionInput: ArticleCompositionInput = {
                        report: report,
                        targetCountry: country,
                        targetLanguage: language,
                    };

                    // Generate article using AI agent
                    const compositionResult =
                        await this.articleCompositionAgent.run(compositionInput);

                    if (!compositionResult) {
                        this.logger.warn('article:generate:agent-null', {
                            country: country.toString(),
                            language: language.toString(),
                            reportId: report.id,
                        });
                        continue;
                    }

                    // Create article frames from composition result
                    const frames = compositionResult.variants.map(
                        (variantData) =>
                            new ArticleFrame({
                                body: new Body(variantData.body),
                                discourse: new Discourse(variantData.discourse),
                                headline: new Headline(variantData.headline),
                                stance: new Stance(variantData.stance),
                            }),
                    );

                    // Create article domain entity
                    const article = new Article({
                        authenticity: new Authenticity(false), // Always neutral/factual articles
                        body: new Body(compositionResult.body),
                        category: report.category,
                        country,
                        // Link back to the source report
                        frames,

                        headline: new Headline(compositionResult.headline),

                        id: randomUUID(),

                        language,

                        publishedAt: report.dateline,
                        // Use report's dateline as article publication date
                        reportIds: [report.id], // Include the frames
                    });

                    // Save the article
                    await this.articleRepository.createMany([article]);

                    this.logger.info('article:generate:composed', {
                        articleId: article.id,
                        country: country.toString(),
                        framesCount: frames.length,
                        headline: article.headline.value,
                        language: language.toString(),
                        reportId: report.id,
                    });

                    generatedArticles.push(article);
                } catch (articleError) {
                    this.logger.warn('article:generate:error', {
                        country: country.toString(),
                        error: articleError,
                        language: language.toString(),
                        reportId: report.id,
                    });
                    // Continue processing other reports even if one fails
                }
            }

            this.logger.info('article:generate:done', {
                country: country.toString(),
                generatedCount: generatedArticles.length,
                language: language.toString(),
                processedCount: reportsToProcess.length,
            });

            return generatedArticles;
        } catch (error) {
            this.logger.error('article:generate:error', {
                country: country.toString(),
                error,
                language: language.toString(),
            });
            throw error;
        }
    }
}
