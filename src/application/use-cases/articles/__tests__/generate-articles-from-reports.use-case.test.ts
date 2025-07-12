import { type LoggerPort } from '@jterrazz/logger';
import { beforeEach, describe, expect, test } from '@jterrazz/test';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { getMockReports } from '../../../../domain/entities/__mocks__/reports.mock.js';
import { type Report } from '../../../../domain/entities/report.entity.js';
import { Category } from '../../../../domain/value-objects/category.vo.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import {
    type ArticleCompositionAgentPort,
    type ArticleCompositionResult,
} from '../../../ports/outbound/agents/article-composition.agent.js';
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';
import { type ReportRepositoryPort } from '../../../ports/outbound/persistence/report-repository.port.js';

import { GenerateArticlesFromReportsUseCase } from '../generate-articles-from-reports.use-case.js';

describe('GenerateArticlesFromReportsUseCase', () => {
    // Test constants
    const DEFAULT_COUNTRY = new Country('us');
    const DEFAULT_LANGUAGE = new Language('en');
    const TEST_REPORTS_COUNT = 3;

    // Test fixtures
    let mockArticleCompositionAgent: DeepMockProxy<ArticleCompositionAgentPort>;
    let mockLogger: DeepMockProxy<LoggerPort>;
    let mockReportRepository: DeepMockProxy<ReportRepositoryPort>;
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let useCase: GenerateArticlesFromReportsUseCase;
    let testReports: Report[];
    let mockCompositionResults: ArticleCompositionResult[];

    beforeEach(() => {
        mockArticleCompositionAgent = mock<ArticleCompositionAgentPort>();
        mockLogger = mock<LoggerPort>();
        mockReportRepository = mock<ReportRepositoryPort>();
        mockArticleRepository = mock<ArticleRepositoryPort>();

        useCase = new GenerateArticlesFromReportsUseCase(
            mockArticleCompositionAgent,
            mockLogger,
            mockReportRepository,
            mockArticleRepository,
        );

        testReports = getMockReports(TEST_REPORTS_COUNT);

        // Create mock composition results
        mockCompositionResults = testReports.map((report, index) => ({
            body: `Composed article body for report ${index + 1} with neutral presentation of facts from all angles.`,
            category: report.category,
            headline: `Composed Article ${index + 1}`,
            variants: [
                {
                    body: `Variant article body for report ${index + 1} presenting a specific viewpoint on the matter.`,
                    discourse: 'MAINSTREAM',
                    headline: `${report.category.toString()} Angle: ${index + 1}`,
                    stance: 'NEUTRAL',
                },
            ],
        }));

        // Default mock responses
        mockReportRepository.findStoriesWithoutArticles.mockResolvedValue(testReports);
        mockArticleCompositionAgent.run.mockImplementation(async () => mockCompositionResults[0]);
        mockArticleRepository.createMany.mockResolvedValue();
    });

    describe('execute', () => {
        test('should compose articles successfully for reports without articles', async () => {
            // Given - valid country and language parameters
            const country = DEFAULT_COUNTRY;
            const language = DEFAULT_LANGUAGE;

            // When - executing the use case
            const result = await useCase.execute(language, country);

            // Then - it should find reports without articles
            expect(mockReportRepository.findStoriesWithoutArticles).toHaveBeenCalledWith({
                classification: ['STANDARD', 'NICHE'],
                country: country.toString(),
                limit: 20,
            });

            // And compose articles for each report through the agent
            expect(mockArticleCompositionAgent.run).toHaveBeenCalledTimes(TEST_REPORTS_COUNT);
            testReports.forEach((report) => {
                expect(mockArticleCompositionAgent.run).toHaveBeenCalledWith({
                    story: report,
                    targetCountry: country,
                    targetLanguage: language,
                });
            });

            // And save each composed article
            expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(TEST_REPORTS_COUNT);

            // And return the composed articles
            expect(result).toHaveLength(TEST_REPORTS_COUNT);
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        category: expect.any(Category),
                        country: expect.any(Country),
                        reportIds: expect.arrayContaining([expect.any(String)]),
                    }),
                ]),
            );

            // All articles should be neutral/factual
            result.forEach((article) => {
                expect(article.isFake()).toBe(false);
            });
        });

        test('should handle empty reports result gracefully', async () => {
            // Given - no reports without articles
            mockReportRepository.findStoriesWithoutArticles.mockResolvedValue([]);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should return empty array without calling agent or repository
            expect(mockArticleCompositionAgent.run).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        test('should handle null response from article composer agent', async () => {
            // Given - agent returns null for some reports
            mockArticleCompositionAgent.run.mockImplementation(async (params) => {
                // Return null for first report, valid result for others
                return params?.story === testReports[0] ? null : mockCompositionResults[0];
            });

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should skip null results and process valid ones
            expect(mockArticleCompositionAgent.run).toHaveBeenCalledTimes(TEST_REPORTS_COUNT);
            expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(TEST_REPORTS_COUNT - 1);
            expect(result).toHaveLength(TEST_REPORTS_COUNT - 1);
        });

        test('should continue processing if individual article composition fails', async () => {
            // Given - agent throws error for one report
            mockArticleCompositionAgent.run.mockImplementation(async (params) => {
                if (params?.story === testReports[1]) {
                    throw new Error('Agent composition failed');
                }
                return mockCompositionResults[0];
            });

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should continue processing other reports
            expect(mockArticleCompositionAgent.run).toHaveBeenCalledTimes(TEST_REPORTS_COUNT);
            expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(TEST_REPORTS_COUNT - 1);
            expect(result).toHaveLength(TEST_REPORTS_COUNT - 1);
        });

        test('should handle different countries and languages', async () => {
            // Given - different country and language
            const country = new Country('FR');
            const language = new Language('FR');

            // When - executing the use case
            await useCase.execute(language, country);

            // Then - it should pass correct parameters to report repository
            expect(mockReportRepository.findStoriesWithoutArticles).toHaveBeenCalledWith({
                classification: ['STANDARD', 'NICHE'],
                country: country.toString(),
                limit: 20,
            });

            // And pass correct parameters to article composer
            expect(mockArticleCompositionAgent.run).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetCountry: country,
                    targetLanguage: language,
                }),
            );
        });

        test('should throw error when report repository fails', async () => {
            // Given - report repository throws error
            const repositoryError = new Error('Report repository failed');
            mockReportRepository.findStoriesWithoutArticles.mockRejectedValue(repositoryError);

            // When - executing the use case
            // Then - it should throw the error
            await expect(useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY)).rejects.toThrow(
                'Report repository failed',
            );

            expect(mockArticleCompositionAgent.run).not.toHaveBeenCalled();
            expect(mockArticleRepository.createMany).not.toHaveBeenCalled();
        });

        test('should continue processing when article repository fails', async () => {
            // Given - article repository throws error on create
            mockArticleRepository.createMany.mockRejectedValue(
                new Error('Article repository failed'),
            );

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should continue processing and return empty array
            expect(mockArticleCompositionAgent.run).toHaveBeenCalledTimes(TEST_REPORTS_COUNT);
            expect(mockArticleRepository.createMany).toHaveBeenCalledTimes(TEST_REPORTS_COUNT);
            expect(result).toEqual([]);
        });

        test('should create articles with correct report relationships', async () => {
            // Given - valid reports and composition results
            const testReport = testReports[0];
            mockReportRepository.findStoriesWithoutArticles.mockResolvedValue([testReport]);
            mockArticleCompositionAgent.run.mockResolvedValue(mockCompositionResults[0]);

            // When - executing the use case
            const result = await useCase.execute(DEFAULT_LANGUAGE, DEFAULT_COUNTRY);

            // Then - it should create article with report relationship
            expect(result).toHaveLength(1);
            expect(result[0].reportIds).toEqual([testReport.id]);
            expect(result[0].publishedAt).toEqual(testReport.dateline);
            expect(result[0].category).toEqual(testReport.category);
            // And article should be neutral/factual
            expect(result[0].isFake()).toBe(false);
        });
    });
});
