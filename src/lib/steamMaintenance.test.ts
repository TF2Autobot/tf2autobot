import { getSteamMaintenanceDelay } from './steamMaintenance';
import { it, expect, describe } from 'vitest';

describe('getSteamMaintenanceDelay', () => {
    it.each([
        ['before the Pacific window', '2026-07-07T19:59:00Z', null],
        ['at the PDT window start', '2026-07-07T20:00:00Z', 4 * 60 * 60 * 1000 + 15 * 60 * 1000],
        ['inside the PDT window', '2026-07-07T22:00:00Z', 2 * 60 * 60 * 1000 + 15 * 60 * 1000],
        ['at the PST window start', '2026-01-06T21:00:00Z', 4 * 60 * 60 * 1000 + 15 * 60 * 1000],
        ['after the window buffer', '2026-07-08T00:15:00Z', null],
        ['on a different day', '2026-07-08T20:00:00Z', null]
    ])('returns the expected delay %s', (_name, now, expected) => {
        expect(getSteamMaintenanceDelay(now)).toBe(expected);
    });
});
