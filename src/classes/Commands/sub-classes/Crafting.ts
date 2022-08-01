import SteamID from 'steamid';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { TokenType, SubTokenType } from '../../TF2GC';

import log from '../../../lib/logger';
import {
    ClassesForCraftableWeapons,
    CraftWeaponsBySlot,
    SlotsForCraftableWeapons
} from 'src/classes/MyHandler/utils/craftClassWeapons';

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default class CraftingCommands {
    private craftWeaponsBySlot: CraftWeaponsBySlot;

    private isCrafting = false;

    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    craftTokenCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options.crafting;
        if (opt.manual === false) {
            return this.bot.sendMessage(
                steamID,
                '❌ Please set crafting.manual option to true in order to use this command.'
            );
        }

        if (this.isCrafting) {
            return this.bot.sendMessage(
                steamID,
                "❌ Crafting token still in progress. Please wait until it's completed."
            );
        }

        message = CommandParser.removeCommand(message).trim();
        const parts = message.toLowerCase().split(' ');
        // !craftToken <tokenType (class/slot)> <subTokenType (scout, soldier, etc)> <amount>

        if (parts.length === 1 && ['check', 'info'].includes(parts[0])) {
            // !craftToken check
            // !craftToken info
            return this.getCraftTokenInfo(steamID);
        }

        if (parts.length < 3) {
            return this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Correct syntax: !craftToken <tokenType> <subTokenType> <amount>' +
                    '\n - tokenType: "class" or "slot"' +
                    '\n - subTokenType: one of the 9 TF2 class characters if TokenType is class, or "primary"/"secondary"/"melee"/"pda2" if TokenType is slot' +
                    '\n - amount: Must be an integer, or "max"'
            );
        }

        const tokenType = parts[0];
        const subTokenType = parts[1];
        const amount: number | 'max' = parts[2] === 'max' ? 'max' : parseInt(parts[2]);

        if (amount !== 'max') {
            if (isNaN(amount)) {
                return this.bot.sendMessage(steamID, '❌ Amount must be type integer!');
            }
        }

        if (!['class', 'slot'].includes(tokenType)) {
            return this.bot.sendMessage(steamID, '❌ tokenType must only be either "class" or "slot"!');
        }

        const classes = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
        const slotType = ['primary', 'secondary', 'melee', 'pda2'];

        if (tokenType === 'class' && !classes.includes(subTokenType)) {
            return this.bot.sendMessage(
                steamID,
                '❌ subTokenType must be one of 9 TF2 class character since your tokenType is "class"!'
            );
        } else if (tokenType === 'slot' && !slotType.includes(subTokenType)) {
            return this.bot.sendMessage(
                steamID,
                '❌ subTokenType must only be either "primary", "secondary", "melee", or "pda2" since your tokenType is "slot"!'
            );
        }

        if (tokenType === 'slot') {
            // only load on demand
            this.defineCraftWeaponsBySlots();
        }

        const assetids: string[] = [];

        const craftableItems = this.bot.inventoryManager.getInventory.getCurrencies(
            tokenType === 'class'
                ? this.bot.craftWeaponsByClass[subTokenType as ClassesForCraftableWeapons]
                : this.craftWeaponsBySlot[subTokenType as SlotsForCraftableWeapons],
            false
        );

        for (const sku in craftableItems) {
            if (!Object.prototype.hasOwnProperty.call(craftableItems, sku)) {
                continue;
            }

            if (craftableItems[sku].length === 0) {
                delete craftableItems[sku];
                continue;
            }

            assetids.push(...craftableItems[sku]);
        }

        const availableAmount = assetids.length;
        const amountCanCraft = Math.floor(availableAmount / 3);
        const capTokenType = capitalize(tokenType);
        const capSubTokenType = subTokenType === 'pda2' ? 'PDA2' : capitalize(subTokenType);

        if (amount === 'max' && amountCanCraft === 0) {
            return this.bot.sendMessage(
                steamID,
                `❌ Unable to craft ${capTokenType} Token - ${capSubTokenType} since I only have of ${capSubTokenType} ${tokenType} items.`
            );
        }

        if (amount !== 'max' && amount > amountCanCraft) {
            return this.bot.sendMessage(
                steamID,
                `❌ I can only craft ${amountCanCraft} ${capTokenType} Token - ${capSubTokenType} at the moment, since I only ` +
                    `have ${availableAmount} of ${capSubTokenType} ${tokenType} items.`
            );
        }

        this.bot.sendMessage(steamID, '⏳ Crafting 🔨...');
        this.isCrafting = true;

        let crafted = 0;
        let callbackIndex = 0;
        const amountToCraft = amount === 'max' ? amountCanCraft : amount;
        for (let i = 0; i < amountToCraft; i++) {
            const assetidsToCraft = assetids.splice(0, 3);
            this.bot.tf2gc.craftToken(assetidsToCraft, tokenType as TokenType, subTokenType as SubTokenType, err => {
                if (err) {
                    log.debug(
                        `Error crafting ${assetidsToCraft.join(', ')} for ${capTokenType} Token - ${capSubTokenType}`
                    );
                    crafted--;
                }

                callbackIndex++;
                crafted++;

                if (amountToCraft - callbackIndex === 0) {
                    this.isCrafting = false;

                    this.bot.client.gamesPlayed([]);
                    this.bot.client.gamesPlayed(
                        this.bot.options.miscSettings.game.playOnlyTF2 ? 440 : [this.bot.handler.customGameName, 440]
                    );

                    if (crafted < amountToCraft) {
                        return this.bot.sendMessage(
                            steamID,
                            `✅ Successfully crafted ${crafted} ${capTokenType} Token - ${capSubTokenType} (there were some error while crafting).`
                        );
                    }

                    return this.bot.sendMessage(
                        steamID,
                        `✅ Successfully crafted ${crafted} ${capTokenType} Token - ${capSubTokenType}!`
                    );
                }
            });
        }
    }

    private getCraftTokenInfo(steamID: SteamID): void {
        this.defineCraftWeaponsBySlots();

        const reply: string[] = [];
        const craftWeaponsByClass = this.bot.craftWeaponsByClass;
        const inventory = this.bot.inventoryManager.getInventory;

        for (const charClass in craftWeaponsByClass) {
            if (!Object.prototype.hasOwnProperty.call(craftWeaponsByClass, charClass)) {
                continue;
            }

            const craftableItems = this.bot.inventoryManager.getInventory.getCurrencies(
                craftWeaponsByClass[charClass as ClassesForCraftableWeapons],
                false
            );

            const assetids: string[] = [];

            for (const sku in craftableItems) {
                if (!Object.prototype.hasOwnProperty.call(craftableItems, sku)) {
                    continue;
                }

                if (craftableItems[sku].length === 0) {
                    delete craftableItems[sku];
                    continue;
                }

                assetids.push(...craftableItems[sku]);
            }

            const availableAmount = assetids.length;
            const amountCanCraft = Math.floor(availableAmount / 3);
            const capSubTokenType = capitalize(charClass);

            let sku: string;
            switch (charClass) {
                case 'scout':
                    sku = '5003;6';
                    break;
                case 'soldier':
                    sku = '5005;6';
                    break;
                case 'pyro':
                    sku = '5009;6';
                    break;
                case 'demoman':
                    sku = '5006;6';
                    break;
                case 'heavy':
                    sku = '5007;6';
                    break;
                case 'engineer':
                    sku = '5011;6';
                    break;
                case 'medic':
                    sku = '5008;6';
                    break;
                case 'sniper':
                    sku = '5004;6';
                    break;
                case 'spy':
                    sku = '5010;6';
            }

            const currentTokenStock = inventory.getAmount({
                priceKey: sku,
                includeNonNormalized: false,
                tradableOnly: true
            });

            reply.push(
                `Class Token - ${capSubTokenType}: can craft ${amountCanCraft} (${availableAmount} items), token stock: ${currentTokenStock}`
            );
        }

        const craftWeaponsBySlots = this.craftWeaponsBySlot;

        for (const slot in craftWeaponsBySlots) {
            if (!Object.prototype.hasOwnProperty.call(craftWeaponsBySlots, slot)) {
                continue;
            }

            const craftableItems = this.bot.inventoryManager.getInventory.getCurrencies(
                craftWeaponsBySlots[slot],
                false
            );

            const assetids: string[] = [];

            for (const sku in craftableItems) {
                if (!Object.prototype.hasOwnProperty.call(craftableItems, sku)) {
                    continue;
                }

                if (craftableItems[sku].length === 0) {
                    delete craftableItems[sku];
                    continue;
                }

                assetids.push(...craftableItems[sku]);
            }

            const availableAmount = assetids.length;
            const amountCanCraft = Math.floor(availableAmount / 3);
            const capSubTokenType = slot === 'pda2' ? 'PDA2' : capitalize(slot);

            let sku: string;
            switch (slot) {
                case 'primary':
                    sku = '5012;6';
                    break;
                case 'secondary':
                    sku = '5013;6';
                    break;
                case 'melee':
                    sku = '5014;6';
                    break;
                case 'pda2':
                    sku = '5018;6';
                    break;
            }

            const currentTokenStock = inventory.getAmount({
                priceKey: sku,
                includeNonNormalized: false,
                tradableOnly: true
            });

            reply.push(
                `Slot Token - ${capSubTokenType}: can craft ${amountCanCraft} (${availableAmount} items), token stock: ${currentTokenStock}`
            );
        }

        this.bot.sendMessage(steamID, '🔨 Crafting token info:\n\n- ' + reply.join('\n- '));
    }

    private defineCraftWeaponsBySlots(): void {
        if (this.craftWeaponsBySlot === undefined) {
            // only load on demand
            this.craftWeaponsBySlot = {
                primary: [],
                secondary: [],
                melee: [],
                pda2: []
            };
            const craftableWeapons = this.bot.schema.getCraftableWeaponsSchema();
            const count = craftableWeapons.length;

            for (let i = 0; i < count; i++) {
                const item = craftableWeapons[i];

                if (['primary', 'secondary', 'melee', 'pda2'].includes(item.item_slot)) {
                    this.craftWeaponsBySlot[item.item_slot as SlotsForCraftableWeapons].push(`${item.defindex};6`);
                }
            }
        }
    }
}
