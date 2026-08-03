import dayjs, { ConfigType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const STEAM_MAINTENANCE_TIMEZONE = 'America/Los_Angeles';

const TUESDAY = 2;
const START_MINUTES = 13 * 60;
const END_MINUTES = 17 * 60 + 15;

export function getSteamMaintenanceDelay(now: ConfigType = new Date()): number | null {
    const pacificNow = dayjs(now).tz(STEAM_MAINTENANCE_TIMEZONE);
    const minutes = pacificNow.hour() * 60 + pacificNow.minute();

    if (pacificNow.day() !== TUESDAY || minutes < START_MINUTES || minutes >= END_MINUTES) {
        return null;
    }

    return pacificNow.startOf('day').add(END_MINUTES, 'minute').diff(pacificNow);
}
