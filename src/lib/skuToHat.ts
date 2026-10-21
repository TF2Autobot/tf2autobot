import SKU from '@tf2autobot/tf2-sku';
import type SchemaManager from '@tf2autobot/tf2-schema';
import { createHatVersionZ, HatVersionZProps } from '../vendor/the-future/createHat';

/** Build the HAT attributes expressible by a marketplace SKU. */
export default function skuToHat(sku: string, schema: SchemaManager.Schema): string {
    const item = SKU.fromString(sku);
    if (item.craftnumber) throw new Error('HAT Version Z cannot express a specific craft number');
    const marketHashName = schema.getName(item, false, false, true)?.replace(/%23/g, '#');
    const quality = schema.getQualityById(item.quality);
    if (!marketHashName || !quality) throw new Error(`Cannot build NextCrit HAT for ${sku}`);
    const lookup = (id: number, getName: (id: number) => string | null): string[] => {
        if (id === null || id === undefined) return [];
        const name = getName(id);
        if (!name) throw new Error(`Cannot resolve NextCrit attribute for ${sku}`);
        return [name];
    };
    const props: HatVersionZProps = {
        marketHashName,
        tradable: item.tradable !== false,
        marketable: false,
        craftable: item.craftable,
        festivized: item.festive,
        loaner: false,
        qualities: [quality],
        unusualEffects: lookup(item.effect || null, id => schema.getEffectById(id)),
        killstreakers: [],
        sheens: [],
        warPaints: lookup(item.paintkit, id => {
            const name = schema.getSkinById(id);
            return name ? `${name} War Paint` : null;
        }),
        paints: lookup(item.paint || null, id => schema.getPaintNameByDecimal(id)),
        strangeParts: [],
        strangeFilters: [],
        spells: []
    };
    return `Z^${createHatVersionZ(props)}`;
}
