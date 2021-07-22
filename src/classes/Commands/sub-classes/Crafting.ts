import SteamID from 'steamid';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { TokenType, SubTokenType } from '../../TF2GC';

import log from '../../../lib/logger';

export default class CraftingCommands {
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
                '❌ subTokenType must be one of 9 TF2 class character since your tokenType is class!'
            );
        } else if (tokenType === 'slot' && !slotType.includes(subTokenType)) {
            return this.bot.sendMessage(
                steamID,
                '❌ subTokenType must only be either "primary", "secondary", "melee", or "pda2" since your tokenType is slot!'
            );
        }

        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

        if (tokenType === 'class') {
            const theClass = capitalize(subTokenType);

            const craftableItems = this.bot.inventoryManager.getInventory.getCurrencies(
                this.bot.craftWeaponsByClass[theClass]
            );

            const assetids: string[] = [];

            for (const sku in craftableItems) {
                if (!Object.prototype.hasOwnProperty.call(craftableItems, sku)) {
                    continue;
                }

                if (craftableItems[sku].length === 0) {
                    delete craftableItems[sku];
                }

                assetids.push(...craftableItems[sku]);
            }

            const availableAmount = assetids.length;
            const amountCanCraft = Math.ceil(availableAmount / 3);

            if (amount > amountCanCraft) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I can only craft  ${amountCanCraft} Class Token - ${theClass} at the moment, since I only` +
                        `have ${availableAmount} of ${theClass} class items.`
                );
            }

            this.bot.sendMessage(steamID, '⏳ Crafting 🔨...');

            let crafted = 0;
            let callbackIndex = 0;
            for (let i = 0; i < amountCanCraft; i++) {
                const assetidsToCraft = assetids.splice(0, 2);
                this.bot.tf2gc.craftToken(
                    assetidsToCraft,
                    tokenType as TokenType,
                    subTokenType as SubTokenType,
                    err => {
                        if (err) {
                            log.debug(`Error crafting ${assetidsToCraft.join(', ')} for Class Token - ${theClass}`);
                            crafted--;
                        }

                        callbackIndex++;
                        crafted++;

                        if (amountCanCraft - callbackIndex === 1) {
                            if (crafted < amountCanCraft) {
                                return this.bot.sendMessage(
                                    steamID,
                                    `✅ Successfully crafted ${crafted} Class Token - ${theClass} (there were some error while crafting).`
                                );
                            }

                            return this.bot.sendMessage(
                                steamID,
                                `✅ Successfully crafted ${crafted} Class Token - ${theClass}!`
                            );
                        }
                    }
                );
            }
        } else {
            // To be continued (for slot token)
        }
    }
}
