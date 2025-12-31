/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import bodyParser from 'body-parser';
import express from 'express';
import log from '../lib/logger';
import Options from './Options';
import Bot from './Bot';
import ApiCart from './Carts/ApiCart';

export default class HttpManager {
    /**
     * The Express.js app.
     */
    protected app: express.Application;

    /**
     * Initialize the HTTP manager.
     *
     * @param options - The options list.
     * @param bot - The bot instance for trade operations
     */
    constructor(
        protected options: Options,
        private readonly bot?: Bot
    ) {
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: false }));

        this.registerRoutes();
    }

    /**
     * Middleware to validate API key authentication.
     */
    protected validateApiKey(req: express.Request, res: express.Response, next: express.NextFunction): void {
        const apiKey = this.options.apiKey;

        // If no API key is configured, reject all API requests
        if (!apiKey) {
            res.status(503).json({
                success: false,
                error: 'API is not enabled. Please configure an API key in options.'
            });
            return;
        }

        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Missing or invalid Authorization header. Expected format: "Bearer YOUR_API_KEY"'
            });
            return;
        }

        const providedKey = authHeader.substring(7); // Remove "Bearer " prefix

        if (providedKey !== apiKey) {
            res.status(403).json({
                success: false,
                error: 'Invalid API key'
            });
            return;
        }

        next();
    }

    /**
     * Register the routes.
     */
    protected registerRoutes(): void {
        this.app.get('/health', (req, res) => res.send('OK'));
        this.app.get('/uptime', (req, res) => res.json({ uptime: process.uptime() }));

        // Trade status endpoint - get status of a specific trade offer
        this.app.get('/api/trade/status/:offerId', this.validateApiKey.bind(this), async (req, res) => {
            try {
                const offerId = req.params.offerId;

                if (!offerId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing offerId parameter'
                    });
                    return;
                }

                // Get the offer from the bot's manager
                const offer = await this.bot.trades.getOffer(offerId).catch(() => null);

                if (!offer) {
                    res.status(404).json({
                        success: false,
                        error: 'Offer not found'
                    });
                    return;
                }

                // Get the state as a readable string
                const stateNames = {
                    1: 'Invalid',
                    2: 'Active',
                    3: 'Accepted',
                    4: 'Countered',
                    5: 'Expired',
                    6: 'Canceled',
                    7: 'Declined',
                    8: 'InvalidItems',
                    9: 'CreatedNeedsConfirmation',
                    10: 'CanceledBySecondFactor',
                    11: 'InEscrow'
                };

                const state = offer.state;
                const stateName = stateNames[state] || 'Unknown';

                // Determine if it's an API trade
                const isApiTrade = offer.data('isApiTrade') === true;

                // Get cancellation reason if available
                let cancelReason = null;
                if (state === 6) {
                    // Canceled
                    // Check various data fields for cancel reasons
                    if (offer.data('canceledByUser')) {
                        cancelReason = 'Canceled by user';
                    } else if (offer.data('isFailedConfirmation')) {
                        cancelReason = 'Failed mobile confirmation';
                    } else if (offer.data('isCanceledUnknown')) {
                        cancelReason = 'Canceled for unknown reason';
                    } else {
                        // Could be auto-canceled due to timeout or invalid items
                        cancelReason = 'Auto-canceled (likely items became unavailable)';
                    }
                }

                res.json({
                    success: true,
                    offerId: offer.id,
                    state: state,
                    stateName: stateName,
                    isActive: state === 2 || state === 9, // Active or CreatedNeedsConfirmation
                    isAccepted: state === 3,
                    isCanceled: state === 6,
                    isDeclined: state === 7,
                    cancelReason: cancelReason,
                    isApiTrade: isApiTrade,
                    partner: offer.partner.getSteamID64(),
                    itemsToGive: offer.itemsToGive.length,
                    itemsToReceive: offer.itemsToReceive.length,
                    created: offer.created,
                    updated: offer.updated
                });
            } catch (error) {
                log.error('Error in /api/trade/status endpoint:', error);
                const errorMsg = error instanceof Error ? error.message : 'Internal server error';
                res.status(500).json({
                    success: false,
                    error: errorMsg
                });
            }
        });

        // API trading endpoint
        this.app.post('/api/trade/send', this.validateApiKey.bind(this), async (req, res) => {
            try {
                // Validate that bot is available
                if (!this.bot) {
                    res.status(503).json({
                        success: false,
                        error: 'Bot is not initialized'
                    });
                    return;
                }

                // Validate request body
                const { tradeUrl, give, receive, message } = req.body;

                if (!tradeUrl || typeof tradeUrl !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'Missing or invalid tradeUrl parameter'
                    });
                    return;
                }

                // Validate trade URL format
                if (!tradeUrl.includes('steamcommunity.com/tradeoffer')) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid trade URL: must be a Steam trade offer URL'
                    });
                    return;
                }

                // Validate give/receive objects
                if (!give && !receive) {
                    res.status(400).json({
                        success: false,
                        error: 'Must specify at least one of "give" or "receive"'
                    });
                    return;
                }

                // Create API cart with the trade URL directly
                const cart = new ApiCart(tradeUrl, this.bot);

                // Set custom message if provided
                if (message && typeof message === 'string') {
                    cart.setCustomMessage(message);
                }

                // Construct the offer with the specified items
                const alteredMessage = await cart.constructOffer(give || {}, receive || {});

                if (alteredMessage) {
                    // There was an issue constructing the offer
                    res.status(400).json({
                        success: false,
                        error: alteredMessage
                    });
                    return;
                }

                // Send the offer
                const status = await cart.sendOffer();

                // Get the offer ID from the cart's offer object
                const sentOffer = cart.getOffer;
                if (!sentOffer) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to send trade offer'
                    });
                    return;
                }

                // If the offer needs confirmation, accept it
                if (status === 'pending') {
                    log.debug(`Offer #${sentOffer.id} needs confirmation, accepting...`);
                    await this.bot.trades.acceptConfirmation(sentOffer).catch(err => {
                        log.warn(`Failed to accept mobile confirmation for offer #${sentOffer.id}:`, err);
                        // Don't reject - the offer was sent, just not confirmed yet
                    });
                }

                // Success!
                res.json({
                    success: true,
                    offerId: sentOffer.id,
                    tradeUrl: tradeUrl,
                    message: 'Trade offer sent successfully'
                });
            } catch (error) {
                log.error('Error in /api/trade/send endpoint:', error);
                const errorMsg = error instanceof Error ? error.message : 'Internal server error';
                res.status(500).json({
                    success: false,
                    error: errorMsg
                });
            }
        });
    }

    /**
     * Start the server.
     */
    start(): Promise<void> {
        return new Promise(resolve => {
            this.app.listen(this.options.httpApiPort, () => {
                log.debug(`HTTP Server started: http://127.0.0.1:${this.options.httpApiPort}`);
                log.info(`This is NOT a HTTP API used to handle data within the bot.
                It is solely for managing the bot programatically by providing healthchecks & uptime details.`);
                log.info(`Please use the TF2Bot GUI v3+ as the main API source.`);
                log.info(`https://github.com/TF2Autobot/tf2autobot-gui`);
                resolve();
            });
        });
    }
}
