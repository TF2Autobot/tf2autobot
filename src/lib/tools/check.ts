import Bot from '../../classes/Bot';
import SKU from 'tf2-sku-2';
import log from '../logger';
import { TradeOffer, EconItem } from 'steam-tradeoffer-manager';
import { strangeParts, spMore1Keys, noiseMakerNames } from '../data';

export function checkUses(
    offer: TradeOffer,
    items: EconItem[],
    bot: Bot
): { isNot5Uses: boolean; isNot25Uses: boolean; noiseMakerSKU: string[] } {
    const ex = {
        isNot5Uses: false,
        isNot25Uses: false,
        noiseMakerSKU: []
    };

    items.forEach(item => {
        const isDuelingMiniGame = item.market_hash_name === 'Dueling Mini-Game';
        const isNoiseMaker = noiseMakerNames.some(name => {
            return item.market_hash_name.includes(name);
        });

        if (isDuelingMiniGame && process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME === 'false') {
            for (let i = 0; i < item.descriptions.length; i++) {
                const descriptionValue = item.descriptions[i].value;
                const descriptionColor = item.descriptions[i].color;

                if (
                    !descriptionValue.includes('This is a limited use item. Uses: 5') &&
                    descriptionColor === '00a000'
                ) {
                    ex.isNot5Uses = true;
                    offer.log('info', 'contains Dueling Mini-Game that is not 5 uses, declining...');
                    break;
                }
            }
        } else if (isNoiseMaker && process.env.DISABLE_CHECK_USES_NOISE_MAKER === 'false') {
            for (let i = 0; i < item.descriptions.length; i++) {
                const descriptionValue = item.descriptions[i].value;
                const descriptionColor = item.descriptions[i].color;

                if (
                    !descriptionValue.includes('This is a limited use item. Uses: 25') &&
                    descriptionColor === '00a000'
                ) {
                    ex.isNot25Uses = true;
                    ex.noiseMakerSKU.push(item.getSKU(bot.schema));
                    offer.log('info', `${item.market_hash_name} (${item.assetid}) is not 25 uses.`);
                    break;
                }
            }
        }
    });
    return ex;
}

export function checkHighValue(
    econ: EconItem[],
    sheens: string[],
    killstreakers: string[],
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

        const spellNames: string[] = [];
        const partsNames: string[] = [];
        const killstreakerName: string[] = [];
        const sheenName: string[] = [];

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
            const strangePartNames = Object.keys(strangeParts);

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

                if (Object.keys(spMore1Keys).includes(parts)) {
                    // if the particular strange part is one of the parts that are more than 1 key,
                    // then mention and put "(>🔑)"
                    highValued.isMention = true;
                    partsNames.push(parts + ' (>🔑)');
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
            }
        }

        if (hasSpells || hasStrangeParts || hasKillstreaker || hasSheen) {
            const itemSKU = item.getSKU(bot.schema);
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
                itemDescriptions += '\n🔥 Killstreker: ' + killstreakerName.join(' + ');
            }

            if (hasSheen) {
                // same as Killstreaker
                itemDescriptions += '\n✨ Sheen: ' + sheenName.join(' + ');
            }

            log.debug('info', `${itemName} (${item.assetid})${itemDescriptions}`);
            // parsed.fullName  - tf2-items-format module

            if (
                process.env.DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY === 'false' &&
                process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL
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
