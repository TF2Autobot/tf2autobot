import Pricer, { PricerOptions } from '../../classes/Pricer';
import PricesTf from '../ptf-api';

export function getPricer(options: PricerOptions): Pricer {
    return new PricesTf(options.pricerUrl, options.pricerApiToken);
}
