import moment from 'moment-timezone';

export default function timeNow(): { time: string; emoji: string; note: string } {
    const time = moment()
        .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
        .format(process.env.CUSTOM_TIME_FORMAT ? process.env.CUSTOM_TIME_FORMAT : 'MMMM Do YYYY, HH:mm:ss ZZ'); // refer: https://www.tutorialspoint.com/momentjs/momentjs_format.htm

    const timeEmoji = moment()
        .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC')
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

    const timeNote = process.env.TIME_ADDITIONAL_NOTES ? process.env.TIME_ADDITIONAL_NOTES : '';

    const timeWithEmoji = {
        time: time,
        emoji: emoji,
        note: timeNote
    };
    return timeWithEmoji;
}
