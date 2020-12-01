import Bot from '../../Bot';

import { pure } from '../../../lib/tools/export';

export default function keepMetalSupply(bot: Bot, minScraps: number, minRecs: number, threshold: number): void {
    if (!bot.options.crafting.metals.enable) {
        return;
    }
    const pureNow = pure.currPure(bot);

    // let refined = pure.ref;
    let reclaimed = pureNow.rec;
    let scrap = pureNow.scrap;

    // const maxRefined = maximumRefined;
    const maxReclaimed = minRecs + threshold;
    const maxScrap = minScraps + threshold;
    // const minRefined = minimumRefined;
    const minReclaimed = minRecs;
    const minScrap = minScraps;

    let smeltReclaimed = 0;
    let smeltRefined = 0;
    let combineScrap = 0;
    let combineReclaimed = 0;

    if (reclaimed > maxReclaimed) {
        combineReclaimed = Math.ceil((reclaimed - maxReclaimed) / 3);
        // refined += combineReclaimed;
        reclaimed -= combineReclaimed * 3;
    } else if (minReclaimed > reclaimed) {
        smeltRefined = Math.ceil((minReclaimed - reclaimed) / 3);
        reclaimed += smeltRefined * 3;
        // refined -= smeltRefined;
    }

    if (scrap > maxScrap) {
        combineScrap = Math.ceil((scrap - maxScrap) / 3);
        reclaimed += combineScrap;
        scrap -= combineScrap * 3;
    } else if (minScrap > scrap) {
        smeltReclaimed = Math.ceil((minScrap - scrap) / 3);
        scrap += smeltReclaimed * 3;
        reclaimed -= smeltReclaimed;
    }

    // TODO: When smelting metal mark the item as being used, then we won't use it when sending offers

    for (let i = 0; i < combineScrap; i++) {
        bot.tf2gc.combineMetal(5000);
    }

    for (let i = 0; i < combineReclaimed; i++) {
        bot.tf2gc.combineMetal(5001);
    }

    for (let i = 0; i < smeltRefined; i++) {
        bot.tf2gc.smeltMetal(5002);
    }

    for (let i = 0; i < smeltReclaimed; i++) {
        bot.tf2gc.smeltMetal(5001);
    }
}
