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

    const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as unknown;

    const optionsPath = getOptionsPath(opt.steamAccountName);
    const saveOptions = deepMerge({}, opt) as JsonOptions;
    removeCliOptions(saveOptions);

    if (Object.keys(params).length === 0) {
        const msg = '⚠️ Missing properties to update.';
        if (steamID) bot.sendMessage(steamID, msg);
        else log.warn(msg);
        return;
    }

    const knownParams = params as JsonOptions;

    // Convert every string required to string (if user input was some numbers)

    if (knownParams.sendOfferMessage !== undefined) {
        // idk maybe someone want to put their phone number here xD
        knownParams.sendOfferMessage = String(knownParams.sendOfferMessage);
    }

    if (typeof knownParams.game === 'object') {
        if (knownParams.game.customName !== undefined) {
            // same as above
            knownParams.game.customName = String(knownParams.game.customName);
        }
    }

    if (typeof knownParams.customMessage === 'object') {
        // maybe they want to put as binary number for these custom messages
        if (knownParams.customMessage.welcome !== undefined) {
            knownParams.customMessage.welcome = String(knownParams.customMessage.welcome);
        }
        if (knownParams.customMessage.iDontKnowWhatYouMean !== undefined) {
            knownParams.customMessage.iDontKnowWhatYouMean = String(knownParams.customMessage.iDontKnowWhatYouMean);
        }
        if (knownParams.customMessage.how2trade !== undefined) {
            knownParams.customMessage.how2trade = String(knownParams.customMessage.how2trade);
        }
        if (knownParams.customMessage.success !== undefined) {
            knownParams.customMessage.success = String(knownParams.customMessage.success);
        }
        if (knownParams.customMessage.decline !== undefined) {
            knownParams.customMessage.decline = String(knownParams.customMessage.decline);
        }
        if (knownParams.customMessage.tradedAway !== undefined) {
            knownParams.customMessage.tradedAway = String(knownParams.customMessage.tradedAway);
        }
        if (knownParams.customMessage.clearFriends !== undefined) {
            knownParams.customMessage.clearFriends = String(knownParams.customMessage.clearFriends);
        }
    }

    if (typeof knownParams.manualReview === 'object') {
        // yeah same
        if (knownParams.manualReview.invalidValue !== undefined) {
            if (knownParams.manualReview.invalidValue.note !== undefined) {
                knownParams.manualReview.invalidValue.note = String(knownParams.manualReview.invalidValue.note);
            }
            if (knownParams.manualReview.invalidValue.autoDecline !== undefined) {
                if (knownParams.manualReview.invalidValue.autoDecline.note !== undefined) {
                    knownParams.manualReview.invalidValue.autoDecline.note = String(
                        knownParams.manualReview.invalidValue.autoDecline.note
                    );
                }
            }
        }
        if (knownParams.manualReview.invalidItems !== undefined) {
            if (knownParams.manualReview.invalidItems.note !== undefined) {
                knownParams.manualReview.invalidItems.note = String(knownParams.manualReview.invalidItems.note);
            }
        }
        if (knownParams.manualReview.overstocked !== undefined) {
            if (knownParams.manualReview.overstocked.note !== undefined) {
                knownParams.manualReview.overstocked.note = String(knownParams.manualReview.overstocked.note);
            }
        }
        if (knownParams.manualReview.understocked !== undefined) {
            if (knownParams.manualReview.understocked.note !== undefined) {
                knownParams.manualReview.understocked.note = String(knownParams.manualReview.understocked.note);
            }
        }
        if (knownParams.manualReview.duped !== undefined) {
            if (knownParams.manualReview.duped.note !== undefined) {
                knownParams.manualReview.duped.note = String(knownParams.manualReview.duped.note);
            }
        }
        if (knownParams.manualReview.dupedCheckFailed !== undefined) {
            if (knownParams.manualReview.dupedCheckFailed.note !== undefined) {
                knownParams.manualReview.dupedCheckFailed.note = String(knownParams.manualReview.dupedCheckFailed.note);
            }
        }
        if (knownParams.manualReview.additionalNotes !== undefined) {
            knownParams.manualReview.additionalNotes = String(knownParams.manualReview.additionalNotes);
        }
    }

    if (typeof knownParams.discordWebhook === 'object') {
        if (knownParams.discordWebhook.ownerID !== undefined) {
            // THIS IS WHAT IS NEEDED ACTUALLY
            knownParams.discordWebhook.ownerID = String(knownParams.discordWebhook.ownerID);
        }
        if (knownParams.discordWebhook.displayName !== undefined) {
            knownParams.discordWebhook.displayName = String(knownParams.discordWebhook.displayName);
        }
        if (knownParams.discordWebhook.embedColor !== undefined) {
            // AND ALSO THIS
            knownParams.discordWebhook.embedColor = String(knownParams.discordWebhook.embedColor);
        }
    }

    const result: JsonOptions = deepMerge(saveOptions, knownParams);

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

            if (typeof knownParams.game === 'object') {
                if (knownParams.game.playOnlyTF2 !== undefined && knownParams.game.playOnlyTF2 === true) {
                    bot.client.gamesPlayed([]);
                    bot.client.gamesPlayed(440);
                }

                if (knownParams.game.customName !== undefined && typeof knownParams.game.customName === 'string') {
                    bot.client.gamesPlayed([]);
                    bot.client.gamesPlayed(
                        (
                            knownParams.game.playOnlyTF2 !== undefined
                                ? knownParams.game.playOnlyTF2
                                : opt.game.playOnlyTF2
                        )
                            ? 440
                            : [knownParams.game.customName, 440]
                    );
                }
            }

            if (typeof knownParams.weaponsAsCurrency === 'object') {
                if (knownParams.weaponsAsCurrency.enable !== undefined) {
                    if (knownParams.weaponsAsCurrency.enable === true) {
                        (bot.handler as MyHandler).shuffleWeapons();
                    } else {
                        (bot.handler as MyHandler).disableWeaponsAsCurrency();
                    }
                }

                if (knownParams.weaponsAsCurrency.withUncraft !== undefined) {
                    (bot.handler as MyHandler).shuffleWeapons();
                }
            }

            if (knownParams.autobump !== undefined) {
                if (knownParams.autobump === true) {
                    bot.listings.setupAutorelist();
                    (bot.handler as MyHandler).disableAutoRefreshListings();
                } else {
                    bot.listings.disableAutorelistOption();
                    (bot.handler as MyHandler).enableAutoRefreshListings();
                }
            }

            if (knownParams.autokeys !== undefined) {
                if (knownParams.autokeys.enable !== undefined && !knownParams.autokeys.enable) {
                    (bot.handler as MyHandler).autokeys.disable();
                }
                (bot.handler as MyHandler).autokeys.check();
                (bot.handler as MyHandler).updateAutokeysStatus();
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
