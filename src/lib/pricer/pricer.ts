import IPricer, { PricerOptions } from '../../types/IPricer';
import PricesTfPricer from './pricestf/prices-tf-pricer.js';
import CustomPricer from './custom/custom-pricer.js';
import PricesTfApi from './pricestf/prices-tf-api.js';
import CustomPricerApi from './custom/custom-pricer-api.js';

export function getPricer(options: PricerOptions): IPricer {
    if (options.pricerUrl === 'https://api.prices.tf' || options.pricerUrl !== '') {
        const api = new CustomPricerApi(options.pricerUrl, options.pricerApiToken);
        return new CustomPricer(api);
    } else {
        const api = new PricesTfApi();
        return new PricesTfPricer(api);
    }
}
