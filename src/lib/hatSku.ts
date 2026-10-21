import SKU from '@tf2autobot/tf2-sku';
import type SchemaManager from '@tf2autobot/tf2-schema';
import { createHatVersionZ, unparseHatVersionZ } from '../vendor/the-future/createHat';
import { fixItem } from './items';

/** Resolve a HAT Version Z identifier without silently dropping item attributes. */
export function resolveHatSku(input: string, schema: SchemaManager.Schema): string {
    if (!input.startsWith('Z^')) return input;
    const serialized = input.slice(2);
    let props: ReturnType<typeof unparseHatVersionZ>;
    try {
        props = unparseHatVersionZ(serialized);
        if (!props.marketHashName || input.length > 512 || createHatVersionZ(props) !== serialized) throw new Error();
    } catch {
        throw new Error('Invalid HAT Version Z identifier. Paste the complete Z^ identifier.');
    }
    const unsupported = [
        ...(props.loaner ? ['loaner status'] : []),
        ...(props.killstreakers.length ? ['killstreakers'] : []),
        ...(props.sheens.length ? ['sheens'] : []),
        ...(props.strangeParts.length ? ['strange parts'] : []),
        ...(props.strangeFilters.length ? ['strange filters'] : []),
        ...(props.spells.length ? ['spells'] : [])
    ];
    if (unsupported.length)
        throw new Error(`Cannot convert HAT to SKU: normal SKUs cannot preserve ${unsupported.join(', ')}.`);
    if (
        props.qualities.length !== 1 ||
        props.unusualEffects.length > 1 ||
        props.paints.length > 1 ||
        props.warPaints.length > 1
    ) {
        throw new Error(
            'Cannot convert HAT to SKU: multiple or missing qualities, effects, or paints are unsupported.'
        );
    }
    const parsed = schema.getSkuFromName(props.marketHashName);
    if (parsed.includes('null') || parsed.includes('undefined'))
        throw new Error('Cannot resolve the HAT item name in the schema.');
    const item = SKU.fromString(parsed);
    if (!schema.getItemByDefindex(item.defindex) || schema.getQualityIdByName(props.qualities[0]) !== item.quality) {
        throw new Error('Cannot convert HAT to SKU: the item name and quality do not match the schema.');
    }
    if ((item.festive === true) !== props.festivized || (item.craftable === false && props.craftable)) {
        throw new Error('Cannot convert HAT to SKU: the item name conflicts with the HAT flags.');
    }
    item.craftable = props.craftable;
    item.tradable = props.tradable;
    if (props.unusualEffects.length) {
        const effect = schema.getEffectIdByName(props.unusualEffects[0]);
        if (!effect || ![5, 15].includes(item.quality))
            throw new Error('Cannot resolve the HAT unusual effect for this item.');
        item.effect = effect;
    }
    if (props.paints.length) {
        const paint = schema.getPaintDecimalByName(props.paints[0]);
        if (paint === null) throw new Error('Cannot resolve the HAT paint in the schema.');
        item.paint = paint;
    }
    if (props.warPaints.length) {
        const skin = item.paintkit === null ? null : schema.getSkinById(item.paintkit);
        if (!skin || ![skin, `${skin} War Paint`].includes(props.warPaints[0])) {
            throw new Error('Cannot convert HAT to SKU: the war paint does not match the item name.');
        }
    }
    const normalizeName = (name: string): string => name.replace(/%23/g, '#').replace(/^The /, '');
    const marketName = schema.getName(item, false, false, true);
    if (!marketName || normalizeName(marketName) !== normalizeName(props.marketHashName)) {
        throw new Error('Cannot convert HAT to SKU: the item name is ambiguous or contains unsupported attributes.');
    }
    return SKU.fromObject(fixItem(item, schema));
}

const parameterCommands = new Set([
    'add',
    'addbulk',
    'update',
    'updatebulk',
    'remove',
    'removebulk',
    'get',
    'getall',
    'find',
    'pricecheck',
    'check',
    'deposit',
    'd',
    'withdraw',
    'w',
    'withdrawmptf',
    'mcosell',
    'mcobuy',
    'donatebptf',
    'expand',
    'delete',
    'use',
    'ppu',
    'ppurecalc',
    'autoadd'
]);
const itemCommands = new Set(['price', 'pc', 'buy', 'b', 'sell', 's', 'buycart', 'sellcart', 'stock', 'itemstats']);

/** Normalize only item arguments; leave free-text messages and configuration values intact. */
export function normalizeHatCommand(message: string, command: string, schema: SchemaManager.Schema): string {
    const space = message.indexOf(' ');
    if (space === -1 || !message.includes('Z^')) return message;
    const head = message.slice(0, space + 1);
    const body = message.slice(space + 1);
    if (parameterCommands.has(command)) {
        return (
            head +
            body.replace(
                /(^|[&\n])(\s*sku\s*=)(Z\^[^\r\n]*?)(?=&(?!&)(?=[^&=\r\n]+=[^&\r\n]*)|\r?$)/gm,
                (_match, boundary: string, key: string, hat: string) =>
                    boundary + key + resolveHatSku(hat.trim(), schema)
            )
        );
    }
    if (itemCommands.has(command)) {
        const match = /^(\s*(?:\d+\s+)?)(Z\^.*)$/.exec(body);
        if (match) return head + match[1] + resolveHatSku(match[2].trim(), schema);
    }
    return message;
}
