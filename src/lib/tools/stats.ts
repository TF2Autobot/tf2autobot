import dayjs from 'dayjs';
import Bot from '../../classes/Bot';

export default function stats(bot: Bot): Promise<Stats> {
    return new Promise(resolve => {
        const now = dayjs();
        const aDayAgo = dayjs().subtract(24, 'hour');
        const startOfDay = dayjs().startOf('day');

        let acceptedTradesTotal = 0;
        let acceptedTrades24Hours = 0;
        let acceptedTradesToday = 0;

        let skipped24Hours = 0;
        let skippedToday = 0;

        let decline24Hours = 0;
        let declineToday = 0;

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

            if (offerData[offerID].handledByUs === true && offerData[offerID].isAccepted === true) {
                // Sucessful trades handled by the bot
                acceptedTradesTotal++;

                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    acceptedTrades24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    acceptedTradesToday++;
                }
            }

            if (offerData[offerID].handledByUs === true && offerData[offerID].action !== undefined) {
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

                if (offerData[offerID].action.action === 'decline') {
                    if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                        // Within the last 24 hours
                        decline24Hours++;
                    }

                    if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                        // All trades since 0:00 in the morning.
                        declineToday++;
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
            acceptedTradesToday +
            skippedToday +
            declineToday +
            canceledByUserToday +
            isFailedConfirmationToday +
            isCanceledUnknownToday +
            isInvalidToday;

        const totalProcessed24Hours =
            acceptedTrades24Hours +
            skipped24Hours +
            decline24Hours +
            canceledByUser24Hours +
            isFailedConfirmation24Hours +
            isCanceledUnknown24Hours +
            isInvalid24Hours;

        const polldata: Stats = {
            totalDays: totalDays,
            totalAcceptedTrades: acceptedTradesTotal,
            today: {
                processed: totalProcessedToday,
                accepted: acceptedTradesToday,
                skipped: skippedToday,
                decline: declineToday,
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
                accepted: acceptedTrades24Hours,
                skipped: skipped24Hours,
                decline: decline24Hours,
                canceled: {
                    total: canceledByUser24Hours + isFailedConfirmation24Hours + isCanceledUnknown24Hours,
                    byUser: canceledByUser24Hours,
                    failedConfirmation: isFailedConfirmation24Hours,
                    unknown: isCanceledUnknown24Hours
                },
                invalid: isInvalid24Hours
            }
        };

        resolve(polldata);
    });
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
    accepted: number;
    skipped: number;
    decline: number;
    canceled: Canceled;
    invalid: number;
}
