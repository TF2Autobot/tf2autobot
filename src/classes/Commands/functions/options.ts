/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import SteamID from 'steamid';
import { promises as fsp } from 'fs';

import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { getOptionsPath, JsonOptions, removeCliOptions } from '../../Options';

import { deepMerge } from '../../../lib/tools/deep-merge';
import validator from '../../../lib/validator';
import log from '../../../lib/logger';
import MyHandler from '../../MyHandler/MyHandler';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const liveOptions = deepMerge({}, bot.options) as JsonOptions;
    // remove any CLI stuff
    removeCliOptions(liveOptions);
    bot.sendMessage(steamID, `/code ${JSON.stringify(liveOptions, null, 4)}`);
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;

    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    const optionsPath = getOptionsPath(opt.steamAccountName);
    const saveOptions = deepMerge({}, opt) as JsonOptions;
    removeCliOptions(saveOptions);

    if (Object.keys(params).length === 0) {
        const msg = '⚠️ Missing properties to update.';
        if (steamID) bot.sendMessage(steamID, msg);
        else log.warn(msg);
        return;
    }

    // Convert every string required to string (if user input was some numbers)

    if (params.sendOfferMessage !== undefined) {
        // idk maybe someone want to put their phone number here xD
        params.sendOfferMessage = String(params.sendOfferMessage);
    }

    if (typeof params.game === 'object') {
        if (params.game.customName !== undefined) {
            // same as above
            params.game.customName = String(params.game.customName);
        }
    }

    if (typeof params.customMessage === 'object') {
        // maybe they want to put as binary number for these custom messages
        if (params.customMessage.welcome !== undefined) {
            params.customMessage.welcome = String(params.customMessage.welcome);
        }
        if (params.customMessage.iDontKnowWhatYouMean !== undefined) {
            params.customMessage.iDontKnowWhatYouMean = String(params.customMessage.iDontKnowWhatYouMean);
        }
        if (params.customMessage.how2trade !== undefined) {
            params.customMessage.how2trade = String(params.customMessage.how2trade);
        }
        if (params.customMessage.success !== undefined) {
            params.customMessage.success = String(params.customMessage.success);
        }
        if (params.customMessage.decline !== undefined) {
            params.customMessage.decline = String(params.customMessage.decline);
        }
        if (params.customMessage.tradedAway !== undefined) {
            params.customMessage.tradedAway = String(params.customMessage.tradedAway);
        }
        if (params.customMessage.clearFriends !== undefined) {
            params.customMessage.clearFriends = String(params.customMessage.clearFriends);
        }
    }

    if (typeof params.manualReview === 'object') {
        // yeah same
        if (params.manualReview.invalidValue !== undefined) {
            if (params.manualReview.invalidValue.note !== undefined) {
                params.manualReview.invalidValue.note = String(params.manualReview.invalidValue.note);
            }
            if (params.manualReview.invalidValue.autoDecline !== undefined) {
                if (params.manualReview.invalidValue.autoDecline.note !== undefined) {
                    params.manualReview.invalidValue.autoDecline.note = String(
                        params.manualReview.invalidValue.autoDecline.note
                    );
                }
            }
        }
        if (params.manualReview.invalidItems !== undefined) {
            if (params.manualReview.invalidItems.note !== undefined) {
                params.manualReview.invalidItems.note = String(params.manualReview.invalidItems.note);
            }
        }
        if (params.manualReview.overstocked !== undefined) {
            if (params.manualReview.overstocked.note !== undefined) {
                params.manualReview.overstocked.note = String(params.manualReview.overstocked.note);
            }
        }
        if (params.manualReview.understocked !== undefined) {
            if (params.manualReview.understocked.note !== undefined) {
                params.manualReview.understocked.note = String(params.manualReview.understocked.note);
            }
        }
        if (params.manualReview.duped !== undefined) {
            if (params.manualReview.duped.note !== undefined) {
                params.manualReview.duped.note = String(params.manualReview.duped.note);
            }
        }
        if (params.manualReview.dupedCheckFailed !== undefined) {
            if (params.manualReview.dupedCheckFailed.note !== undefined) {
                params.manualReview.dupedCheckFailed.note = String(params.manualReview.dupedCheckFailed.note);
            }
        }
        if (params.manualReview.additionalNotes !== undefined) {
            params.manualReview.additionalNotes = String(params.manualReview.additionalNotes);
        }
    }

    if (typeof params.discordWebhook === 'object') {
        if (params.discordWebhook.ownerID !== undefined) {
            // THIS IS WHAT IS NEEDED ACTUALLY
            params.discordWebhook.ownerID = String(params.discordWebhook.ownerID);
        }
        if (params.discordWebhook.displayName !== undefined) {
            params.discordWebhook.displayName = String(params.discordWebhook.displayName);
        }
        if (params.discordWebhook.embedColor !== undefined) {
            // AND ALSO THIS
            params.discordWebhook.embedColor = String(params.discordWebhook.embedColor);
        }
    }

    const result: JsonOptions = deepMerge(saveOptions, params);

    const errors = validator(result, 'options');
    if (errors !== null) {
        const msg = '❌ Error updating options: ' + errors.join(', ');
        if (steamID) bot.sendMessage(steamID, msg);
        else log.error(msg);
        return;
    }

    fsp.writeFile(optionsPath, JSON.stringify(saveOptions, null, 4), { encoding: 'utf8' })
        .then(() => {
            deepMerge(opt, saveOptions);
            const msg = '✅ Updated options!';

            if (typeof params.game === 'object') {
                if (params.game.playOnlyTF2 !== undefined && params.game.playOnlyTF2 === true) {
                    bot.client.gamesPlayed([]);
                    bot.client.gamesPlayed(440);
                }

                if (params.game.customName !== undefined && typeof params.game.customName === 'string') {
                    bot.client.gamesPlayed([]);
                    bot.client.gamesPlayed(
                        (params.game.playOnlyTF2 !== undefined ? params.game.playOnlyTF2 : opt.game.playOnlyTF2)
                            ? 440
                            : [params.game.customName, 440]
                    );
                }
            }

            if (typeof params.weaponsAsCurrency === 'object') {
                if (params.weaponsAsCurrency.enable !== undefined) {
                    if (params.weaponsAsCurrency.enable === true) {
                        (bot.handler as MyHandler).shuffleWeapons();
                    } else {
                        (bot.handler as MyHandler).disableWeaponsAsCurrency();
                    }
                }

                if (params.weaponsAsCurrency.withUncraft !== undefined) {
                    (bot.handler as MyHandler).shuffleWeapons();
                }
            }

            if (params.autobump !== undefined) {
                if (params.autobump === true) {
                    bot.listings.setupAutorelist();
                    (bot.handler as MyHandler).disableAutoRefreshListings();
                } else {
                    bot.listings.disableAutorelistOption();
                    (bot.handler as MyHandler).enableAutoRefreshListings();
                }
            }

            if (params.autokeys !== undefined) {
                (bot.handler as MyHandler).autokeys.check();
            }

            if (steamID) return bot.sendMessage(steamID, msg);
            else return log.info(msg);
        })
        .catch(err => {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            const msg = `❌ Error saving options file to disk: ${err}`;
            if (steamID) bot.sendMessage(steamID, msg);
            else log.error(msg);
            return;
        });
}
