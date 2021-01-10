import SKU from 'tf2-sku-2';
import { EconItem, Items, ItemAttributes, PartialSKUWithMention } from 'steam-tradeoffer-manager';

import { strangePartsData, spellsData, killstreakersData, sheensData, paintedData } from '../data';
import { DictItem } from '../../classes/Inventory';
import Bot from '../../classes/Bot';
import Options from '../../classes/Options';

export function getAssetidsWithFullUses(items: DictItem[]): string[] {
    return items
        .filter(item => {
            return item.isFullUses === true;
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
}

export function is25xUses(item: EconItem): boolean {
    for (const content of item.descriptions) {
        if (content.value.includes('This is a limited use item. Uses: 25') && content.color === '00a000') {
            return true;
        }
    }
}

export function highValue(econ: EconItem, opt: Options): ItemAttributes | Record<string, never> {
    const attributes: ItemAttributes = {};

    const strangeParts =
        opt.highValue.strangeParts === [] || opt.highValue.strangeParts === ['']
            ? Object.keys(strangePartsData)
            : opt.highValue.strangeParts;

    const killstreakers =
        opt.highValue.killstreakers === [] || opt.highValue.killstreakers === ['']
            ? Object.keys(killstreakersData)
            : opt.highValue.killstreakers;

    const sheens =
        opt.highValue.sheens === [] || opt.highValue.sheens === [''] ? Object.keys(sheensData) : opt.highValue.sheens;
    const painted =
        opt.highValue.painted === [] || opt.highValue.painted === ['']
            ? Object.keys(paintedData)
            : opt.highValue.painted;

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
                sp[`${strangePartsData[parts]}`] = true;
            } else {
                // else no mention and just the name.
                sp[`${strangePartsData[parts]}`] = false;
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
                p[`${paintedData[extractedName]}`] = true;
            } else {
                p[`${paintedData[extractedName]}`] = false;
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
                        if (!Object.prototype.hasOwnProperty.call(items[sku][attachment], pSKU)) {
                            continue;
                        }

                        if (items[sku][attachment as Attachment][pSKU] === true) {
                            toJoin.push(getAttachmentName(attachment, pSKU) + ' (🌟)');
                        } else {
                            toJoin.push(getAttachmentName(attachment, pSKU));
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

function getAttachmentName(attachment: string, pSKU: string): string {
    if (attachment === 'sp') return getKeyByValue(strangePartsData, +pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paintedData, pSKU);
}

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    return Object.keys(object).find(key => object[key] === value);
}
