/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { OptionsWithUrl, ResponseAsJSON } from 'request';
import Currencies from 'tf2-currencies-2';

import request from 'request-retry-dayjs';
import Pricer, {
    GetItemPriceResponse,
    GetPricelistResponse,
    PricerOptions,
    RequestCheckResponse
} from '../classes/Pricer';
import SchemaManager, { Schema } from 'tf2-schema-2';
import SKU from 'tf2-sku-2';
import logger from './logger';

export default class PricerApi implements Pricer {
    private readonly schemaManager: SchemaManager;

    private token = '';

    public constructor(schemaManager: SchemaManager) {
        this.schemaManager = schemaManager;
    }

    private apiRequest<I>(httpMethod: string, path: string, input: I): Promise<any> {
        const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
            method: httpMethod,
            url: `https://api2.prices.tf${path}`,
            headers: {
                // This one is okay to keep I guess
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                Authorization: 'Bearer ' + this.token
            },
            json: true,
            timeout: 30000
        };

        options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

        return new Promise((resolve, reject) => {
            void request(options, (err, response: ResponseAsJSON, body) => {
                if (err) {
                    if (err.statusCode === 401) {
                        this.generateNewAccessCode()
                            .then(() => {
                                this.apiRequest(httpMethod, path, input)
                                    .then(body => {
                                        resolve(body);
                                    })
                                    .catch(err => {
                                        reject(err);
                                    });
                            })
                            .catch(err => {
                                reject(err);
                            });
                        return;
                    }

                    reject(err);
                    return;
                }

                resolve(body);
            });
        });
    }

    generateNewAccessCode(): Promise<void> {
        return this.apiRequest('POST', '/auth/access', {}).then(data => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.token = data.accessToken;
        });
    }

    requestCheck(sku: string): Promise<RequestCheckResponse> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.apiRequest('POST', `/prices/${sku}/refresh`, {});
    }

    getPrice(sku: string): Promise<GetItemPriceResponse> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.apiRequest('GET', `/prices/${sku}`, {}).then(v => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return {
                success: true,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                sku: v.sku,
                name: this.schemaManager.schema.getName(SKU.fromString(v.sku)),
                buy: {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    keys: v.buyKeys,
                    metal: Currencies.toRefined(v.buyHalfScrap / 2)
                },
                sell: {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    keys: v.sellKeys,
                    metal: Currencies.toRefined(v.sellHalfScrap / 2)
                },
                source: 'bptf',
                time: Math.floor(new Date(v.updatedAt).getTime() / 1000)
            } as any;
        });
    }

    async getPricelist(): Promise<GetPricelistResponse> {
        let prices: {
            sku: string;
            buyHalfScrap: number;
            buyKeys: number;
            buyKeyHalfScrap: number | null;
            sellHalfScrap: number;
            sellKeys: number;
            sellKeyHalfScrap: number | null;
            createdAt: string;
            updatedAt: string;
        }[] = [];
        let currentPage = 1;
        let totalPages = 0;

        let delay = 0;
        const minDelay = 200;

        do {
            await Promise.delay(delay);
            const start = new Date().getTime();
            logger.debug('Getting page ' + currentPage.toString() + ' of ' + totalPages.toString());
            const response = await this.getPricelistPage(currentPage);
            currentPage++;
            totalPages = response.meta.totalPages;
            prices = prices.concat(response.items);
            const time = new Date().getTime() - start;

            delay = Math.max(0, minDelay - time);
        } while (currentPage < totalPages);

        const parsed: any[] = prices.map(v => {
            return {
                sku: v.sku,
                name: this.schemaManager.schema.getName(SKU.fromString(v.sku)),
                buy: {
                    keys: v.buyKeys,
                    metal: Currencies.toRefined(v.buyHalfScrap / 2)
                },
                sell: {
                    keys: v.sellKeys,
                    metal: Currencies.toRefined(v.sellHalfScrap / 2)
                },
                source: 'bptf',
                time: Math.floor(new Date(v.updatedAt).getTime() / 1000)
            };
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { success: true, items: parsed };
    }

    getPricelistPage(page: number): Promise<{
        items: {
            sku: string;
            buyHalfScrap: number;
            buyKeys: number;
            buyKeyHalfScrap: number | null;
            sellHalfScrap: number;
            sellKeys: number;
            sellKeyHalfScrap: number | null;
            createdAt: string;
            updatedAt: string;
        }[];
        meta: {
            totalItems: number;
            itemCount: number;
            itemsPerPage: number;
            totalPages: number;
            currentPage: number;
        };
    }> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.apiRequest('GET', '/prices', { page, limit: 100 });
    }

    getOptions(): PricerOptions {
        return {
            pricerUrl: 'https://api2.prices.tf',
            pricerApiToken: ''
        };
    }
}
