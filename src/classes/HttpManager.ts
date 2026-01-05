import bodyParser from 'body-parser';
import express from 'express';
import log from '../lib/logger';
import Options from './Options';

export default class HttpManager {
    /**
     * The Express.js app.
     */
    protected app: express.Application;

    /**
     * Initialize the HTTP manager.
     *
     * @param options - The options list.
     */
    constructor(protected options: Options) {
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: false }));

        this.registerRoutes();
    }

    /**
     * Register the routes.
     */
    protected registerRoutes(): void {
        this.app.get('/health', (req, res) => res.send('OK'));
        this.app.get('/uptime', (req, res) => res.json({ uptime: process.uptime() }));
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
