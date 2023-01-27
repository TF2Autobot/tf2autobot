import filterAxiosError from '@tf2autobot/filter-axios-error';
import axios, { AxiosError } from 'axios';
import Bot from '../../classes/Bot';
import { TradeSummery } from './tradeSummery';
import * as tradeSummery from './tradeSummery';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface WebhookHandler extends TradeSummery {}

export enum WebhookType {
    priceUpdate = 'priceUpdate',
    tradeSummary = 'tradeSummary',
    declinedTrade = 'declinedTrade',
    sendStats = 'sendStats',
    tf2SystemMessage = 'tf2SystemMessage',
    tf2ItemBroadcast = 'tf2ItemBroadcast',
    tf2DisplayNotification = 'tf2DisplayNotification',
    sendAlert = 'sendAlert',
    messages = 'messages'
}

class WebhookHandler {
    // Lets make a list of what is enabled
    // and what is not

    // WebhookHandler is a class that will handle
    // all the webhooks that are enabled in the config
    // and will send them to the correct place
    private enablePriceListUpdate: boolean;

    private enableTradeSummary: boolean;

    private enableTradeDeclined: boolean;

    private enableStats: boolean;

    private enableTf2SystemMessage: boolean;

    private enableTf2ItemBroadcast: boolean;

    private enableTf2DisplayNotification: boolean;

    private enableAlert: boolean;

    private enableMessages: boolean;

    private webhookSecret: string;

    constructor(private readonly bot: Bot) {
        this.init();
    }

    private init() {
        // Lets get webhook settings from bot
        const { webhooks } = this.bot.options;
        this.enablePriceListUpdate = webhooks.priceUpdate.enable;
        this.enableTradeSummary = webhooks.tradeSummary.enable;
        this.enableTradeDeclined = webhooks.declinedTrade.enable;
        this.enableStats = webhooks.sendStats.enable;
        this.enableTf2SystemMessage = webhooks.sendTf2Events.systemMessage.enable;
        this.enableTf2ItemBroadcast = webhooks.sendTf2Events.itemBroadcast.enable;
        this.enableTf2DisplayNotification = webhooks.sendTf2Events.displayNotification.enable;
        this.enableAlert = webhooks.sendAlert.enable;
        this.enableMessages = webhooks.messages.enable;
        this.webhookSecret = webhooks.webhookSecret;
    }

    private getUrl(type: WebhookType) {
        switch (type) {
            case WebhookType.priceUpdate:
                return this.bot.options.webhooks.priceUpdate.url;
            case WebhookType.tradeSummary:
                return this.bot.options.webhooks.tradeSummary.url;
            case WebhookType.declinedTrade:
                return this.bot.options.webhooks.declinedTrade.url;
            case WebhookType.sendStats:
                return this.bot.options.webhooks.sendStats.url;
            case WebhookType.tf2DisplayNotification:
                return this.bot.options.webhooks.sendTf2Events.displayNotification.url;
            case WebhookType.tf2ItemBroadcast:
                return this.bot.options.webhooks.sendTf2Events.itemBroadcast.url;
            case WebhookType.tf2SystemMessage:
                return this.bot.options.webhooks.sendTf2Events.systemMessage.url;
            case WebhookType.sendAlert:
                return this.bot.options.webhooks.sendAlert.url.main;
            case WebhookType.messages:
                return this.bot.options.webhooks.messages.url;
            default:
                return null;
        }
    }

    private isEnabled(type: WebhookType) {
        switch (type) {
            case WebhookType.priceUpdate:
                return this.enablePriceListUpdate;
            case WebhookType.tradeSummary:
                return this.enableTradeSummary;
            case WebhookType.declinedTrade:
                return this.enableTradeDeclined;
            case WebhookType.sendStats:
                return this.enableStats;
            case WebhookType.tf2DisplayNotification:
                return this.enableTf2DisplayNotification;
            case WebhookType.tf2ItemBroadcast:
                return this.enableTf2ItemBroadcast;
            case WebhookType.tf2SystemMessage:
                return this.enableTf2SystemMessage;
            case WebhookType.sendAlert:
                return this.enableAlert;
            case WebhookType.messages:
                return this.enableMessages;
            default:
                return false;
        }
    }

    async sendWebhook(type: WebhookType, data: Record<any, any>) {
        return new Promise((resolve, reject) => {
            const url = this.getUrl(type);

            const urls = Array.isArray(url) ? url : [url];
            // Lets check if the webhook is enabled
            if (this.isEnabled(type)) {
                // Lets send the webhook
                for (const url of urls) {
                    void axios({
                        method: 'POST',
                        url,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Secret': this.webhookSecret ?? ''
                        },
                        data: JSON.stringify(data)
                    })
                        .then(() => {
                            resolve();
                        })
                        .catch((err: AxiosError) => {
                            reject({ err: filterAxiosError(err) });
                        });
                }
            } else {
                // Webhook is disabled
                resolve();
            }
        });
    }
}

// Assign tradeSummery to WebhookHandler
Object.assign(WebhookHandler.prototype, tradeSummery);

export default WebhookHandler;
