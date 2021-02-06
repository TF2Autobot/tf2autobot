import SKU from 'tf2-sku-2';
import { Items } from 'steam-tradeoffer-manager';
import { spellsData, killstreakersData, sheensData } from '../data';
import Bot from '../../classes/Bot';
import { Paints, StrangeParts } from 'tf2-schema-2';

export default function getHighValueItems(
    items: Items,
    bot: Bot,
    paints: Paints,
    parts: StrangeParts
): { [name: string]: string } {
    const itemsWithName: {
        [name: string]: string;
    } = {};

    for (const sku in items) {
        if (!Object.prototype.hasOwnProperty.call(items, sku)) {
            continue;
        }

        let toString = '';

        const normalizePaint =
            bot.options.normalize.painted.our === false || bot.options.normalize.painted.their === false;

        const toJoin: string[] = [];

        Object.keys(items[sku]).forEach(attachment => {
            if (attachment === 's') {
                toString += '\n🎃 Spells: ';

                items[sku].s.forEach(spellSKU => {
                    toJoin.push(getKeyByValue(spellsData, spellSKU));
                });

                toString += toJoin.join(' + ');
                toJoin.length = 0;
            } else {
                if (items[sku][attachment]) {
                    if (attachment === 'sp') toString += '\n🎰 Parts: ';
                    else if (attachment === 'ke') toString += '\n🔥 Killstreaker: ';
                    else if (attachment === 'ks') toString += '\n✨ Sheen: ';
                    else if (attachment === 'p') toString += '\n🎨 Painted: ';

                    for (const pSKU in items[sku][attachment]) {
                        if (!Object.prototype.hasOwnProperty.call(items[sku][attachment], pSKU)) {
                            continue;
                        }

                        toJoin.push(
                            `${getAttachmentName(attachment, pSKU, paints, parts)}${
                                attachment === 'p' && normalizePaint ? ` (${sku.replace(/;p\d+/, '')};${pSKU})` : ''
                            }${items[sku][attachment as Attachment][pSKU] === true ? ' 🌟' : ''}`
                        );
                    }

                    toString += toJoin.join(' + ');
                    toJoin.length = 0;
                }
            }
        });

        itemsWithName[bot.schema.getName(SKU.fromString(sku.replace(/;p\d+/, '')))] = toString;
    }

    return itemsWithName;
}

type Attachment = 'sp' | 'ke' | 'ks' | 'p';

function getAttachmentName(attachment: string, pSKU: string, paints: Paints, parts: StrangeParts): string {
    if (attachment === 'sp') return getKeyByValue(parts, pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paints, pSKU);
}

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    return Object.keys(object).find(key => object[key] === value);
}
