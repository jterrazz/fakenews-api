import {
    BasicAgentAdapter,
    type ModelPort,
    PROMPT_LIBRARY,
    SystemPromptAdapter,
    UserPromptAdapter,
} from '@jterrazz/intelligence';
import { type LoggerPort } from '@jterrazz/logger';
import { z } from 'zod/v4';

import {
    type ReportDeduplicationAgentPort,
    type ReportDeduplicationResult,
} from '../../../application/ports/outbound/agents/report-deduplication.agent.js';
import { type NewsReport } from '../../../application/ports/outbound/providers/news.port.js';

/**
 * @description
 * This is a placeholder implementation for the Report Deduplication Agent.
 * In a real application, this would connect to a language model to perform
 * semantic analysis. For now, it always returns 'not a duplicate'.
 */
export class ReportDeduplicationAgentAdapter implements ReportDeduplicationAgentPort {
    static readonly SCHEMA = z.object({
        duplicateOfReportId: z
            .string()
            .nullable()
            .describe("The ID of the existing report if it's a duplicate, otherwise null."),
        reason: z.string().describe('A brief, clear justification for your decision.'),
    });

    static readonly SYSTEM_PROMPT = new SystemPromptAdapter(
        "You are an intelligent digital gatekeeper. Your job is to read a new, incoming news report and determine if it's describing the exact same core event as a report that already exists in our database.",
        'You prevent the system from creating redundant reports about the same event.',
        PROMPT_LIBRARY.FOUNDATIONS.CONTEXTUAL_ONLY,
        PROMPT_LIBRARY.TONES.NEUTRAL,
    );

    public readonly name = 'ReportDeduplicationAgent';

    private readonly agent: BasicAgentAdapter<
        z.infer<typeof ReportDeduplicationAgentAdapter.SCHEMA>
    >;

    constructor(
        private readonly model: ModelPort,
        private readonly logger: LoggerPort,
    ) {
        this.agent = new BasicAgentAdapter(this.name, {
            logger: this.logger,
            model: this.model,
            schema: ReportDeduplicationAgentAdapter.SCHEMA,
            systemPrompt: ReportDeduplicationAgentAdapter.SYSTEM_PROMPT,
        });
    }

    static readonly USER_PROMPT = (input: {
        existingReports: Array<{ facts: string; id: string }>;
        newReport: NewsReport;
    }) => {
        const { existingReports, newReport } = input;

        return new UserPromptAdapter(
            // Core Mission
            'Your primary mission is to perform a sophisticated semantic comparison to determine if a new report is a duplicate of an existing one. This is not a simple keyword search.',
            '',

            // The Logic
            '1.  First, understand the essence of the new report. Ask: "What is the single, fundamental event being reported here? Who did what, where, and when?"',
            '2.  Then, compare this core event to the facts of the existing reports provided.',
            '3.  A report is a duplicate if it reports on the same fundamental event, even if the wording, headline, or source is different.',
            '',

            // Examples
            '•   **DUPLICATE:** A new report about "Team A defeating Team B in the championship final" is a duplicate of an existing report with the facts "The championship final concluded with Team A winning."',
            '•   **UNIQUE:** A new report about "a key player from Team A getting injured" is NOT a duplicate of the report about the final, even though it involves the same team. It is a different, separate event.',
            '',

            // Critical Safety Rule
            '**CRITICAL:** If you are not absolutely certain a report is a duplicate, classify it as unique. It is better to have a rare duplicate than to miss a new report. Default to `null` if in doubt.',
            '',

            // Your Task
            "Your task is to analyze the new report against the list of existing reports. Based on your semantic analysis, determine if it's a duplicate.",
            '',

            // Critical Rules
            'CRITICAL RULES:',
            '•   If it is a duplicate, you **MUST** return the `id` of the existing report in the `duplicateOfReportId` field.',
            '•   If it is a unique report, you **MUST** return `null` in the `duplicateOfReportId` field.',
            '•   You **MUST** provide a brief, clear `reason` justifying your decision.',
            '',

            // Data to Analyze
            'EXISTING REPORTS (ID and Facts):',
            JSON.stringify(existingReports, null, 2),
            '',
            'NEW REPORT (Full Content):',
            JSON.stringify(newReport, null, 2),
        );
    };

    async run(params: {
        existingReports: Array<{ facts: string; id: string }>;
        newReport: NewsReport;
    }): Promise<null | ReportDeduplicationResult> {
        try {
            this.logger.info(`[${this.name}] Checking for report duplicates...`, {
                newReportTitle: params.newReport.articles[0]?.headline,
            });

            const result = await this.agent.run(
                ReportDeduplicationAgentAdapter.USER_PROMPT(params),
            );

            if (!result) {
                this.logger.warn(
                    `[${this.name}] Deduplication check failed. No result from AI model.`,
                    {
                        newReportTitle: params.newReport.articles[0]?.headline,
                    },
                );
                return null;
            }

            this.logger.info(`[${this.name}] Deduplication check complete.`, {
                duplicateOfReportId: result.duplicateOfReportId,
                newReportTitle: params.newReport.articles[0]?.headline,
                reason: result.reason,
            });

            return {
                duplicateOfReportId: result.duplicateOfReportId,
            };
        } catch (error) {
            this.logger.error(`[${this.name}] An error occurred during deduplication check.`, {
                error,
                newReportTitle: params.newReport.articles[0]?.headline,
            });
            return null;
        }
    }
}
