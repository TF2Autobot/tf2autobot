import moment from 'moment-timezone';
import Bot from '../../classes/Bot';

export default function stats(
    bot: Bot
): { totalDays: number; tradesTotal: number; trades24Hours: number; tradesToday: number } {
    const now = moment();
    const aDayAgo = moment().subtract(24, 'hour');
    const startOfDay = moment().startOf('day');

    let tradesToday = 0;
    let trades24Hours = 0;
    let tradesTotal = 0;

    const pollData = bot.manager.pollData;
    const oldestId = pollData.offerData === undefined ? undefined : Object.keys(pollData.offerData)[0];
    const timeSince =
        +bot.options.statistics.startingTimeInUnix === 0
            ? pollData.timestamps[oldestId]
            : +bot.options.statistics.startingTimeInUnix;
    const totalDays = !timeSince ? 0 : now.diff(moment.unix(timeSince), 'days');

    const offerData = bot.manager.pollData.offerData;
    for (const offerID in offerData) {
        if (!Object.prototype.hasOwnProperty.call(offerData, offerID)) {
            continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (offerData[offerID].handledByUs === true && offerData[offerID].isAccepted === true) {
            // Sucessful trades handled by the bot
            tradesTotal++;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                // Within the last 24 hours
                trades24Hours++;
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                // All trades since 0:00 in the morning.
                tradesToday++;
            }
        }
    }

    const polldata = {
        totalDays: totalDays,
        tradesTotal: tradesTotal,
        trades24Hours: trades24Hours,
        tradesToday: tradesToday
    };
    return polldata;
}
