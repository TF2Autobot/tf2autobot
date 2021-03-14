import Bot from '../../Bot';
import { pure } from '../../../lib/tools/export';

export default function keepMetalSupply(bot: Bot, minScraps: number, minRecs: number, threshold: number): void {
    if (!bot.options.crafting.metals.enable) {
        return;
    }

    const pureNow = pure.currPure(bot);
    if (pureNow.ref <= 0 && pureNow.rec <= 3 && pureNow.scrap <= 3) {
        // If the bot don't have any refined and reclaimed and scrap are both less than
        // three, then just don't execute to craft/smelt metals.
        return;
    }

    const reclaimed = pureNow.rec;
    const scrap = pureNow.scrap;
    const maxReclaimed = minRecs + threshold;
    const maxScrap = minScraps + threshold;
    const minReclaimed = minRecs;
    const minScrap = minScraps;

    let smeltReclaimed = 0;
    let smeltRefined = 0;
    let combineScrap = 0;
    let combineReclaimed = 0;

    if (reclaimed > maxReclaimed) {
        combineReclaimed = Math.ceil((reclaimed - maxReclaimed) / 3);
    } else if (minReclaimed > reclaimed) {
        smeltRefined = Math.ceil((minReclaimed - reclaimed) / 3);
    }

    if (scrap > maxScrap) {
        combineScrap = Math.ceil((scrap - maxScrap) / 3);
    } else if (minScrap > scrap) {
        smeltReclaimed = Math.ceil((minScrap - scrap) / 3);
    }

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
