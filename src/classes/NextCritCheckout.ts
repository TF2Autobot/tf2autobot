import type { Readable } from 'node:stream';
import SteamID from 'steamid';
import * as v from 'valibot';
import type Bot from './Bot';
import type NextCritDriver from './NextCritDriver';
import NextCritCheckoutCart from './Carts/NextCritCheckoutCart';
import NextCritBuyCheckoutCart from './Carts/NextCritBuyCheckoutCart';
import NextCritEvents from '../lib/nextCritEvents';
import log from '../lib/logger';

const jsonArraySchema = v.pipe(v.string(), v.parseJson(), v.array(v.unknown()));

const envelopeSchema = v.object({
    steam64s: v.nullable(v.array(v.string())),
    message: v.string()
});

const messageTypeSchema = v.object({
    type: v.string(),
    listing_type: v.optional(v.string())
});

const sellCheckoutSchema = v.pipe(
    v.object({
        type: v.literal('trade_request'),
        listing_type: v.literal('sell'),
        requester_steam64: v.pipe(v.string(), v.regex(/^7656119\d{10}$/)),
        trade_offer_url: v.string(),
        asset_ids: v.pipe(v.array(v.pipe(v.string(), v.regex(/^[1-9]\d*$/))), v.nonEmpty()),
        quantity: v.number()
    }),
    v.check(request => request.quantity === request.asset_ids.length, 'Checkout quantity must match the assets'),
    v.check(request => new Set(request.asset_ids).size === request.asset_ids.length, 'Checkout assets must be unique')
);

const buyCheckoutSchema = v.object({
    type: v.literal('trade_request'),
    listing_type: v.literal('buy'),
    listing_id: v.pipe(v.number(), v.integer(), v.minValue(1)),
    quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
    requester_steam64: v.pipe(v.string(), v.regex(/^7656119\d{10}$/)),
    trade_offer_url: v.string()
});

const checkoutSchema = v.variant('listing_type', [sellCheckoutSchema, buyCheckoutSchema]);

export default class NextCritCheckout {
    private connection: AbortController | undefined;

    private stream: Readable | undefined;

    private reconnectTimer: NodeJS.Timeout | undefined;

    private running = false;

    constructor(private readonly bot: Bot, private readonly driver: NextCritDriver) {}

    start(): void {
        if (this.running || !this.available) return;
        this.running = true;
        void this.connect();
    }

    stop(): void {
        this.running = false;
        clearTimeout(this.reconnectTimer);
        this.connection?.abort();
        this.stream?.destroy();
        this.connection = undefined;
        this.stream = undefined;
    }

    private get available(): boolean {
        return this.bot.isReady && !this.bot.isHalted && !this.bot.botManager.isStopping;
    }

    private async connect(): Promise<void> {
        if (!this.running || !this.available) return;
        const connection = new AbortController();
        this.connection = connection;
        let finished = false;
        const reconnect = (): void => {
            if (finished) return;
            finished = true;
            connection.abort();
            if (this.connection !== connection) return;
            if (!this.running) return;
            this.stream?.destroy();
            this.stream = undefined;
            this.reconnectTimer = setTimeout(() => void this.connect(), 3000);
        };
        try {
            const stream = await this.driver.openEventStream(connection.signal);
            if (this.connection !== connection || !this.running) {
                stream.destroy();
                return;
            }
            this.stream = stream;
            const parser = new NextCritEvents(data => this.handleMessages(data));
            stream.setEncoding('utf8');
            stream.on('data', (chunk: string) => {
                if (finished || this.connection !== connection || !this.running) return;
                try {
                    parser.push(chunk);
                } catch {
                    log.warn('NextCrit checkout received an invalid event stream');
                    reconnect();
                }
            });
            stream.on('error', () => reconnect());
            stream.on('end', reconnect);
            stream.on('close', reconnect);
        } catch {
            // Stream errors can contain authenticated URLs. Do not log the original error.
            if (this.connection === connection && this.running) {
                log.warn('NextCrit checkout event stream disconnected; reconnecting');
            }
            reconnect();
        }
    }

    private handleMessages(data: string): void {
        if (!this.running || !this.available) return;
        try {
            const envelopes = v.parse(jsonArraySchema, data);
            const steam64 = this.bot.client.steamID.getSteamID64();
            for (const envelope of envelopes) {
                const result = v.safeParse(envelopeSchema, envelope);
                if (!result.success) continue;
                const { steam64s, message } = result.output;
                if (!steam64s?.includes(steam64)) continue;
                const requests = v.parse(jsonArraySchema, message);
                for (const request of requests) {
                    try {
                        this.enqueue(request);
                    } catch {
                        log.warn('NextCrit checkout rejected an invalid or unavailable trade request');
                    }
                }
            }
        } catch {
            log.warn('NextCrit checkout received an invalid message');
        }
    }

    private enqueue(value: unknown): void {
        const message = v.safeParse(messageTypeSchema, value);
        if (
            !message.success ||
            message.output.type !== 'trade_request' ||
            (message.output.listing_type !== 'sell' && message.output.listing_type !== 'buy')
        )
            return;
        const request = v.parse(checkoutSchema, value);
        const { requester_steam64: requester, trade_offer_url: tradeUrl } = request;
        const partner = new SteamID(requester);
        const url = new URL(tradeUrl);
        const token = url.searchParams.get('token');
        if (
            !partner.isValid() ||
            requester === this.bot.client.steamID.getSteamID64() ||
            url.protocol !== 'https:' ||
            url.hostname !== 'steamcommunity.com' ||
            url.port !== '' ||
            url.username !== '' ||
            url.password !== '' ||
            url.pathname !== '/tradeoffer/new/' ||
            url.searchParams.getAll('partner').length !== 1 ||
            url.searchParams.get('partner') !== String(partner.accountid) ||
            url.searchParams.getAll('token').length !== 1 ||
            !token
        )
            throw new Error('NextCrit checkout trade URL does not match the requester');
        if (this.bot.handler.cartQueue.getPosition(partner) !== -1 || this.bot.trades.getActiveOffer(partner)) return;
        const cart =
            request.listing_type === 'sell'
                ? new NextCritCheckoutCart(partner, token, this.bot, this.driver, request.asset_ids)
                : new NextCritBuyCheckoutCart(
                      partner,
                      token,
                      this.bot,
                      this.driver,
                      request.listing_id,
                      request.quantity
                  );
        // Progress has its own ordered queue so listing syncs and API outages cannot delay the trade.
        let updates = Promise.resolve();
        let complete = false;
        cart.onProgress = (stage, message, done, tradeOfferId) => {
            if (complete) return;
            complete = done;
            const progress = {
                steam64: requester,
                stage,
                message: [...message.replace(/\s+/g, ' ').trim()].slice(0, 140).join(''),
                complete: done,
                trade_offer_id: stage === 3 && done ? tradeOfferId ?? null : null
            };
            updates = updates
                .then(() => this.driver.postTradeProgress(progress))
                .catch(() => {
                    // Do not expose authenticated request headers or URLs in the logger.
                    log.warn('NextCrit checkout could not report trade progress');
                });
        };
        cart.onProgress(1, 'Checkout acknowledged; waiting in the trade queue', false);
        if (this.bot.handler.cartQueue.enqueue(cart, false, false) === -1) {
            cart.onProgress(1, 'Unable to queue checkout: you already have a trade in the queue.', true);
        }
    }
}
