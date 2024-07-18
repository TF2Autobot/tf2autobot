export interface UnknownDictionary<T> {
    [key: string]: T;
}

type UnknownDictionaryKnownValues = UnknownDictionary<any>;

export interface SteamRequestParams {
    steamid: string;
    key?: string;
    access_token?: string;
}
