declare module 'steamid' {
    import { Message } from 'discord.js';

    class SteamID {
        constructor(input: string);

        universe: number;

        type: number;

        instance: number;

        accountid: number;

        isValid(): boolean;

        getSteamID64(): string;

        toString(): string;

        redirectAnswerTo: Message | undefined;
    }

    export = SteamID;
}
