import { spellsData, killstreakersData, sheensData } from '../data';
import { Paints, StrangeParts } from '@tf2autobot/tf2-schema';

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    return Object.keys(object).find(key => object[key] === value);
}

export default function getAttachmentName(
    attachment: string,
    pSKU: string,
    paints: Paints,
    parts: StrangeParts
): string {
    if (attachment === 's') return getKeyByValue(spellsData, pSKU);
    else if (attachment === 'sp') return getKeyByValue(parts, pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paints, parseInt(pSKU.replace('p', '')));
}
