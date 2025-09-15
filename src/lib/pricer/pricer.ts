import IPricer, { PricerOptions } from '../../classes/IPricer';
import PricesTfPricer from './pricestf/prices-tf-pricer';
import CustomPricer from './custom/custom-pricer';
import PricesTfApi from './pricestf/prices-tf-api';
import CustomPricerApi from './custom/custom-pricer-api';
import PriceDbApi from './pricedb/pricedb-api';
import PriceDbPricer from './pricedb/price-db-pricer';

export function getPricer(options: PricerOptions): IPricer {
    // Default to pricedb.io if no pricerUrl is set or it's empty
    if (!options.pricerUrl || options.pricerUrl === '' || options.pricerUrl.startsWith('https://pricedb.io')) {
        const api = new PriceDbApi(options.pricerUrl || 'https://pricedb.io/api');
        return new PriceDbPricer(api);
    } else if (
        options.pricerUrl === 'https://api.prices.tf' ||
        options.pricerUrl === 'https://api2.prices.tf'
    ) {
        const api = new PricesTfApi();
        return new PricesTfPricer(api);
    } else {
        const api = new CustomPricerApi(options.pricerUrl, options.pricerApiToken);
        return new CustomPricer(api);
    }
}
