import SteamID from 'steamid';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { TokenType, SubTokenType } from '../../TF2GC';

import log from '../../../lib/logger';

interface CraftWeaponsBySlot {
    [slot: string]: string[];
}

type SlotsForCraftableWeapons = 'primary' | 'secondary' | 'melee' | 'pda2';

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
                '❌ Please set crafting.manual option to false in order to use this command.'
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

        if (parts.length < 3) {
            return this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Correct syntax: !craftToken <tokenType> <subTokenType> <amount>' +
                    '\n - tokenType: "class" or "slot"' +
                    '\n - subTokenType: one of the 9 TF2 class characters if TokenType is class, or "primary"/"secondary"/"melee"/"pda2" if TokenType is slot' +
                    '\n - amount: Must be an integer'
            );
        }

        const tokenType = parts[0];
        const subTokenType = parts[1];
        const amount = parseInt(parts[2]);

        if (isNaN(amount)) {
            return this.bot.sendMessage(steamID, '❌ Amount must be type integer!');
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

        if (tokenType === 'slot' && this.craftWeaponsBySlot === undefined) {
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

        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
        const assetids: string[] = [];

        const craftableItems = this.bot.inventoryManager.getInventory.getCurrencies(
            tokenType === 'class'
                ? this.bot.craftWeaponsByClass[subTokenType]
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
        const capSubTokenType = capitalize(subTokenType);

        if (amount > amountCanCraft) {
            return this.bot.sendMessage(
                steamID,
                `❌ I can only craft  ${amountCanCraft} ${capTokenType} Token - ${capSubTokenType} at the moment, since I only ` +
                    `have ${availableAmount} of ${capSubTokenType} ${tokenType} items.`
            );
        }

        this.bot.sendMessage(steamID, '⏳ Crafting 🔨...');
        this.isCrafting = true;

        let crafted = 0;
        let callbackIndex = 0;
        for (let i = 0; i < amountCanCraft; i++) {
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

                if (amountCanCraft - callbackIndex === 1) {
                    this.isCrafting = false;

                    if (crafted < amountCanCraft) {
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
}
