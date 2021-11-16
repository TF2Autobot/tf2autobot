import IPricer, { PricerOptions } from '../../classes/IPricer';
import PricesTfPricer from './pricestf/prices-tf-pricer';
import CustomPricer from './custom/custom-pricer';
import PricesTfApi from './pricestf/prices-tf-api';
import CustomPricerApi from './custom/custom-pricer-api';

export function getPricer(options: PricerOptions): IPricer {
    if (options.pricerUrl === 'https://api.prices.tf' || options.pricerUrl !== '') {
        const api = new CustomPricerApi(options.pricerUrl, options.pricerApiToken);
        return new CustomPricer(api);
    } else {
        const api = new PricesTfApi();
        return new PricesTfPricer(api);
    }
}
