declare module 'steamid' {
    class SteamID {
        constructor(input: string);

        universe: number;

        type: number;

        instance: number;

        accountid: number;

        isValid(): boolean;

        getSteamID64(): string;

        toString(): string;
    }

    export = SteamID;
}
