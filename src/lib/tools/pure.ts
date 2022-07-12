import Currencies from '@tf2autobot/tf2-currencies';
import pluralize from 'pluralize';
import Bot from '../../classes/Bot';

export function stock(bot: Bot): string[] {
    const pureStock: string[] = [];
    const pure = currPure(bot);
    const totalKeys = pure.key;
    const totalRefs = Currencies.toRefined(pure.refTotalInScrap);

    const keysPrefix = pluralize('key', totalKeys);
    const refinedPrefix = pluralize('ref', Math.trunc(totalRefs));

    const pureCombine = [
        {
            name: keysPrefix,
            amount: totalKeys
        },
        {
            name: '',
            amount: `${totalRefs}${
                totalRefs > 0
                    ? ` ${refinedPrefix} (${
                          pure.ref > 0 ? `${pure.ref} ref${pure.rec > 0 || pure.scrap > 0 ? ',' : ''}` : ''
                      }${pure.rec > 0 ? `${pure.ref > 0 ? ' ' : ''}${pure.rec} rec${pure.scrap > 0 ? ',' : ''}` : ''}${
                          pure.scrap > 0 ? `${pure.ref > 0 || pure.rec > 0 ? ' ' : ''}${pure.scrap} scrap` : ''
                      })`
                    : ' ref'
            }`
        }
    ];

    const pureCombineCount = pureCombine.length;

    for (let i = 0; i < pureCombineCount; i++) {
        if (i < 1 && totalKeys < 1) {
            continue;
        }

        pureStock.push(`${pureCombine[i].amount} ${pureCombine[i].name}`);
    }

    return pureStock;
}

interface CurrentPure {
    key: number;
    scrap: number;
    rec: number;
    ref: number;
    refTotalInScrap: number;
}

export function currPure(bot: Bot): CurrentPure {
    const currencies = bot.inventoryManager.getInventory.getCurrencies(bot.craftWeapons, true);

    const currKeys = currencies['5021;6'].length;
    const currScrap = currencies['5000;6'].length;
    const currScrapValue = currScrap * (1 / 9);

    const currRec = currencies['5001;6'].length;
    const currRecValue = currRec * (1 / 3);

    const currRef = currencies['5002;6'].length;

    const currRefToScrap = Currencies.toScrap(currRef + currRecValue + currScrapValue);

    return {
        key: currKeys,
        scrap: currScrap,
        rec: currRec,
        ref: currRef,
        refTotalInScrap: currRefToScrap
    };
}
