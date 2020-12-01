import dayjs from 'dayjs';

export default function uptime(): string {
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
