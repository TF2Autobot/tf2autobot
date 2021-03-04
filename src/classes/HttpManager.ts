/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

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
     * The Express.js server app.
     */
    public server;

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
            if (this.options.enableHttpApi) {
                this.server = this.app.listen(this.options.httpApiPort, () => {
                    resolve();
                    log.debug(`HTTP Server started: http://127.0.0.1:${this.options.httpApiPort}`);
                });
            } else {
                log.debug('HTTP Server is not enabled. Skipping initialization...');
                resolve();
            }
        });
    }
}
