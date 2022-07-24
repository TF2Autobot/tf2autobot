declare module 'steamid' {
    import { Message as DiscordMessage, Snowflake } from 'discord.js';

    class SteamID {
        constructor(input: string);

        universe: number;

        type: number;

        instance: number;

        accountid: number;

        isValid(): boolean;

        getSteamID64(): string;

        toString(): string;

        discordID: Snowflake | undefined;

        redirectAnswerTo: DiscordMessage | undefined;
    }

    export = SteamID;
}
