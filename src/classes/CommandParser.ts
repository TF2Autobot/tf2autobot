import dotProp from 'dot-prop';
import { UnknownDictionaryKnownValues } from '../types/common';
import { parseJSON } from '../lib/helpers';

export default class CommandParser {
    static getCommand(message: string, prefix: string): string | null {
        if (message.startsWith(prefix)) {
            return message.slice(prefix.length).trim().split(/ +/g).shift()?.toLowerCase();
        }

        return null;
    }

    static removeCommand(message: string): string {
        return message.substring(message.indexOf(' ') + 1);
    }

    static parseParams(paramString: string): UnknownDictionaryKnownValues {
        const params: UnknownDictionaryKnownValues = parseJSON(
            '{"' +
                paramString
                    .replace(/"/g, '\\"')
                    .replace(/&(?!&)(?=[^&=]+=[^&]*)/g, '","') // Split only valid key-value pairs
                    .replace(/=/g, '":"') +
                '"}'
        );

        const parsed: UnknownDictionaryKnownValues = {};
        if (params !== null) {
            for (const key in params) {
                if (!Object.prototype.hasOwnProperty.call(params, key)) continue;

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                let value = params[key];

                if (key !== 'sku') {
                    const lowerCase = (value as string).toLowerCase();
                    if (/^-?\d+$/.test(lowerCase)) {
                        value = parseInt(lowerCase);
                    } else if (/^-?\d+(\.\d+)?$/.test(lowerCase)) {
                        value = parseFloat(lowerCase);
                    } else if (lowerCase === 'true') {
                        value = true;
                    } else if (lowerCase === 'false') {
                        value = false;
                    } else if (typeof value === 'string' && value[0] === '[' && value[value.length - 1] === ']') {
                        if (value.length === 2) {
                            value = [];
                        } else {
                            value = value
                                .slice(1, -1)
                                .split(',')
                                .map(v => v.trim().replace(/["']/g, ''));
                        }
                    }
                }

                dotProp.set(parsed, key.trim(), value);
            }
        }

        return parsed;
    }
}
