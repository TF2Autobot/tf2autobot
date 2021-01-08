import SKU from 'tf2-sku-2';
import { EconItem, Items, ItemAttributes, PartialSKUWithMention } from 'steam-tradeoffer-manager';

import { strangePartsData, spellsData, killstreakersData, sheensData, paintedData } from '../data';
import Bot from '../../classes/Bot';
import { DictItem } from '../../classes/Inventory';

export function getAssetidsWithFullUses(items: DictItem[]): string[] {
    return items
        .filter(item => {
            item.isFullUses === true;
        })
        .map(item => item.id);
}

export function is5xUses(item: EconItem): boolean {
    for (const content of item.descriptions) {
        if (content.value.includes('This is a limited use item. Uses: 5') && content.color === '00a000') {
            // return some method to true
            return true;
        }
    }

    return false;
}

export function is25xUses(item: EconItem): boolean {
    for (const content of item.descriptions) {
        if (content.value.includes('This is a limited use item. Uses: 25') && content.color === '00a000') {
            return true;
        }
    }

    return false;
}

export function highValue(econ: EconItem, bot: Bot): ItemAttributes | Record<string, never> {
    const attributes: ItemAttributes = {};

    const strangeParts = bot.handler.getStrangeParts;
    const killstreakers = bot.handler.getKillstreakers;
    const sheens = bot.handler.getSheens;
    const painted = bot.handler.getPainted;

    let hasSpells = false;
    let hasStrangeParts = false;
    let hasKillstreaker = false;
    let hasSheen = false;
    let hasPaint = false;

    const s: string[] = [];
    const sp: PartialSKUWithMention = {};
    const ke: PartialSKUWithMention = {};
    const ks: PartialSKUWithMention = {};
    const p: PartialSKUWithMention = {};

    for (const content of econ.descriptions) {
        /**
         * For Strange Parts, example: "(Kills During Halloween: 0)"
         * remove "(" and ": <numbers>)" to get only the part name.
         */
        const parts = content.value
            .replace('(', '')
            .replace(/: \d+\)/g, '')
            .trim();

        if (
            content.value.startsWith('Halloween:') &&
            content.value.endsWith('(spell only active during event)') &&
            content.color === '7ea9d1'
        ) {
            // Example: "Halloween: Voices From Below (spell only active during event)"
            // where "Voices From Below" is the spell name.
            // Color of this description must be rgb(126, 169, 209) or 7ea9d1
            // https://www.spycolor.com/7ea9d1#
            hasSpells = true;
            // Get the spell name
            // Starts from "Halloween:" (10), then the whole spell description minus 32 characters
            // from "(spell only active during event)", and trim any whitespaces.
            const spellName = content.value.substring(10, content.value.length - 32).trim();

            // push for storage, example: s-1000
            s.push(spellsData[spellName]);
        } else if (
            (parts === 'Kills' || parts === 'Assists'
                ? econ.type.includes('Strange') && econ.type.includes('Points Scored')
                : Object.keys(strangePartsData).includes(parts)) &&
            content.color === '756b5e'
        ) {
            // If the part name is "Kills" or "Assists", then confirm the item is a cosmetic, not a weapon.
            // Else, will scan through Strange Parts Object keys in this.strangeParts()
            // Color of this description must be rgb(117, 107, 94) or 756b5e
            // https://www.spycolor.com/756b5e#
            hasStrangeParts = true;

            if (strangeParts.includes(parts.toLowerCase())) {
                // if the particular strange part is one of the parts that the user wants,
                // then mention and put "(🌟)"
                sp[`${strangePartsData[parts] as string}`] = true;
            } else {
                // else no mention and just the name.
                sp[`${strangePartsData[parts] as string}`] = false;
            }
        } else if (content.value.startsWith('Killstreaker: ') && content.color === '7ea9d1') {
            const extractedName = content.value.replace('Killstreaker: ', '').trim();
            hasKillstreaker = true;

            if (killstreakers.includes(extractedName.toLowerCase())) {
                ke[`${killstreakersData[extractedName] as string}`] = true;
            } else {
                ke[`${killstreakersData[extractedName] as string}`] = false;
            }
        } else if (content.value.startsWith('Sheen: ') && content.color === '7ea9d1') {
            const extractedName = content.value.replace('Sheen: ', '').trim();
            hasSheen = true;

            if (sheens.includes(extractedName.toLowerCase())) {
                ks[`${sheensData[extractedName] as string}`] = true;
            } else {
                ks[`${sheensData[extractedName] as string}`] = false;
            }
        } else if (content.value.startsWith('Paint Color: ') && content.color === '756b5e') {
            const extractedName = content.value.replace('Paint Color: ', '').trim();
            hasPaint = true;

            if (painted.includes(extractedName.toLowerCase())) {
                p[`${paintedData[extractedName] as string}`] = true;
            } else {
                p[`${paintedData[extractedName] as string}`] = false;
            }
        }
    }

    if (hasSpells || hasKillstreaker || hasSheen || hasStrangeParts || hasPaint) {
        if (hasSpells) {
            attributes.s = s;
        }

        if (hasStrangeParts) {
            attributes.sp = sp;
        }

        if (hasKillstreaker) {
            attributes.ke = ke;
        }

        if (hasSheen) {
            attributes.ks = ks;
        }

        if (hasPaint) {
            attributes.p = p;
        }
    }

    return attributes;
}

export function getHighValueItems(items: Items, bot: Bot): { [name: string]: string } {
    const itemsWithName: {
        [name: string]: string;
    } = {};

    for (const sku in items) {
        if (!Object.prototype.hasOwnProperty.call(items, sku)) {
            continue;
        }

        let attachments = '';
        // const attributes = items[sku];

        if (items[sku].s) {
            attachments += '\n🎃 Spells: ';
            const toJoin: string[] = [];

            items[sku].s.forEach(spellSKU => {
                toJoin.push(getKeyByValue(spellsData, spellSKU));
            });

            attachments += toJoin.join(' + ');
        }

        if (items[sku].sp) {
            attachments += '\n🎰 Parts: ';
            const toJoin: string[] = [];

            for (const sPartSKU in items[sku].sp) {
                if (!Object.prototype.hasOwnProperty.call(items[sku].sp, sPartSKU)) {
                    continue;
                }

                if (items[sku].sp[sPartSKU] === true) {
                    toJoin.push(getKeyByValue(strangePartsData, +sPartSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(strangePartsData, +sPartSKU));
                }
            }

            attachments += toJoin.join(' + ');
        }

        if (items[sku].ke) {
            attachments += '\n🔥 Killstreaker: ';
            const toJoin: string[] = [];

            for (const keSKU in items[sku].ke) {
                if (!Object.prototype.hasOwnProperty.call(items[sku].ke, keSKU)) {
                    continue;
                }

                if (items[sku].ke[keSKU] === true) {
                    toJoin.push(getKeyByValue(killstreakersData, keSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(killstreakersData, keSKU));
                }

                attachments += toJoin.join(' + ');
            }
        }

        if (items[sku].ks) {
            attachments += '\n✨ Sheen: ';

            const toJoin: string[] = [];
            for (const ksSKU in items[sku].ks) {
                if (!Object.prototype.hasOwnProperty.call(items[sku].ks, ksSKU)) {
                    continue;
                }

                if (items[sku].ks[ksSKU] === true) {
                    toJoin.push(getKeyByValue(sheensData, ksSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(sheensData, ksSKU));
                }

                attachments += toJoin.join(' + ');
            }
        }

        if (items[sku].p) {
            attachments += '\n🎨 Painted: ';

            const toJoin: string[] = [];
            for (const pSKU in items[sku].p) {
                if (!Object.prototype.hasOwnProperty.call(items[sku].p, pSKU)) {
                    continue;
                }

                if (items[sku].p[pSKU] === true) {
                    toJoin.push(getKeyByValue(paintedData, pSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(paintedData, pSKU));
                }

                attachments += toJoin.join(' + ');
            }
        }

        itemsWithName[bot.schema.getName(SKU.fromString(sku))] = attachments;
    }

    return itemsWithName;
}

function getKeyByValue(object: { [key: string]: any }, value: any) {
    return Object.keys(object).find(key => object[key] === value);
}
