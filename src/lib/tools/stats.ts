import dayjs from 'dayjs';
import Bot from '../../classes/Bot';

export default function stats(bot: Bot): Stats {
    const now = dayjs();
    const aDayAgo = dayjs().subtract(24, 'hour');
    const startOfDay = dayjs().startOf('day');

    let acceptedTradesTotal = 0;
    let acceptedOfferTrades24Hours = 0;
    let acceptedOfferTradesToday = 0;

    let acceptedCountered24Hours = 0;
    let acceptedCounteredToday = 0;

    let acceptedSentTrades24Hours = 0;
    let acceptedSentTradesToday = 0;

    let skipped24Hours = 0;
    let skippedToday = 0;

    let declineOffer24Hours = 0;
    let declineOfferToday = 0;

    let declinedCounter24Hours = 0;
    let declinedCounterToday = 0;

    let declineSent24Hours = 0;
    let declineSentToday = 0;

    let canceledByUser24Hours = 0;
    let canceledByUserToday = 0;

    let isFailedConfirmation24Hours = 0;
    let isFailedConfirmationToday = 0;

    let isCanceledUnknown24Hours = 0;
    let isCanceledUnknownToday = 0;

    let isInvalid24Hours = 0;
    let isInvalidToday = 0;

    const pollData = bot.manager.pollData;
    const oldestId = pollData.offerData === undefined ? undefined : Object.keys(pollData.offerData)[0];
    const timeSince =
        +bot.options.statistics.startingTimeInUnix === 0
            ? pollData.timestamps[oldestId]
            : +bot.options.statistics.startingTimeInUnix;
    const totalDays = !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day');

    const offerData = bot.manager.pollData.offerData;
    for (const offerID in offerData) {
        if (!Object.prototype.hasOwnProperty.call(offerData, offerID)) {
            continue;
        }

        if (offerData[offerID].handledByUs === true && offerData[offerID].action !== undefined) {
            // action not undefined means offer received

            if (offerData[offerID].isAccepted === true) {
                if (offerData[offerID].action.action === 'accept') {
                    // Successful trades handled by the bot
                    acceptedTradesTotal++;

                    if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                        // Within the last 24 hours
                        acceptedOfferTrades24Hours++;
                    }

                    if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                        // All trades since 0:00 in the morning.
                        acceptedOfferTradesToday++;
                    }
                }

                if (offerData[offerID].action.action === 'counter') {
                    acceptedTradesTotal++;

                    if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                        // Within the last 24 hours
                        acceptedOfferTrades24Hours++;
                        acceptedCountered24Hours++;
                    }

                    if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                        // All trades since 0:00 in the morning.
                        acceptedOfferTradesToday++;
                        acceptedCounteredToday++;
                    }
                }
            }

            if (offerData[offerID].action.action === 'decline') {
                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    declineOffer24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    declineOfferToday++;
                }
            }

            if (offerData[offerID].action.action === 'counter') {
                if (offerData[offerID].isDeclined === true) {
                    if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                        // Within the last 24 hours
                        declineOffer24Hours++;
                        declinedCounter24Hours++;
                    }

                    if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                        // All trades since 0:00 in the morning.
                        declineOfferToday++;
                        declinedCounterToday++;
                    }
                }
            }

            if (offerData[offerID].action.action === 'skip') {
                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    skipped24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    skippedToday++;
                }
            }
        }

        if (offerData[offerID].handledByUs === true && offerData[offerID].action === undefined) {
            // action undefined means offer sent
            if (offerData[offerID].isAccepted === true) {
                // Successful trades handled by the bot
                acceptedTradesTotal++;

                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    acceptedSentTrades24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    acceptedSentTradesToday++;
                }
            }

            if (offerData[offerID].isDeclined === true) {
                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    declineSent24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    declineSentToday++;
                }
            }
        }

        if (offerData[offerID].handledByUs === true && offerData[offerID].canceledByUser === true) {
            if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                // Within the last 24 hours
                canceledByUser24Hours++;
            }

            if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                // All trades since 0:00 in the morning.
                canceledByUserToday++;
            }
        }

        if (offerData[offerID].handledByUs === true && offerData[offerID].isFailedConfirmation === true) {
            if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                // Within the last 24 hours
                isFailedConfirmation24Hours++;
            }

            if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                // All trades since 0:00 in the morning.
                isFailedConfirmationToday++;
            }
        }

        if (offerData[offerID].handledByUs === true && offerData[offerID].isCanceledUnknown === true) {
            if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                // Within the last 24 hours
                isCanceledUnknown24Hours++;
            }

            if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                // All trades since 0:00 in the morning.
                isCanceledUnknownToday++;
            }
        }

        if (offerData[offerID].handledByUs === true && offerData[offerID].isInvalid === true) {
            if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                // Within the last 24 hours
                isInvalid24Hours++;
            }

            if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                // All trades since 0:00 in the morning.
                isInvalidToday++;
            }
        }
    }

    const totalProcessedToday =
        acceptedSentTradesToday +
        acceptedOfferTradesToday +
        skippedToday +
        declineOfferToday +
        canceledByUserToday +
        isFailedConfirmationToday +
        isCanceledUnknownToday +
        isInvalidToday +
        acceptedCounteredToday +
        declinedCounterToday;

    const totalProcessed24Hours =
        acceptedSentTrades24Hours +
        acceptedOfferTrades24Hours +
        skipped24Hours +
        declineOffer24Hours +
        canceledByUser24Hours +
        isFailedConfirmation24Hours +
        isCanceledUnknown24Hours +
        isInvalid24Hours +
        acceptedCountered24Hours +
        declinedCounter24Hours;

    return {
        totalDays: totalDays,
        totalAcceptedTrades: acceptedTradesTotal,
        today: {
            processed: totalProcessedToday,
            accepted: {
                offer: {
                    total: acceptedOfferTradesToday,
                    countered: acceptedCounteredToday
                },
                sent: acceptedSentTradesToday
            },
            decline: {
                offer: {
                    total: declineOfferToday,
                    countered: declinedCounterToday
                },
                sent: declineSentToday
            },
            skipped: skippedToday,
            canceled: {
                total: canceledByUserToday + isFailedConfirmationToday + isCanceledUnknownToday,
                byUser: canceledByUserToday,
                failedConfirmation: isFailedConfirmationToday,
                unknown: isCanceledUnknownToday
            },
            invalid: isInvalidToday
        },
        hours24: {
            processed: totalProcessed24Hours,
            accepted: {
                offer: {
                    total: acceptedOfferTrades24Hours,
                    countered: acceptedCountered24Hours
                },
                sent: acceptedSentTrades24Hours
            },
            decline: {
                offer: {
                    total: declineOffer24Hours,
                    countered: declinedCounter24Hours
                },
                sent: declineSent24Hours
            },
            skipped: skipped24Hours,
            canceled: {
                total: canceledByUser24Hours + isFailedConfirmation24Hours + isCanceledUnknown24Hours,
                byUser: canceledByUser24Hours,
                failedConfirmation: isFailedConfirmation24Hours,
                unknown: isCanceledUnknown24Hours
            },
            invalid: isInvalid24Hours
        }
    };
}

interface Stats {
    totalDays: number;
    totalAcceptedTrades: number;
    today: TodayOr24Hours;
    hours24: TodayOr24Hours;
}

interface Canceled {
    total: number;
    byUser: number;
    failedConfirmation: number;
    unknown: number;
}

interface TodayOr24Hours {
    processed: number;
    accepted: AcceptedOrDeclinedWithCounter;
    decline: AcceptedOrDeclinedWithCounter;
    skipped: number;
    canceled: Canceled;
    invalid: number;
}

interface AcceptedOrDeclinedWithCounter {
    offer: {
        total: number;
        countered: number;
    };
    sent: number;
}
