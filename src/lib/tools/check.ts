import SKU from 'tf2-sku-2';
import { EconItem, Items, ItemAttributes, PartialSKUWithMention } from 'steam-tradeoffer-manager';

import log from '../logger';
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
        const value = content.value;
        const color = content.color;

        if (value.includes('This is a limited use item. Uses: 5') && color === '00a000') {
            // return some method to true
            return true;
        }
    }

    return false;
}

export function is25xUses(item: EconItem): boolean {
    for (const content of item.descriptions) {
        const value = content.value;
        const color = content.color;

        if (value.includes('This is a limited use item. Uses: 25') && color === '00a000') {
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
         * Item description value for Spells and Strange Parts.
         * For Spell, example: "Halloween: Voices From Below (spell only active during event)
         */
        const desc = content.value;

        /**
         * For Strange Parts, example: "(Kills During Halloween: 0)"
         * remove "(" and ": <numbers>)" to get only the part name.
         */
        const parts = content.value
            .replace('(', '')
            .replace(/: \d+\)/g, '')
            .trim();

        /**
         * Description color in Hex Triplet format, example: 7ea9d1
         */
        const color = content.color;

        const strangePartNames = Object.keys(strangePartsData);

        if (desc.startsWith('Halloween:') && desc.endsWith('(spell only active during event)') && color === '7ea9d1') {
            // Example: "Halloween: Voices From Below (spell only active during event)"
            // where "Voices From Below" is the spell name.
            // Color of this description must be rgb(126, 169, 209) or 7ea9d1
            // https://www.spycolor.com/7ea9d1#
            hasSpells = true;
            // Get the spell name
            // Starts from "Halloween:" (10), then the whole spell description minus 32 characters
            // from "(spell only active during event)", and trim any whitespaces.
            const spellName = desc.substring(10, desc.length - 32).trim();

            // push for storage, example: s-1000
            s.push(spellsData[spellName]);
        } else if (
            (parts === 'Kills' || parts === 'Assists'
                ? econ.type.includes('Strange') && econ.type.includes('Points Scored')
                : strangePartNames.includes(parts)) &&
            color === '756b5e'
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
        } else if (desc.startsWith('Killstreaker: ') && color === '7ea9d1') {
            const extractedName = desc.replace('Killstreaker: ', '').trim();
            hasKillstreaker = true;

            if (killstreakers.includes(extractedName.toLowerCase())) {
                ke[`${killstreakersData[extractedName] as string}`] = true;
            } else {
                ke[`${killstreakersData[extractedName] as string}`] = false;
            }
        } else if (desc.startsWith('Sheen: ') && color === '7ea9d1') {
            const extractedName = desc.replace('Sheen: ', '').trim();
            hasSheen = true;

            if (sheens.includes(extractedName.toLowerCase())) {
                ks[`${sheensData[extractedName] as string}`] = true;
            } else {
                ks[`${sheensData[extractedName] as string}`] = false;
            }
        } else if (desc.startsWith('Paint Color: ') && color === '756b5e') {
            const extractedName = desc.replace('Paint Color: ', '').trim();
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

        log.debug('info', `high value: ${econ.assetid}`);
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
        const name = bot.schema.getName(SKU.fromString(sku));

        let attachments = '';
        const attributes = items[sku];

        if (attributes.s) {
            attachments += '\n🎃 Spells: ';
            const toJoin: string[] = [];

            attributes.s.forEach(spellSKU => {
                toJoin.push(getKeyByValue(spellsData, spellSKU));
            });

            attachments += toJoin.join(' + ');
        }

        if (attributes.sp) {
            attachments += '\n🎰 Parts: ';
            const toJoin: string[] = [];

            for (const sPartSKU in attributes.sp) {
                if (!Object.prototype.hasOwnProperty.call(attributes.sp, sPartSKU)) {
                    continue;
                }

                if (attributes.sp[sPartSKU] === true) {
                    toJoin.push(getKeyByValue(strangePartsData, +sPartSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(strangePartsData, +sPartSKU));
                }
            }

            attachments += toJoin.join(' + ');
        }

        if (attributes.ke) {
            attachments += '\n🔥 Killstreaker: ';
            const toJoin: string[] = [];

            for (const keSKU in attributes.ke) {
                if (!Object.prototype.hasOwnProperty.call(attributes.ke, keSKU)) {
                    continue;
                }

                if (attributes.ke[keSKU] === true) {
                    toJoin.push(getKeyByValue(killstreakersData, keSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(killstreakersData, keSKU));
                }

                attachments += toJoin.join(' + ');
            }
        }

        if (attributes.ks) {
            attachments += '\n✨ Sheen: ';

            const toJoin: string[] = [];
            for (const ksSKU in attributes.ks) {
                if (!Object.prototype.hasOwnProperty.call(attributes.ks, ksSKU)) {
                    continue;
                }

                if (attributes.ks[ksSKU] === true) {
                    toJoin.push(getKeyByValue(sheensData, ksSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(sheensData, ksSKU));
                }

                attachments += toJoin.join(' + ');
            }
        }

        if (attributes.p) {
            attachments += '\n🎨 Painted: ';

            const toJoin: string[] = [];
            for (const pSKU in attributes.p) {
                if (!Object.prototype.hasOwnProperty.call(attributes.p, pSKU)) {
                    continue;
                }

                if (attributes.p[pSKU] === true) {
                    toJoin.push(getKeyByValue(paintedData, pSKU) + ' (🌟)');
                } else {
                    toJoin.push(getKeyByValue(paintedData, pSKU));
                }

                attachments += toJoin.join(' + ');
            }
        }

        itemsWithName[name] = attachments;
    }

    return itemsWithName;
}

function getKeyByValue(object: { [key: string]: any }, value: any) {
    return Object.keys(object).find(key => object[key] === value);
}
