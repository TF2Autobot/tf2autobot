import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timeZone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timeZone);

export function timeNow(
    timezone: string,
    customTimeFormat: string,
    timeAdditionalNotes: string
): { timeUnix: number; time: string; emoji: string; note: string } {
    const timeUnix = dayjs().unix();

    const time = dayjs()
        .tz(timezone ? timezone : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
        .format(customTimeFormat ? customTimeFormat : 'MMMM DD YYYY, HH:mm:ss ZZ'); // refer: https://www.tutorialspoint.com/momentjs/momentjs_format.htm

    const timeEmoji = dayjs()
        .tz(timezone ? timezone : 'UTC')
        .format();
    const emoji =
        timeEmoji.includes('T00:') || timeEmoji.includes('T12:')
            ? '🕛'
            : timeEmoji.includes('T01:') || timeEmoji.includes('T13:')
            ? '🕐'
            : timeEmoji.includes('T02:') || timeEmoji.includes('T14:')
            ? '🕑'
            : timeEmoji.includes('T03:') || timeEmoji.includes('T15:')
            ? '🕒'
            : timeEmoji.includes('T04:') || timeEmoji.includes('T16:')
            ? '🕓'
            : timeEmoji.includes('T05:') || timeEmoji.includes('T17:')
            ? '🕔'
            : timeEmoji.includes('T06:') || timeEmoji.includes('T18:')
            ? '🕕'
            : timeEmoji.includes('T07:') || timeEmoji.includes('T19:')
            ? '🕖'
            : timeEmoji.includes('T08:') || timeEmoji.includes('T20:')
            ? '🕗'
            : timeEmoji.includes('T09:') || timeEmoji.includes('T21:')
            ? '🕘'
            : timeEmoji.includes('T10:') || timeEmoji.includes('T22:')
            ? '🕙'
            : timeEmoji.includes('T11:') || timeEmoji.includes('T23:')
            ? '🕚'
            : '';

    const timeNote = timeAdditionalNotes ? timeAdditionalNotes : '';

    const timeWithEmoji = {
        timeUnix: timeUnix,
        time: time,
        emoji: emoji,
        note: timeNote
    };
    return timeWithEmoji;
}

export function convertTime(time: number): string {
    const now = dayjs();
    const timeTaken = dayjs.unix(now.unix() - Math.round(time / 1000));
    return `${timeTaken.fromNow(true)}`;
}

export function uptime(): string {
    const currentTime = dayjs();
    const uptimeAsMoment = dayjs.unix(currentTime.unix() - process.uptime());
    const hoursDiff = currentTime.diff(uptimeAsMoment, 'hour');
    const daysDiff = currentTime.diff(uptimeAsMoment, 'day');

    // If the bot has been up for ~1 day, show the exact amount of hours
    // If the bot has been up for ~1 month, show the exact amount of days
    // Otherwise, show the uptime as it is
    if (hoursDiff >= 21.5 && hoursDiff < 35.5) {
        return `Bot has been up for a day (${hoursDiff} hours).`;
    } else if (daysDiff >= 25.5) {
        return `Bot has been up for a month (${daysDiff} days).`;
    } else {
        return `Bot has been up for ${uptimeAsMoment.from(currentTime, true)}.`;
    }
}
