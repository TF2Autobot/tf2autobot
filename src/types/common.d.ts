export interface UnknownDictionary<T> {
    [key: string]: T;
}

type UnknownDictionaryKnownValues = UnknownDictionary<any>;

export interface Effect {
    name: string;
    id: number;
}

export interface Paints {
    [name: string]: string;
}

export interface StrangeParts {
    [name: string]: string;
}
