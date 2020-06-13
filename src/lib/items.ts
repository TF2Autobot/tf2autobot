import { Item } from '../types/TeamFortress2';
import SchemaManager from 'tf2-schema';

import isObject from 'isobject';

export function fixItem(item: Item, schema: SchemaManager.Schema): Item {
    const schemaItem = schema.getItemByDefindex(item.defindex);

    if (schemaItem === null) {
        return item;
    }

    if (schemaItem.name.includes(schemaItem.item_class.toUpperCase())) {
        for (let i = 0; i < schema.raw.schema.items.length; i++) {
            if (
                schema.raw.schema.items[i].item_class === schemaItem.item_class &&
                schema.raw.schema.items[i].name.startsWith('Upgradeable ')
            ) {
                item.defindex = schema.raw.schema.items[i].defindex;
            }
        }
    }

    if (schemaItem.item_name === 'Mann Co. Supply Crate Key') {
        item.defindex = 5021;
    } else if (schemaItem.item_name === 'Lugermorph') {
        item.defindex = 160;
    }

    const isPromo = isPromoItem(schemaItem);

    if (isPromo && item.quality != 1) {
        for (let i = 0; i < schema.raw.schema.items.length; i++) {
            if (
                !isPromoItem(schema.raw.schema.items[i]) &&
                schema.raw.schema.items[i].item_name == schemaItem.item_name
            ) {
                // This is the non-promo version, use that defindex instead
                item.defindex = schema.raw.schema.items[i].defindex;
            }
        }
    } else if (!isPromo && item.quality == 1) {
        for (let i = 0; i < schema.raw.schema.items.length; i++) {
            if (
                isPromoItem(schema.raw.schema.items[i]) &&
                schema.raw.schema.items[i].item_name == schemaItem.item_name
            ) {
                item.defindex = schema.raw.schema.items[i].defindex;
            }
        }
    }

    if (schemaItem.item_class === 'supply_crate') {
        let series: number | null = null;

        if (schemaItem.attributes !== undefined) {
            for (let i = 0; i < schemaItem.attributes.length; i++) {
                const attribute = schemaItem.attributes[i];

                if (attribute.name === 'set supply crate series') {
                    series = attribute.value;
                }
            }
        }

        if (series === null) {
            const itemsGameItem = schema.raw.items_game.items[item.defindex];

            if (
                itemsGameItem.static_attrs !== undefined &&
                itemsGameItem.static_attrs['set supply crate series'] !== undefined
            ) {
                // @ts-ignore
                if (isObject(itemsGameItem.static_attrs['set supply crate series'])) {
                    series = itemsGameItem.static_attrs['set supply crate series'].value;
                } else {
                    series = itemsGameItem.static_attrs['set supply crate series'];
                }
            }
        }

        if (series !== null) {
            // @ts-ignore
            // @TODO We are parsing a number from a number.
            // If you meant to floor the int, use Math.floor()
            // If you are expecting a string here,
            // SchemaManager.attributes might be wrong.
            item.crateseries = parseInt(series);
        }
    }

    if (item.effect !== null) {
        if (item.quality === 11) {
            item.quality2 = 11;
        }

        item.quality = 5;
    } else if (item.paintkit !== null) {
        if (item.quality2 === 11) {
            item.quality = 11;
            item.quality2 = null;
        }
    }

    if (item.paintkit !== null) {
        const hasCorrectPaintkitAttribute =
            schema.raw.items_game.items[item.defindex].static_attrs !== undefined &&
            schema.raw.items_game.items[item.defindex].static_attrs['paintkit_proto_def_index'] == item.paintkit;

        if (schemaItem.item_quality != 15 || !hasCorrectPaintkitAttribute) {
            for (const defindex in schema.raw.items_game.items) {
                if (!Object.prototype.hasOwnProperty.call(schema.raw.items_game.items, defindex)) {
                    continue;
                }

                const itemsGameItem = schema.raw.items_game.items[defindex];
                if (itemsGameItem.prefab === undefined || !itemsGameItem.prefab.startsWith('paintkit')) {
                    continue;
                }

                if (itemsGameItem.static_attrs['paintkit_proto_def_index'] == item.paintkit) {
                    item.defindex = parseInt(defindex);
                    break;
                }
            }
        }
    }

    return item;
}

export function isPromoItem(schemaItem: SchemaManager.SchemaItem): boolean {
    return schemaItem.name.startsWith('Promo ') && schemaItem.craft_class === '';
}
