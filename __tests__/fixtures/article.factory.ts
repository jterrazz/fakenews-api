import {
    type Category as PrismaCategory,
    type Country as PrismaCountry,
    type Language as PrismaLanguage,
    type PrismaClient,
} from '@prisma/client';
import { addDays, subDays } from 'date-fns';

import { Article } from '../../src/domain/entities/article.entity.js';
import { Authenticity } from '../../src/domain/value-objects/article/authenticity.vo.js';
import { Body } from '../../src/domain/value-objects/article/body.vo.js';
import { Headline } from '../../src/domain/value-objects/article/headline.vo.js';
import { Category } from '../../src/domain/value-objects/category.vo.js';
import { Country } from '../../src/domain/value-objects/country.vo.js';
import { Language } from '../../src/domain/value-objects/language.vo.js';

/**
 * Article test data builder using the Factory pattern
 * Provides fluent API for creating test articles with domain entities
 */
export class ArticleFactory {
    private data: {
        authenticity: Authenticity;
        body: Body;
        category: Category;
        country: Country;
        headline: Headline;
        id: string;
        language: Language;
        publishedAt: Date;
        reportIds: string[];
    };

    constructor() {
        this.data = {
            authenticity: new Authenticity(false),
            body: new Body('Default test article body with detailed information about the topic.'),
            category: new Category('TECHNOLOGY'),
            country: new Country('US'),
            headline: new Headline('Default Test Article'),
            id: crypto.randomUUID(),
            language: new Language('EN'),
            publishedAt: new Date('2024-03-01T12:00:00.000Z'),
            reportIds: [],
        };
    }

    public asFake(reason?: string): ArticleFactory {
        this.data.authenticity = new Authenticity(true, reason);
        return this;
    }

    public asReal(): ArticleFactory {
        this.data.authenticity = new Authenticity(false);
        return this;
    }

    public build(): Article {
        return new Article({
            authenticity: this.data.authenticity,
            body: this.data.body,
            category: this.data.category,
            country: this.data.country,
            headline: this.data.headline,
            id: this.data.id,
            language: this.data.language,
            publishedAt: this.data.publishedAt,
            reportIds: this.data.reportIds,
        });
    }

    async createInDatabase(prisma: PrismaClient): Promise<Article> {
        const article = this.build();

        // Ensure a report exists for the article to be queryable
        const report = await prisma.report.create({
            data: {
                category: article.category.toString() as PrismaCategory,
                classification: 'STANDARD',
                country: article.country.toString() as PrismaCountry,
                dateline: article.publishedAt,
                facts: `These are test facts for the report related to article ${article.headline.value}. They are long enough to pass validation and cover all key data points required.`,
                // Default to STANDARD for tests
                sources: [],
            },
        });

        await prisma.article.create({
            data: {
                body: article.body.value,
                category: article.category.toString() as PrismaCategory,
                country: article.country.toString() as PrismaCountry,
                createdAt: article.publishedAt,
                fakeReason: article.authenticity.reason,
                fakeStatus: article.isFake(),
                headline: article.headline.value,
                id: article.id,
                language: article.language.toString() as PrismaLanguage,
                publishedAt: article.publishedAt,
                reports: {
                    connect: { id: report.id },
                },
            },
        });
        return article;
    }

    public async createManyInDatabase(prisma: PrismaClient, count: number): Promise<Article[]> {
        const articles: Article[] = [];
        for (let i = 0; i < count; i++) {
            // Create articles with incremental timestamps to ensure proper pagination
            const publishedAt = new Date(this.data.publishedAt.getTime() + i * 1000); // Add 1 second per article

            // Create a new factory instance for each article to ensure unique IDs
            const factory = new ArticleFactory()
                .withCategory(this.data.category)
                .withCountry(this.data.country)
                .withLanguage(this.data.language)
                .withPublishedAt(publishedAt)
                .withAuthenticity(this.data.authenticity);

            const article = await factory.createInDatabase(prisma);
            articles.push(article);
        }
        return articles;
    }

    public withAuthenticity(authenticity: Authenticity): ArticleFactory {
        this.data.authenticity = authenticity;
        return this;
    }

    public withBody(body: string): ArticleFactory {
        this.data.body = new Body(body);
        return this;
    }

    public withCategory(category: Category | string): ArticleFactory {
        this.data.category = typeof category === 'string' ? new Category(category) : category;
        return this;
    }

    public withCountry(country: Country | string): ArticleFactory {
        this.data.country = typeof country === 'string' ? new Country(country) : country;
        return this;
    }

    public withHeadline(headline: string): ArticleFactory {
        this.data.headline = new Headline(headline);
        return this;
    }

    public withLanguage(language: Language | string): ArticleFactory {
        this.data.language = typeof language === 'string' ? new Language(language) : language;
        return this;
    }

    public withPublishedAt(date: Date): ArticleFactory {
        this.data.publishedAt = date;
        return this;
    }
}

/**
 * Common test scenarios for articles with predefined configurations
 * Provides ready-to-use article combinations for testing
 */
export class ArticleTestScenarios {
    /**
     * Creates a scenario with no articles for testing empty result handling
     */
    static async createEmptyResultScenario(prisma: PrismaClient): Promise<void> {
        // This method creates an empty scenario by not creating any articles
        // The empty scenario is achieved by simply not creating any data
        await prisma.article.deleteMany();
    }

    /**
     * Creates articles with mixed configurations for comprehensive testing
     */
    static async createMixedArticles(prisma: PrismaClient) {
        const today = new Date('2024-03-01T12:00:00.000Z');
        const yesterday = subDays(today, 1);
        const tomorrow = addDays(today, 1);

        // Create US articles
        const usArticles = await Promise.all([
            new ArticleFactory()
                .withCountry(new Country('US'))
                .withLanguage(new Language('EN'))
                .withPublishedAt(today)
                .createInDatabase(prisma),
            new ArticleFactory()
                .withCountry(new Country('US'))
                .withLanguage(new Language('EN'))
                .withPublishedAt(yesterday)
                .createInDatabase(prisma),
        ]);

        // Create French articles
        const frenchArticles = await Promise.all([
            new ArticleFactory()
                .withCountry(new Country('FR'))
                .withLanguage(new Language('FR'))
                .withPublishedAt(tomorrow)
                .createInDatabase(prisma),
        ]);

        return {
            frenchArticles,
            usArticles,
        };
    }
}
