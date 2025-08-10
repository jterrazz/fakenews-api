import {
    type Country as PrismaCountry,
    type Prisma,
    type Report as PrismaReport,
    type ReportAngle as PrismaReportAngle,
} from '@prisma/client';

import { Report } from '../../../../domain/entities/report.entity.js';
import { ArticleTraits } from '../../../../domain/value-objects/article-traits.vo.js';
import { Categories } from '../../../../domain/value-objects/categories.vo.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Classification } from '../../../../domain/value-objects/report/classification.vo.js';
import { AngleCorpus } from '../../../../domain/value-objects/report-angle/angle-corpus.vo.js';
import { ReportAngle } from '../../../../domain/value-objects/report-angle/report-angle.vo.js';

export class ReportMapper {
    angleToPrisma(
        angle: ReportAngle,
        reportId: string,
    ): Omit<PrismaReportAngle, 'createdAt' | 'id' | 'updatedAt'> {
        return {
            corpus: angle.angleCorpus.toString(),
            reportId,
        };
    }

    /**
     * Creates a Prisma where condition for category filtering using join table
     */
    createCategoryFilter(category?: string, categories?: string[]): object | undefined {
        if (categories && categories.length > 0) {
            return {
                reportCategories: {
                    some: {
                        category: { in: categories },
                    },
                },
            };
        }

        if (category) {
            return {
                reportCategories: {
                    some: {
                        category,
                    },
                },
            };
        }

        return undefined;
    }

    mapCountryFromPrisma(country: PrismaCountry): Country {
        return new Country(country);
    }

    mapCountryToPrisma(country: Country): PrismaCountry {
        return country.toString() as PrismaCountry;
    }

    toDomain(
        prisma: PrismaReport & {
            angles: PrismaReportAngle[];
            reportCategories?: Array<{ category: string }>;
        },
    ): Report {
        const angles = prisma.angles.map(
            (a) =>
                new ReportAngle({
                    angleCorpus: new AngleCorpus(a.corpus),
                }),
        );

        return new Report({
            angles,
            categories: new Categories(
                Array.isArray(prisma.reportCategories)
                    ? (prisma.reportCategories.map((c) => c.category) as string[])
                    : [],
            ),
            classification: new Classification(
                prisma.classification as 'OFF_TOPIC' | 'NICHE' | 'PENDING' | 'GENERAL',
            ),
            country: new Country(prisma.country),
            createdAt: prisma.createdAt,
            dateline: prisma.dateline,
            facts: prisma.facts,
            id: prisma.id,
            sourceReferences: Array.isArray(prisma.sources) ? (prisma.sources as string[]) : [],
            traits: new ArticleTraits({
                smart: (prisma as unknown as { traitsSmart?: boolean }).traitsSmart ?? false,
                uplifting:
                    (prisma as unknown as { traitsUplifting?: boolean }).traitsUplifting ?? false,
            }),
            updatedAt: prisma.updatedAt,
        });
    }

    toPrisma(report: Report): Prisma.ReportCreateInput {
        return {
            reportCategories: {
                create: report.categories.toArray().map((c) => ({ category: c })),
            },
            classification: report.classification.toString() as
                | 'OFF_TOPIC'
                | 'NICHE'
                | 'PENDING'
                | 'GENERAL',
            country: this.mapCountryToPrisma(report.country),
            dateline: report.dateline,
            facts: report.facts,
            id: report.id,
            sources: report.sourceReferences,
            // Removed JSON traits - using typed columns
            traitsSmart: report.traits?.smart ?? false,
            traitsUplifting: report.traits?.uplifting ?? false,
        };
    }
}
