import SKU from 'tf2-sku-2';
import { EconItem, Items, ItemAttributes, PartialSKUWithMention } from 'steam-tradeoffer-manager';

import { spellsData, killstreakersData, sheensData } from '../data';
import { DictItem } from '../../classes/Inventory';
import Bot from '../../classes/Bot';
import Options from '../../classes/Options';
import { Paints, StrangeParts } from 'tf2-schema-2';

export function getAssetidsWithFullUses(items: DictItem[]): string[] {
    return items.filter(item => item.isFullUses === true).map(item => item.id);
}

export function is5xUses(item: EconItem): boolean {
    for (const content of item.descriptions) {
        if (content.value.includes('This is a limited use item. Uses: 5') && content.color === '00a000') {
            // return some method to true
            return true;
        }
    }
}

export function is25xUses(item: EconItem): boolean {
    for (const content of item.descriptions) {
        if (content.value.includes('This is a limited use item. Uses: 25') && content.color === '00a000') {
            return true;
        }
    }
}

export function highValue(
    econ: EconItem,
    opt: Options,
    paints: Paints,
    parts: StrangeParts
): ItemAttributes | Record<string, never> {
    const attributes: ItemAttributes = {};

    const strangeParts =
        opt.highValue.strangeParts === [] || opt.highValue.strangeParts === ['']
            ? Object.keys(parts).map(part => part.toLowerCase())
            : opt.highValue.strangeParts.map(part => part.toLowerCase());

    const killstreakers =
        opt.highValue.killstreakers === [] || opt.highValue.killstreakers === ['']
            ? Object.keys(killstreakersData).map(killstreaker => killstreaker.toLowerCase())
            : opt.highValue.killstreakers.map(killstreaker => killstreaker.toLowerCase());

    const sheens =
        opt.highValue.sheens === [] || opt.highValue.sheens === ['']
            ? Object.keys(sheensData).map(sheen => sheen.toLowerCase())
            : opt.highValue.sheens.map(sheen => sheen.toLowerCase());

    const painted =
        opt.highValue.painted === [] || opt.highValue.painted === ['']
            ? Object.keys(paints).map(paint => paint.toLowerCase())
            : opt.highValue.painted.map(paint => paint.toLowerCase());

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
        const partsString = content.value
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
            (partsString === 'Kills' || partsString === 'Assists'
                ? econ.getTag('Type') === 'Cosmetic'
                : Object.keys(parts).includes(partsString)) &&
            content.color === '756b5e'
        ) {
            // If the part name is "Kills" or "Assists", then confirm the item is a cosmetic, not a weapon.
            // Else, will scan through Strange Parts Object keys in this.strangeParts()
            // Color of this description must be rgb(117, 107, 94) or 756b5e
            // https://www.spycolor.com/756b5e#
            hasStrangeParts = true;

            if (strangeParts.includes(partsString.toLowerCase())) {
                // if the particular strange part is one of the parts that the user wants,
                // then mention and put "(🌟)"
                sp[`${parts[partsString]}`] = true;
            } else {
                // else no mention and just the name.
                sp[`${parts[partsString]}`] = false;
            }
        } else if (content.value.startsWith('Killstreaker: ') && content.color === '7ea9d1') {
            const extractedName = content.value.replace('Killstreaker: ', '').trim();
            hasKillstreaker = true;

            if (killstreakers.includes(extractedName.toLowerCase())) {
                ke[`${killstreakersData[extractedName]}`] = true;
            } else {
                ke[`${killstreakersData[extractedName]}`] = false;
            }
        } else if (content.value.startsWith('Sheen: ') && content.color === '7ea9d1') {
            const extractedName = content.value.replace('Sheen: ', '').trim();
            hasSheen = true;

            if (sheens.includes(extractedName.toLowerCase())) {
                ks[`${sheensData[extractedName]}`] = true;
            } else {
                ks[`${sheensData[extractedName]}`] = false;
            }
        } else if (content.value.startsWith('Paint Color: ') && content.color === '756b5e') {
            const extractedName = content.value.replace('Paint Color: ', '').trim();
            hasPaint = true;

            if (painted.includes(extractedName.toLowerCase())) {
                p[`${paints[extractedName]}`] = true;
            } else {
                p[`${paints[extractedName]}`] = false;
            }
        }
    }

    if (hasSpells || hasKillstreaker || hasSheen || hasStrangeParts || hasPaint) {
        if (hasSpells) attributes.s = s;
        if (hasStrangeParts) attributes.sp = sp;
        if (hasKillstreaker) attributes.ke = ke;
        if (hasSheen) attributes.ks = ks;
        if (hasPaint) attributes.p = p;
    }

    return attributes;
}

export function getHighValueItems(
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
        // const attributes = items[sku];

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
                        if (!Object.prototype.hasOwnProperty.call(items[sku][attachment], pSKU)) continue;

                        if (items[sku][attachment as Attachment][pSKU] === true) {
                            toJoin.push(getAttachmentName(attachment, pSKU, paints, parts) + ' (🌟)');
                        } else {
                            toJoin.push(getAttachmentName(attachment, pSKU, paints, parts));
                        }
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
