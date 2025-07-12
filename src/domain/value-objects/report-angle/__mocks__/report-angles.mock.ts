import { getDiscourse } from '../../__mocks__/discourses.mock.js';
import { getStance } from '../../__mocks__/stances.mock.js';
import { AngleCorpus } from '../angle-corpus.vo.js';
import { ReportAngle } from '../report-angle.vo.js';

/**
 * Generates a single mock `ReportAngle` instance.
 */
export function createMockReportAngle(index: number): ReportAngle {
    return new ReportAngle({
        angleCorpus: new AngleCorpus(
            `Mock angle corpus ${index}. This is a comprehensive summary of a specific viewpoint on the report. It contains all the key arguments, evidence, quotes, and contextual details necessary to construct a full article from this angle. The information is presented in a raw, exhaustive format that provides complete coverage of this particular perspective on the events and issues discussed in the main report.`,
        ),
        discourse: getDiscourse(index),
        stance: getStance(index),
    });
}

/**
 * Generates an array of mock `ReportAngle` instances.
 */
export function mockReportAngles(count: number): ReportAngle[] {
    return Array.from({ length: count }, (_, index) => createMockReportAngle(index));
}

// Legacy export for backward compatibility during migration
export const mockStoryPerspectives = mockReportAngles;
