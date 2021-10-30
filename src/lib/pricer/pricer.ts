import IPricer, { PricerOptions } from '../../classes/IPricer';
import PricesTfApi2Pricer from './prices-tf-api2-pricer';
import PricesTfApi from './apis/prices-tf-api';
import PricesTfApiPricer from './prices-tf-api-pricer';
import PricesTfApi2 from './apis/pricer-tf-api2';

export function getPricer(options: PricerOptions): IPricer {
    if ('api.prices.tf' === options.pricerUrl || '' !== options.pricerUrl) {
        const api = new PricesTfApi(options.pricerUrl, options.pricerApiToken);
        return new PricesTfApiPricer(api);
    } else {
        const api = new PricesTfApi2();
        return new PricesTfApi2Pricer(api);
    }
}
