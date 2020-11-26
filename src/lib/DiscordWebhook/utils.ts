import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import { XMLHttpRequest } from 'xmlhttprequest-ts';

import Bot from '../../classes/Bot';

import { Webhook } from './interfaces';

export function getPartnerDetails(offer: TradeOffer, bot: Bot, callback: (err: any, details: any) => void): any {
    // check state of the offer
    if (offer.state === TradeOfferManager.ETradeOfferState.active) {
        offer.getUserDetails((err, me, them) => {
            if (err) {
                callback(err, {});
            } else {
                callback(null, them);
            }
        });
    } else {
        bot.community.getSteamUser(offer.partner, (err, user) => {
            if (err) {
                callback(err, {});
            } else {
                callback(null, {
                    personaName: user.name,
                    avatarFull: user.getAvatarURL('full')
                });
            }
        });
    }
}

export function quickLinks(name: string, links: { steam: string; bptf: string; steamrep: string }): string {
    return `🔍 ${name}'s info:\n[Steam Profile](${links.steam}) | [backpack.tf](${links.bptf}) | [steamREP](${links.steamrep})`;
}

export function sendWebhook(url: string, webhook: Webhook, event: string, i?: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.onreadystatechange = function(): void {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    resolve();
                } else {
                    reject(request.responseText);
                }
            }
        };

        request.open('POST', url);
        request.setRequestHeader('Content-type', 'application/json');

        // remove mention owner on the second or more links, so the owner will not getting mentioned on the other servers.
        request.send(
            i > 0 && event === 'trade-summary'
                ? JSON.stringify(webhook).replace(/<@!\d+>/g, '')
                : JSON.stringify(webhook)
        );
    });
}
