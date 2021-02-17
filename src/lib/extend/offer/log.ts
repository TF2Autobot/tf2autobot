import { TradeOffer } from '@tf2autobot/tradeoffer-manager';

import log from '../../logger';

export = function (level: string, message: string): void {
    const self = this as TradeOffer;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    log[level](
        'Offer' +
            (self.id ? ' #' + self.id : '') +
            (self.isOurOffer ? ' with ' : ' from ') +
            self.partner.getSteamID64() +
            ' ' +
            message
    );
};
