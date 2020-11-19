import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import Bot from '../../classes/Bot';

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
