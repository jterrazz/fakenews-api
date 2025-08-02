import { type ArticleFrame } from '../../../../domain/value-objects/article-frame/article-frame.vo.js';
import { type Language } from '../../../../domain/value-objects/language.vo.js';

/**
 * @description
 * Port for the Article Quiz Generation Agent that creates comprehension questions for articles
 */
export interface ArticleQuizGenerationAgentPort {
    run(input: ArticleQuizGenerationInput): Promise<ArticleQuizGenerationResult | null>;
}

/**
 * @description
 * Input data required for quiz question generation
 */
export interface ArticleQuizGenerationInput {
    articleBody: string;
    articleHeadline: string;
    frames?: ArticleFrame[];
    targetLanguage: Language;
}

/**
 * @description
 * Result of quiz generation containing questions about the article content
 */
export interface ArticleQuizGenerationResult {
    questions: Array<{
        answers: string[];
        correctAnswerIndex: number;
        question: string;
    }>;
}
