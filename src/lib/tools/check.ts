import SKU from 'tf2-sku-2';
import { EconItem, Items, ItemAttributes, PartialSKUWithMention, HighValue } from 'steam-tradeoffer-manager';

import log from '../logger';
import { strangePartsData, noiseMakerNames, spellsData, killstreakersData, sheensData, paintedData } from '../data';
import Bot from '../../classes/Bot';

export function getAssetidsWith5xUses(items: EconItem[]): string[] {
    return items
        .filter(item => {
            if (item.market_hash_name === 'Dueling Mini-Game') {
                for (let i = 0; i < item.descriptions.length; i++) {
                    const descriptionValue = item.descriptions[i].value;
                    const descriptionColor = item.descriptions[i].color;

                    if (
                        descriptionValue.includes('This is a limited use item. Uses: 5') &&
                        descriptionColor === '00a000'
                    ) {
                        return true;
                    }
                }
            }
        })
        .map(item => item.assetid);
}

export function getAssetidsWith25xUses(items: EconItem[], noiseMakerName: string): string[] {
    return items
        .filter(item => {
            if (item.market_hash_name.includes(noiseMakerName)) {
                for (let i = 0; i < item.descriptions.length; i++) {
                    const descriptionValue = item.descriptions[i].value;
                    const descriptionColor = item.descriptions[i].color;

                    if (
                        descriptionValue.includes('This is a limited use item. Uses: 25') &&
                        descriptionColor === '00a000'
                    ) {
                        return true;
                    }
                }
            }
        })
        .map(item => item.assetid);
}

export function isNot5xUses(items: EconItem[]): boolean {
    return items.some(item => {
        if (item.market_hash_name === 'Dueling Mini-Game') {
            for (const content of item.descriptions) {
                const value = content.value;
                const color = content.color;

                if (value.includes('This is a limited use item. Uses: 5') && color === '00a000') {
                    // return some method to true
                    return true;
                }
            }
        }
    });
}

export function isNot25xUses(items: EconItem[], bot: Bot): [boolean, string[]] {
    const opt = bot.options.normalize;
    const skus: string[] = [];

    const is25xUses = items.some(item => {
        const isNoiseMaker = noiseMakerNames.some(name => {
            return item.market_hash_name.includes(name);
        });

        if (isNoiseMaker) {
            for (const content of item.descriptions) {
                const value = content.value;
                const color = content.color;

                if (!value.includes('This is a limited use item. Uses: 25') && color === '00a000') {
                    skus.push(item.getSKU(bot.schema, opt.festivized, opt.strangeUnusual));
                    // return some method to true
                    return true;
                }
            }
        }
    });
    return [is25xUses, skus];
}

export function highValue(econ: EconItem[], bot: Bot): HighValue {
    const highValued: HighValue = {
        items: {},
        isMention: false
    };

    const strangeParts = bot.handler.getStrangeParts;
    const killstreakers = bot.handler.getKillstreakers;
    const sheens = bot.handler.getSheens;
    const painted = bot.handler.getPainted;

    econ.forEach(item => {
        // tf2-items-format module (will use this once fixed)
        // const parsed = parseEconItem(
        //     {
        //         ...item,
        //         tradable: item.tradable ? 1 : 0,
        //         commodity: item.commodity ? 1 : 0,
        //         marketable: item.marketable ? 1 : 0,
        //         amount: item.amount + ''
        //     },
        //     true,
        //     true
        // );

        // let hasSpelled = false;
        // if (parsed.spells.length > 0) {
        //     hasSpelled = true;
        //     hasHighValueOur = true;
        // }

        // let hasStrangeParts = false;
        // if (parsed.parts.length > 0) {
        //     hasStrangeParts = true;
        //     hasHighValueOur = true;
        // }

        let hasSpells = false;
        let hasStrangeParts = false;
        let hasKillstreaker = false;
        let hasSheen = false;
        let hasPaint = false;

        // for storage
        const attributes: ItemAttributes = {};

        const s: string[] = [];
        const sp: PartialSKUWithMention = {};
        const ke: PartialSKUWithMention = {};
        const ks: PartialSKUWithMention = {};
        const p: PartialSKUWithMention = {};

        for (const content of item.descriptions) {
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

            if (
                desc.startsWith('Halloween:') &&
                desc.endsWith('(spell only active during event)') &&
                color === '7ea9d1'
            ) {
                // Example: "Halloween: Voices From Below (spell only active during event)"
                // where "Voices From Below" is the spell name.
                // Color of this description must be rgb(126, 169, 209) or 7ea9d1
                // https://www.spycolor.com/7ea9d1#
                hasSpells = true;
                highValued.isMention = true;
                // Get the spell name
                // Starts from "Halloween:" (10), then the whole spell description minus 32 characters
                // from "(spell only active during event)", and trim any whitespaces.
                const spellName = desc.substring(10, desc.length - 32).trim();

                // push for storage, example: s-1000
                s.push(spellsData[spellName]);
            } else if (
                (parts === 'Kills' || parts === 'Assists'
                    ? item.type.includes('Strange') && item.type.includes('Points Scored')
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
                    highValued.isMention = true;
                    sp[`${strangePartsData[parts] as string}`] = true;
                } else {
                    // else no mention and just the name.
                    sp[`${strangePartsData[parts] as string}`] = false;
                }
            } else if (desc.startsWith('Killstreaker: ') && color === '7ea9d1') {
                const extractedName = desc.replace('Killstreaker: ', '').trim();
                hasKillstreaker = true;

                if (killstreakers.includes(extractedName.toLowerCase())) {
                    highValued.isMention = true;
                    ke[`${killstreakersData[extractedName] as string}`] = true;
                } else {
                    ke[`${killstreakersData[extractedName] as string}`] = false;
                }
            } else if (desc.startsWith('Sheen: ') && color === '7ea9d1') {
                const extractedName = desc.replace('Sheen: ', '').trim();
                hasSheen = true;

                if (sheens.includes(extractedName.toLowerCase())) {
                    highValued.isMention = true;
                    ks[`${sheensData[extractedName] as string}`] = true;
                } else {
                    ks[`${sheensData[extractedName] as string}`] = false;
                }
            } else if (desc.startsWith('Paint Color: ') && color === '756b5e') {
                const extractedName = desc.replace('Paint Color: ', '').trim();
                hasPaint = true;

                if (painted.includes(extractedName.toLowerCase())) {
                    highValued.isMention = true;
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

            log.debug('info', `high value: ${item.assetid}`);

            const itemSKU = item.getSKU(
                bot.schema,
                bot.options.normalize.festivized,
                bot.options.normalize.strangeUnusual
            );
            highValued.items[itemSKU] = attributes;
        }
    });

    return highValued;
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
