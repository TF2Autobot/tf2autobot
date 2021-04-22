import SKU from 'tf2-sku-2';
import { Items } from '@tf2autobot/tradeoffer-manager';
import { spellsData, killstreakersData, sheensData } from '@lib/data';
import Bot from '@classes/Bot';
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

    const cT = bot.options.tradeSummary.customText;
    const normalizePaint = bot.options.normalize.painted.our === false || bot.options.normalize.painted.their === false;

    for (const sku in items) {
        if (!Object.prototype.hasOwnProperty.call(items, sku)) {
            continue;
        }

        let toString = '';

        const toJoin: string[] = [];

        Object.keys(items[sku]).forEach(attachment => {
            if (attachment === 'isFull') {
                toString += `\n💯 Full uses: ${items[sku].isFull ? '✅' : '❌'}`;
            } else {
                if (items[sku][attachment]) {
                    if (attachment === 's') {
                        toString += `\n${cT.spells ? cT.spells : '🎃 Spells:'} `;
                    } else if (attachment === 'sp') {
                        toString += `\n${cT.strangeParts ? cT.strangeParts : '🎰 Parts:'} `;
                    } else if (attachment === 'ke') {
                        toString += `\n${cT.killstreaker ? cT.killstreaker : '🔥 Killstreaker:'} `;
                    } else if (attachment === 'ks') {
                        toString += `\n${cT.sheen ? cT.sheen : '✨ Sheen:'} `;
                    } else if (attachment === 'p') {
                        toString += `\n${cT.painted ? cT.painted : '🎨 Painted:'} `;
                    }

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

type Attachment = 's' | 'sp' | 'ke' | 'ks' | 'p';

function getAttachmentName(attachment: string, pSKU: string, paints: Paints, parts: StrangeParts): string {
    if (attachment === 's') return getKeyByValue(spellsData, pSKU);
    else if (attachment === 'sp') return getKeyByValue(parts, pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paints, pSKU);
}

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    const keys = Object.keys(object);
    const key = keys.find(key => object[key] === value);
    return key;
}
