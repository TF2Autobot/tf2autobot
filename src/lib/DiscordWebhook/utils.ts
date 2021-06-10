import TradeOfferManager, { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { Webhook } from './interfaces';
import Bot from '../../classes/Bot';
import log from '../logger';

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
        const request = new XMLHttpRequest();

        request.onreadystatechange = (): void => {
            if (request.readyState === 4) {
                if (request.status === 204) {
                    resolve();
                } else {
                    reject({ responseText: request.responseText, webhook });
                }
            }
        };

        request.open('POST', url);
        request.setRequestHeader('Content-type', 'application/json');

        // remove mention owner on the second or more links, so the owner will not getting mentioned on the other servers.
        request.send(
            i > 0 && event === 'trade-summary'
                ? JSON.stringify(webhook) // this is for second and subsequent servers
                      .replace(/<@!\d+>/g, '') // remove mention
                      .replace(/ \(\d+ → \d+(\/\d+)?\)/g, '') // remove current/max stock
                : JSON.stringify(webhook)
        );
    });
}
