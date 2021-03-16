import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../logger';
import { GetItemPriceResponse } from '../../classes/Pricer';
import Options from '../../classes/Options';

export default function sendFailedPriceUpdate(
    data: GetItemPriceResponse,
    err: Error,
    isCustomPricer: boolean,
    options: Options
): void {
    const opt = options.discordWebhook;
    const priceUpdate: Webhook = {
        username: opt.displayName,
        avatar_url: opt.avatarURL,
        content: '',
        embeds: [
            {
                author: {
                    name: data.sku,
                    url: `https://www.prices.tf/items/${data.sku}`,
                    icon_url: isCustomPricer
                        ? 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/81/818fb1e235ccf685e8532a17f111f2697451b0d0_full.jpg'
                        : 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                },
                footer: {
                    text: `v${process.env.BOT_VERSION}`
                },
                title: '',
                description: `Error: "${err.message}"\ndata: ${JSON.stringify(data, null, 4)}`,
                color: '16711680' // red
            }
        ]
    };

    sendWebhook(opt.priceUpdate.url, priceUpdate, 'partner-message')
        .then(() => log.debug(`✅ Sent price update error to Discord.`))
        .catch(err => log.debug(`❌ Failed to send price update error to Discord: `, err));
}
