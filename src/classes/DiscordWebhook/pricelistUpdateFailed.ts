import { sendWebhook, WebhookError, WebhookErrorData } from './utils';
import { Webhook } from './interfaces';
import log from '../../lib/logger';
import { GetItemPriceResponse } from '../IPricer';
import * as timersPromises from 'timers/promises';
import { UnknownDictionary } from '../../types/common';
import Options from '../Options';
import { BotInfo } from '../MyHandler/MyHandler';

export default function sendFailedPriceUpdate(
    data: GetItemPriceResponse,
    err: Error,
    isCustomPricer: boolean,
    options: Options,
    botInfo: BotInfo
): void {
    const opt = options.discordWebhook;
    const priceUpdate: Webhook = {
        username: opt.displayName || botInfo.name,
        avatar_url: opt.avatarURL || botInfo.avatarURL,
        content: '',
        embeds: [
            {
                author: {
                    name: data.sku,
                    url: `https://autobot.tf/items/${data.sku}`,
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
    PriceUpdateFailedQueue.enqueue(data.sku, priceUpdate);
}

class PriceUpdateFailedQueue {
    private static priceUpdate: UnknownDictionary<Webhook> = {};

    private static url: string;

    static setURL(url: string) {
        this.url = url;
    }

    private static sleepTime = 1500;

    private static isRateLimited = false;

    private static isProcessing = false;

    static enqueue(sku: string, webhook: Webhook): void {
        this.priceUpdate[sku] = webhook;

        void this.process();
    }

    private static dequeue(): void {
        delete this.priceUpdate[this.first()];
    }

    private static first(): string {
        return Object.keys(this.priceUpdate)[0];
    }

    private static size(): number {
        return Object.keys(this.priceUpdate).length;
    }

    private static async process(): Promise<void> {
        const sku = this.first();

        if (sku === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        await timersPromises.setTimeout(this.sleepTime);

        if (this.isRateLimited) {
            this.sleepTime = 1500;
            this.isRateLimited = false;
        }

        sendWebhook(this.url, this.priceUpdate[sku], 'pricelist-update')
            .then(() => this.dequeue())
            .catch((e: WebhookError) => {
                log.warn(`❌ Failed to send price update error for ${sku} to Discord: `, e.err);
                if (e?.err?.status === 429) {
                    const retryAfter = (e.err.data as WebhookErrorData)?.retry_after;
                    this.sleepTime = typeof retryAfter === 'number' ? retryAfter * 1000 + 100 : 3000;
                    this.isRateLimited = true;
                }
            })
            .finally(() => {
                this.isProcessing = false;
                void this.process();
            });
    }
}
