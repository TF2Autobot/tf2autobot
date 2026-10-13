import { buildAllowedMentions, buildDetailBlock, escapeMarkdown, ProfitData } from '../DiscordWebhook/sendTradeSummary';

const OFFER_MESSAGE_LABEL = '💬 **Offer message:**';

function profits(n: number): ProfitData {
    return {
        profits: Array.from({ length: n }, (_, i) => ({
            name: `Item ${i}`,
            buy: { keys: 8, metal: 0 },
            sell: { keys: 12, metal: 0 },
            profitScrap: (i + 1) * 100,
            heldForMs: 3600 * 1000
        })),
        missing: []
    };
}

describe('buildDetailBlock', () => {
    it('returns an empty string when there is nothing to report', () => {
        expect(buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], { profits: [], missing: [] }, 60)).toBe('');
    });

    it('quotes the offer message behind its bold label', () => {
        const detail = buildDetailBlock('thanks man!', OFFER_MESSAGE_LABEL, [], [], { profits: [], missing: [] }, 60);
        expect(detail).toBe('💬 **Offer message:** "thanks man!"');
    });

    it('omits the message line entirely when there is no message', () => {
        const detail = buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], { profits: [], missing: [] }, 60);
        expect(detail).not.toContain('💬');
    });

    it('clamps a very long offer message', () => {
        const detail = buildDetailBlock('a'.repeat(500), OFFER_MESSAGE_LABEL, [], [], { profits: [], missing: [] }, 60);
        const line = detail.split('\n')[0];

        expect(line.length).toBeLessThan(210);
        expect(line.endsWith('…"')).toBe(true);
    });

    it('drops zero-count flags and keeps the rest', () => {
        const detail = buildDetailBlock(
            '',
            OFFER_MESSAGE_LABEL,
            [
                { label: '🟨 invalid', count: 2 },
                { label: '🟧 disabled', count: 0 },
                { label: '🔶 high value', count: 1 }
            ],
            [],
            { profits: [], missing: [] },
            60
        );

        expect(detail).toContain('🟨 invalid 2');
        expect(detail).toContain('🔶 high value 1');
        expect(detail).not.toContain('disabled');
    });

    it('names each sale while there are only a few', () => {
        const detail = buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], profits(2), 60);
        const lines = detail.split('\n').filter(l => l.startsWith('📈'));

        expect(lines).toHaveLength(2);
        expect(lines[0]).toContain('Item 0');
        expect(detail).toContain('**Cost basis:** 8 keys → **Sold:** 12 keys');
    });

    it('normalizes a mixed-sign cost before displaying the reported loss', () => {
        const sale: ProfitData = {
            profits: [
                {
                    name: 'Globetrotter',
                    buy: { keys: 1, metal: -60.44 },
                    sell: { keys: 0, metal: 3 },
                    profitScrap: -7,
                    heldForMs: 1012_000
                }
            ],
            missing: []
        };
        const detail = buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], sale, 64.22);

        expect(detail).toContain('📉 **Globetrotter · Loss: 0.77 ref**');
        expect(detail).toContain('**Cost basis:** 3.77 ref → **Sold:** 3 ref');
        expect(detail).toContain('Held: 16m 52s');
        expect(detail).not.toContain('-60.44');
        expect(detail).not.toContain('-0.77');
    });

    it.each<[number, string, string]>([
        [9, '📈', 'Profit: 1 ref'],
        [0, '➖', 'Break-even: 0 ref'],
        [-9, '📉', 'Loss: 1 ref']
    ])('labels the result for %i scrap instead of leaving an unexplained amount', (scrap, icon, label) => {
        const data = profits(1);
        data.profits[0].profitScrap = scrap;
        const detail = buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], data, 60);

        expect(detail).toContain(`${icon} **Item 0 · ${label}**`);
    });

    it('labels a net loss when aggregating several sales', () => {
        const data = profits(4);
        data.profits.forEach(p => {
            p.profitScrap = -9;
        });
        const detail = buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], data, 60);

        expect(detail).toContain('Net loss: 4 ref');
        expect(detail).toContain('across 4 items');
        expect(detail).toContain('best Item 0 · Loss: 1 ref');
        expect(detail).not.toContain('-4 ref');
    });

    it('aggregates once there are too many sales to name', () => {
        const detail = buildDetailBlock('', OFFER_MESSAGE_LABEL, [], [], profits(50), 60);
        const line = detail.split('\n').find(l => l.startsWith('📈'));

        expect(line).toContain('across 50 items');
        // Highest profitScrap wins the "best" slot.
        expect(line).toContain('best Item 49');
    });

    it('reports missing cost data without listing every item', () => {
        const detail = buildDetailBlock(
            '',
            OFFER_MESSAGE_LABEL,
            [],
            [],
            { profits: [], missing: ['Item A', 'Item B', 'Item C', 'Item D'] },
            60
        );

        expect(detail).toContain('⚠️ no cost data: Item A, Item B +2 more');
    });

    it('names high value attributes on one line each, markdown stripped', () => {
        const detail = buildDetailBlock(
            '',
            OFFER_MESSAGE_LABEL,
            [],
            ['_Team Captain_\n🎃 Spells: Exorcism\n🎰 Parts: Kills + Airborne Kills'],
            { profits: [], missing: [] },
            60
        );

        expect(detail).toContain('🔶 Team Captain  🎃 Spells: Exorcism  🎰 Parts: Kills + Airborne Kills');
        expect(detail).not.toContain('_Team Captain_');
    });

    it('counts high value items past the third rather than listing them', () => {
        const detail = buildDetailBlock(
            '',
            OFFER_MESSAGE_LABEL,
            [],
            ['_A_\n🎃 Spells: X', '_B_', '_C_', '_D_', '_E_'],
            { profits: [], missing: [] },
            60
        );
        const lines = detail.split('\n').filter(l => l.startsWith('🔶'));

        expect(lines).toHaveLength(4);
        expect(lines[3]).toBe('🔶 +2 more high value items');
    });

    it('clamps a high value line carrying a great many parts', () => {
        const detail = buildDetailBlock(
            '',
            OFFER_MESSAGE_LABEL,
            [],
            [`_Item_\n🎰 Parts: ${'Kills During Halloween + '.repeat(40)}`],
            { profits: [], missing: [] },
            60
        );
        const line = detail.split('\n').find(l => l.startsWith('🔶'));

        expect(line.length).toBeLessThanOrEqual(244);
        expect(line.endsWith('…')).toBe(true);
    });

    it('orders message, flags, high value, then profit', () => {
        const detail = buildDetailBlock(
            'hi',
            OFFER_MESSAGE_LABEL,
            [{ label: '🟨 invalid', count: 1 }],
            ['_Item_\n🎃 Spells: X'],
            profits(1),
            60
        );
        const lines = detail.split('\n');

        expect(lines[0]).toContain('💬');
        expect(lines[1]).toContain('🟨 invalid 1');
        expect(lines[2]).toContain('🔶');
        expect(lines[3]).toContain('📈');
    });
});

describe('trade-summary safety helpers', () => {
    it('allows mentions only for configured owners', () => {
        expect(buildAllowedMentions(['111222333', '444555666'])).toEqual({
            parse: [],
            users: ['111222333', '444555666']
        });
    });

    it('escapes every Markdown character that can break a persona-name link', () => {
        const escaped = escapeMarkdown('[name] (test) \\ *bold* _italic_ ~tilde~ `code` |pipe| > quote');

        expect(escaped).toContain('\\[name\\] \\(test\\)');
        expect(escaped).toContain('\\\\');
        expect(escaped).toContain('\\*bold\\* \\_italic\\_ \\~tilde\\~ \\`code\\` \\|pipe\\| \\> quote');
    });
});
