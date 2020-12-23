import SKU from 'tf2-sku-2';
import { EconItem } from 'steam-tradeoffer-manager';

import log from '../logger';
import { strangePartsData, noiseMakerNames } from '../data';

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
            for (let i = 0; i < item.descriptions.length; i++) {
                const descriptionValue = item.descriptions[i].value;
                const descriptionColor = item.descriptions[i].color;

                if (
                    !descriptionValue.includes('This is a limited use item. Uses: 5') &&
                    descriptionColor === '00a000'
                ) {
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
            for (let i = 0; i < item.descriptions.length; i++) {
                const descriptionValue = item.descriptions[i].value;
                const descriptionColor = item.descriptions[i].color;

                if (
                    !descriptionValue.includes('This is a limited use item. Uses: 25') &&
                    descriptionColor === '00a000'
                ) {
                    skus.push(item.getSKU(bot.schema, opt.festivized, opt.strangeUnusual));
                    return true;
                }
            }
        }
    });
    return [is25xUses, skus];
}

export function highValue(
    econ: EconItem[],
    sheens: string[],
    killstreakers: string[],
    strangeParts: string[],
    painted: string[],
    bot: Bot
): {
    has: boolean;
    skus: string[];
    names: string[];
    isMention: boolean;
} {
    const highValued = {
        has: false,
        skus: [],
        names: [],
        isMention: false
    };

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

        const spellNames: string[] = [];
        const partsNames: string[] = [];
        const killstreakerName: string[] = [];
        const sheenName: string[] = [];
        const paintName: string[] = [];

        for (let i = 0; i < item.descriptions.length; i++) {
            // Item description value for Spells and Strange Parts.
            // For Spell, example: "Halloween: Voices From Below (spell only active during event)"
            const desc = item.descriptions[i].value;

            // For Strange Parts, example: "(Kills During Halloween: 0)"
            // remove "(" and ": <numbers>)" to get only the part name.
            const parts = item.descriptions[i].value
                .replace('(', '')
                .replace(/: \d+\)/g, '')
                .trim();

            // Description color in Hex Triplet format, example: 7ea9d1
            const color = item.descriptions[i].color;

            // Get strangePartObject and strangePartNames
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
                highValued.has = true;
                highValued.isMention = true;
                // Get the spell name
                // Starts from "Halloween:" (10), then the whole spell description minus 32 characters
                // from "(spell only active during event)", and trim any whitespaces.
                const spellName = desc.substring(10, desc.length - 32).trim();
                spellNames.push(spellName);
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
                highValued.has = true;

                if (strangeParts.includes(parts.toLowerCase())) {
                    // if the particular strange part is one of the parts that the user wants,
                    // then mention and put "(🌟)"
                    highValued.isMention = true;
                    partsNames.push(parts + ' (🌟)');
                } else {
                    // else no mention and just the name.
                    partsNames.push(parts);
                }
            } else if (desc.startsWith('Killstreaker: ') && color === '7ea9d1') {
                const extractedName = desc.replace('Killstreaker: ', '').trim();
                hasKillstreaker = true;
                highValued.has = true;

                if (killstreakers.includes(extractedName.toLowerCase())) {
                    highValued.isMention = true;
                    killstreakerName.push(extractedName + ' (🌟)');
                } else {
                    killstreakerName.push(extractedName);
                }
            } else if (desc.startsWith('Sheen: ') && color === '7ea9d1') {
                const extractedName = desc.replace('Sheen: ', '').trim();
                hasSheen = true;
                highValued.has = true;

                if (sheens.includes(extractedName.toLowerCase())) {
                    highValued.isMention = true;
                    sheenName.push(extractedName + ' (🌟)');
                } else {
                    sheenName.push(extractedName);
                }
            } else if (desc.startsWith('Paint Color: ') && color === '756b5e') {
                const extractedName = desc.replace('Paint Color: ', '').trim();
                hasPaint = true;
                highValued.has = true;

                if (painted.includes(extractedName.toLowerCase())) {
                    highValued.isMention = true;
                    paintName.push(extractedName + ' (🌟)');
                } else {
                    paintName.push(extractedName);
                }
            }
        }

        if (hasSpells || hasKillstreaker || hasSheen || hasStrangeParts || hasPaint) {
            const itemSKU = item.getSKU(
                bot.schema,
                bot.options.normalize.festivized,
                bot.options.normalize.strangeUnusual
            );
            highValued.skus.push(itemSKU);

            const itemObj = SKU.fromString(itemSKU);

            // If item is an Unusual, then get itemName from schema.
            const itemName = itemObj.quality === 5 ? bot.schema.getName(itemObj, false) : item.market_hash_name;

            let itemDescriptions = '';

            if (hasSpells) {
                itemDescriptions += '\n🎃 Spells: ' + spellNames.join(' + ');
                // spellOrParts += '\n🎃 Spells: ' + parsed.spells.join(' + '); - tf2-items-format module
            }

            if (hasStrangeParts) {
                itemDescriptions += '\n🎰 Parts: ' + partsNames.join(' + ');
                // spellOrParts += '\n🎰 Parts: ' + parsed.parts.join(' + '); - tf2-items-format module
            }

            if (hasKillstreaker) {
                // well, this actually will just have one, but we don't know if there's any that have two 😅
                itemDescriptions += '\n🔥 Killstreaker: ' + killstreakerName.join(' + ');
            }

            if (hasSheen) {
                // same as Killstreaker
                itemDescriptions += '\n✨ Sheen: ' + sheenName.join(' + ');
            }

            if (hasPaint) {
                // same as Killstreaker
                itemDescriptions += '\n🎨 Painted: ' + paintName.join(' + ');
            }

            log.debug('info', `${itemName} (${item.assetid})${itemDescriptions}`);
            // parsed.fullName  - tf2-items-format module

            if (
                bot.options.discordWebhook.tradeSummary.enable &&
                bot.options.discordWebhook.tradeSummary.url.length > 0
            ) {
                highValued.names.push(`_${itemName}_${itemDescriptions}`);
            } else {
                highValued.names.push(`${itemName}${itemDescriptions}`);
                // parsed.fullName  - tf2-items-format module
            }
        }
    });

    return highValued;
}
