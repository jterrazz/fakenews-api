import {
    ChatAgent,
    type ModelPort,
    PROMPTS,
    SystemPrompt,
    UserPrompt,
} from '@jterrazz/intelligence';
import { type LoggerPort } from '@jterrazz/logger';
import { z } from 'zod/v4';

import {
    type ArticleCompositionAgentPort,
    type ArticleCompositionInput,
    type ArticleCompositionResult,
} from '../../../application/ports/outbound/agents/article-composition.agent.js';

import { bodySchema } from '../../../domain/value-objects/article/body.vo.js';
import { headlineSchema } from '../../../domain/value-objects/article/headline.vo.js';

export class ArticleCompositionAgentAdapter implements ArticleCompositionAgentPort {
    static readonly SCHEMA = z.object({
        body: bodySchema,
        frames: z
            .array(
                z.object({
                    body: bodySchema,
                    headline: headlineSchema,
                }),
            )
            .describe(
                'You MUST return one frame for EACH angle in the input. The length of this array MUST match the number of angles provided.',
            ),
        headline: headlineSchema,
    });

    static readonly SYSTEM_PROMPT = new SystemPrompt(
        'You are a senior editorial writer and narrative composer for a global news application. Your mission is to convert structured report data into a compelling news package: a concise, neutral main article presenting only verified facts, plus viewpoint frames that build on—never repeat—the core facts.',
        'Write in the clear, authoritative style of a quality newspaper—professional yet accessible to a broad audience. Maintain strict neutrality, avoid jargon, and aim for a total reading time of roughly one minute.',
        PROMPTS.FOUNDATIONS.CONTEXTUAL_ONLY,
    );

    public readonly name = 'ArticleCompositionAgent';

    private readonly agent: ChatAgent<z.infer<typeof ArticleCompositionAgentAdapter.SCHEMA>>;

    constructor(
        private readonly model: ModelPort,
        private readonly logger: LoggerPort,
    ) {
        this.agent = new ChatAgent(this.name, {
            logger: this.logger,
            model: this.model,
            schema: ArticleCompositionAgentAdapter.SCHEMA,
            systemPrompt: ArticleCompositionAgentAdapter.SYSTEM_PROMPT,
        });
    }

    static readonly USER_PROMPT = (input: ArticleCompositionInput) => {
        const expectedFrameCount = input.report.angles.length;

        return new UserPrompt(
            // Language Constraint
            `CRITICAL: All output MUST be written in ${input.targetLanguage
                .toString()
                .toUpperCase()}.`,
            '',

            // Core Mission & Audience
            'Compose content for our mobile news app so readers can quickly grasp BOTH the verified facts and each viewpoint surrounding the subject. Keep the writing engaging, crystal-clear, and concise for a broad audience.',
            '',

            // Output Structure (The "What")
            'OUTPUT STRUCTURE:',
            '• headline → Main article headline.',
            '• body → Main Article (≈50-100 words) presenting ONLY the undisputed facts. Use markdown formatting: line breaks for paragraphs, **bold** for key facts, *italic* for emphasis.',
            `• frames → EXACTLY ${expectedFrameCount} items (one per angle) where each item contains:`,
            '    • headline → Frame headline capturing its viewpoint.',
            '    • body → Frame article (≈20-60 words) that EXPANDS on the facts from its specific perspective without repeating them verbatim. Use markdown formatting: line breaks for readability, **bold** for critical points, *italic* for perspective emphasis.',
            '',

            // Editorial Guidance (The "How")
            'EDITORIAL GUIDANCE:',
            '• Curate—do NOT transcribe. Select only the most pertinent details.',
            '• Use simple, jargon-free language that anyone can understand.',
            '• Craft vivid, memorable headlines and key phrases to keep readers engaged.',
            '• Maintain strict neutrality in the Main Article; use the frames to express the angles.',
            '• Target a total reading time of about one minute.',
            '',

            // Formatting Guidelines
            'MARKDOWN FORMATTING:',
            '• Use line breaks (double newline) to separate paragraphs for better readability.',
            '• Use **bold** to highlight crucial facts, numbers, or key developments.',
            '• Use *italic* for subtle emphasis, context, or perspective nuances.',
            '• Apply formatting sparingly—enhance readability without overwhelming the text.',
            '',

            // Critical Rules
            'CRITICAL RULES:',
            `• You MUST create exactly ${expectedFrameCount} frames—one for each provided angle.`,
            '• Base ALL content solely on the supplied report data; do NOT add external information.',
            '• NO REPETITION: Main Article contains the facts; Frames provide interpretation. Information must not be duplicated.',
            '',

            // Report Data Input
            'REPORT DATA:',
            JSON.stringify(
                {
                    angles: input.report.angles.map((angle) => ({
                        digest: angle.angleCorpus.value,
                    })),
                    dateline: input.report.dateline.toISOString(),
                },
                null,
                2,
            ),
        );
    };

    async run(input: ArticleCompositionInput): Promise<ArticleCompositionResult | null> {
        try {
            this.logger.info(
                `Composing article for report with ${input.report.angles.length} angles`,
                {
                    category: input.report.categories.primary().toString(),
                    country: input.targetCountry.toString(),
                    language: input.targetLanguage.toString(),
                },
            );

            const result = await this.agent.run(ArticleCompositionAgentAdapter.USER_PROMPT(input));

            if (!result) {
                this.logger.warn('Article composition agent returned no result');
                return null;
            }

            // Validate that we have the correct number of frames
            if (result.frames.length !== input.report.angles.length) {
                this.logger.warn(
                    `AI returned ${result.frames.length} frames but expected ${input.report.angles.length} (one per angle)`,
                );
                return null;
            }

            // Log successful composition for debugging
            this.logger.info('Successfully composed article with frames', {
                bodyLength: result.body.length,
                framesCount: result.frames.length,
                headlineLength: result.headline.length,
            });

            const compositionResult: ArticleCompositionResult = {
                body: result.body,
                frames: result.frames.map((frame) => ({
                    body: frame.body,
                    headline: frame.headline,
                })),
                headline: result.headline,
            };

            this.logger.info(
                `Article composed: "${compositionResult.headline}" (${compositionResult.body.length} chars) with ${compositionResult.frames.length} frames`,
            );

            return compositionResult;
        } catch (error) {
            this.logger.error('Failed to compose article', {
                error,
                reportId: input.report.id,
                targetCountry: input.targetCountry.toString(),
                targetLanguage: input.targetLanguage.toString(),
            });
            return null;
        }
    }
}
