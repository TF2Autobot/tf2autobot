import validator from './validator';
import { deepMerge } from './tools/deep-merge';
import { DEFAULTS } from '../classes/Options';
import { it, expect } from 'vitest';

it('returns an error with invalid schema', () => {
    let options = deepMerge({}, DEFAULTS);
    options = deepMerge(options, { steamAccountName: 'abc123' });
    const result = validator(options, 'options');
    expect(result).not.toBeNull();
});
