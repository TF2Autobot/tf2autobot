/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { MinimumItem } from '../types/TeamFortress2';
import SchemaManager from '@tf2autobot/tf2-schema';

import isObject from 'isobject';

export function fixItem(item: MinimumItem, schema: SchemaManager.Schema): MinimumItem {
    const schemaItem = schema.getItemByDefindex(item.defindex);
    if (schemaItem === null) {
        return item;
    }

    const items = schema.raw.schema.items;
    const itemsCount = items.length;

    if (schemaItem.name.includes(schemaItem.item_class.toUpperCase())) {
        for (let i = 0; i < itemsCount; i++) {
            if (items[i].item_class === schemaItem.item_class && items[i].name.startsWith('Upgradeable ')) {
                item.defindex = items[i].defindex;
            }
        }
    }

    if (schemaItem.item_name === 'Mann Co. Supply Crate Key') {
        item.defindex = 5021;
    } else if (schemaItem.item_name === 'Lugermorph') {
        item.defindex = 160;
    }

    if (
        [
            5726, // Rocket Launcher
            5727, // Scattergun
            5728, // Sniper Rifle
            5729, // Shotgun
            5730, // Ubersaw
            5731, // GRU
            5732, // Spy-cicle
            5733, // Axtinguisher
            5743, // Sticky Launcher
            5744, // Minigun
            5745, // Direct Hit
            5746, // Huntsman
            5747, // Backburner
            5748, // Backscatter
            5749, // Kritzkrieg
            5750, // Ambassador
            5751, // Frontier Justice
            5793, // Flaregun
            5794, // Wrench
            5795, // Revolver
            5796, // Machina
            5797, // Baby Face Blaster
            5798, // Huo Long Heatmaker
            5799, // Loose Cannon
            5800, // Vaccinator
            5801 // Air Strike
        ].includes(item.defindex)
    ) {
        // Standardize all specific Basic Killstreak Kit
        item.defindex = 6527;
    } else if (item.defindex === 5738) {
        // Standardize different versions of Mann Co. Stockpile Crate
        item.defindex = 5737;
    } else if (
        [
            5661, // Pomson 6000 Strangifier
            5721, // Pretty Boy's Pocket Pistol Strangifier
            5722, // Phlogistinator Strangifier
            5723, // Cleaner's Carbine Strangifier
            5724, // Private Eye Strangifier
            5725, // Big Chief Strangifier
            5753, // Air Strike Strangifier
            5754, // Classic Strangifier
            5755, // Manmelter Strangifier
            5756, // Vaccinator Strangifier
            5757, // Widowmaker Strangifier
            5758, // Anger Strangifier
            5759, // Apparition's Aspect Strangifier
            5783, // Cow Mangler 5000 Strangifier
            5784, // Third Degree Strangifier
            5804 // Righteous Bison Strangifier
        ].includes(item.defindex)
    ) {
        // Standardize defindex for Strangifier
        item.defindex = 6522;
    } else if (
        [
            20001, // Cosmetic Strangifier Recipe 1 Rare
            20005, // Cosmetic Strangifier Recipe 2
            20008, // Rebuild Strange Weapon Recipe
            20009 // Cosmetic Strangifier Recipe 3
        ].includes(item.defindex)
    ) {
        // Standardize defindex for Strangifier Chemistry Set
        item.defindex = 20000;
    }

    const isPromo = isPromoItem(schemaItem);

    if (isPromo && item.quality != 1) {
        for (let i = 0; i < itemsCount; i++) {
            if (!isPromoItem(items[i]) && items[i].item_name == schemaItem.item_name) {
                // This is the non-promo version, use that defindex instead
                item.defindex = items[i].defindex;
            }
        }
    } else if (!isPromo && item.quality == 1) {
        for (let i = 0; i < itemsCount; i++) {
            if (isPromoItem(items[i]) && items[i].item_name == schemaItem.item_name) {
                item.defindex = items[i].defindex;
            }
        }
    }

    if (schemaItem.item_class === 'supply_crate') {
        let series: number | null = null;

        if (schemaItem.attributes !== undefined) {
            const attributesCount = schemaItem.attributes.length;

            for (let i = 0; i < attributesCount; i++) {
                if (schemaItem.attributes[i].name === 'set supply crate series') {
                    series = schemaItem.attributes[i].value;
                }
            }
        }

        if (series === null) {
            const itemsGameItem = schema.raw.items_game.items[item.defindex];

            if (
                itemsGameItem.static_attrs !== undefined &&
                itemsGameItem.static_attrs['set supply crate series'] !== undefined
            ) {
                if (isObject(itemsGameItem.static_attrs['set supply crate series'])) {
                    series = itemsGameItem.static_attrs['set supply crate series'].value;
                } else {
                    series = itemsGameItem.static_attrs['set supply crate series'];
                }
            }
        }

        if (series !== null) {
            item.crateseries = series;
        }
    }

    if (item.effect !== null) {
        if (item.quality === 11 && item.paintkit === null) {
            // For Strange Unusual Cosmetic
            item.quality2 = 11;
            item.quality = 5;
        } else if (item.paintkit !== null) {
            // War Paint or Skins
            if (item.quality2 === 11 || item.quality === 5) {
                // Strange Unusual
                item.quality = 15;
            }
        }
    }

    return item;
}

export function isPromoItem(schemaItem: SchemaManager.SchemaItem): boolean {
    return schemaItem.name.startsWith('Promo ') && schemaItem.craft_class === '';
}
