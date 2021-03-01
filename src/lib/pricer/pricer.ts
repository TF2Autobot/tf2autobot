import Pricer, { PricerOptions } from '../../classes/Pricer';
import PricerApi from '../pricer-api';

export function getPricer(options: PricerOptions): Pricer {
    return new PricerApi(options.pricerUrl, options.pricerApiToken);
}
