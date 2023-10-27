import TradeOfferManager, { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import axios, { AxiosError } from 'axios';
import { Webhook } from './interfaces';
import Bot from '../Bot';
import log from '../../lib/logger';
import filterAxiosError, { ErrorFiltered } from '@tf2autobot/filter-axios-error';

export function getPartnerDetails(offer: TradeOffer, bot: Bot): Promise<{ personaName: string; avatarFull: any }> {
    return new Promise(resolve => {
        const defaultImage =
            'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/72/72f78b4c8cc1f62323f8a33f6d53e27db57c2252_full.jpg'; //default "?" image
        if (offer.state === TradeOfferManager.ETradeOfferState['Active']) {
            offer.getUserDetails((err, me, them) => {
                if (err) {
                    log.warn('Error retrieving partner Avatar and Name: ', err);
                    resolve({
                        personaName: 'unknown',
                        avatarFull: defaultImage
                    });
                } else {
                    log.info('Partner Avatar and Name retrieved. Applying...');
                    resolve({
                        personaName: them.personaName,
                        avatarFull: them.avatarFull
                    });
                }
            });
        } else {
            bot.community.getSteamUser(offer.partner, (err, user) => {
                if (err) {
                    log.warn('Error retrieving partner Avatar and Name: ', err);
                    resolve({
                        personaName: 'unknown',
                        avatarFull: defaultImage
                    });
                } else {
                    log.info('Partner Avatar and Name retrieved. Applying...');
                    resolve({
                        personaName: user.name,
                        avatarFull: user.getAvatarURL('full')
                    });
                }
            });
        }
    });
}

export function quickLinks(name: string, links: { steam: string; bptf: string; steamrep: string }): string {
    return `🔍 ${name}'s info:\n[Steam Profile](${links.steam}) | [backpack.tf](${links.bptf}) | [steamREP](${links.steamrep})`;
}

export function sendWebhook(url: string, webhook: Webhook, event: string, i?: number): Promise<void> {
    return new Promise((resolve, reject) => {
        if (i > 0 && event === 'trade-summary') {
            webhook.content = webhook.content.replace(/( )?<@!\d+>(,)?/g, ''); // remove mention
            webhook.embeds.forEach((embed, index) => {
                webhook.embeds[index].description = embed.description.replace(/ \(\d+ → \d+(\/\d+)?\)/g, '');
            });
        }

        void axios({
            method: 'POST',
            url: url,
            data: webhook
        })
            .then(() => {
                resolve();
            })
            .catch((err: AxiosError) => {
                reject({ err: filterAxiosError(err), webhook });
            });
    });
}

export interface WebhookError {
    err: ErrorFiltered;
    webhook: Webhook;
}
