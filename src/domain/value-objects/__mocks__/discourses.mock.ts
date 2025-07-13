import { Discourse } from '../discourse.vo.js';

const DISCOURSE_VALUES: Discourse['value'][] = [
    'MAINSTREAM',
    'ALTERNATIVE',
    'UNDERREPORTED',
    'DUBIOUS',
];

export const DISCOURSE_FIXTURES: Discourse[] = DISCOURSE_VALUES.map((d) => new Discourse(d));

/**
 * Cycles through the discourse fixtures deterministically.
 */
export function getDiscourse(index = 0): Discourse {
    return DISCOURSE_FIXTURES[index % DISCOURSE_FIXTURES.length];
}
