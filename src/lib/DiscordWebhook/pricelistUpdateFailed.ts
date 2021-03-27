import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../logger';
import { GetItemPriceResponse } from '../../classes/Pricer';
import sleepasync from 'sleep-async';
import { UnknownDictionary } from '../../types/common';
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

    PriceUpdateFailedQueue.setURL(opt.priceUpdate.url);
    void PriceUpdateFailedQueue.enqueue(data.sku, priceUpdate);
}

class PriceUpdateFailedQueue {
    private static priceUpdate: UnknownDictionary<Webhook> = {};

    private static url: string;

    static setURL(url: string) {
        this.url = url;
    }

    static async enqueue(sku: string, webhook: Webhook): Promise<void> {
        this.priceUpdate[sku] = webhook;

        await sleepasync().Promise.sleep(100);
        this.process();
    }

    static dequeue(): void {
        delete this.priceUpdate[this.first()];
    }

    static first(): string {
        return Object.keys(this.priceUpdate)[0];
    }

    static process(): void {
        const sku = this.first();

        if (sku === undefined) {
            return;
        }

        sendWebhook(this.url, this.priceUpdate[sku], 'pricelist-update')
            .then(() => {
                log.debug(`Sent price update error for ${sku} to Discord.`);
            })
            .catch(err => {
                log.debug(`❌ Failed to send price update error for ${sku} to Discord: `, err);
            })
            .finally(() => {
                this.dequeue();
                this.process();
            });
    }
}
