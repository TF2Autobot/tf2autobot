import IPricer, { PricerOptions } from '../../classes/IPricer';
import CustomPricer from './custom/custom-pricer';
import CustomPricerApi from './custom/custom-pricer-api';
import PriceDbApi from './pricedb/pricedb-api';
import PriceDbPricer from './pricedb/price-db-pricer';

export function getPricer(options: PricerOptions): IPricer {
    // Default to pricedb.io if no pricerUrl is set or it's empty
    if (!options.pricerUrl || options.pricerUrl === '' || options.pricerUrl.startsWith('https://pricedb.io')) {
        const api = new PriceDbApi(options.pricerUrl || 'https://pricedb.io/api');
        return new PriceDbPricer(api);
    } else {
        const api = new CustomPricerApi(options.pricerUrl, options.pricerApiToken);
        return new CustomPricer(api);
    }
}
