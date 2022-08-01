/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

// https://gist.github.com/mir4ef/c172583bdb968951d9e57fb50d44c3f7
interface O {
    (item: any): boolean;
}

export interface AnyObject {
    [key: string]: any;
}

interface DeepMerge {
    (target: AnyObject, ...sources: AnyObject[]): AnyObject;
}

/**
 * Method to check if an item is an object. Date and Function are considered
 * an object, so if you need to exclude those, please update the method accordingly.
 * @param item - The item that needs to be checked
 *
 */
export const isObject: O = (item: any): boolean => {
    return item === Object(item) && !Array.isArray(item);
};

export const deepMerge: DeepMerge = (target: AnyObject, ...sources: AnyObject[]): AnyObject => {
    // return the target if no sources passed
    if (!sources.length) {
        return target;
    }

    const result: AnyObject = target;

    if (isObject(result)) {
        const len: number = sources.length;

        for (let i = 0; i < len; i += 1) {
            const elm: any = sources[i];

            if (isObject(elm)) {
                for (const key in elm) {
                    // eslint-disable-next-line no-prototype-builtins
                    if (elm.hasOwnProperty(key)) {
                        if (isObject(elm[key])) {
                            if (!result[key] || !isObject(result[key])) {
                                result[key] = {};
                            }
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                            deepMerge(result[key], elm[key]);
                        } else {
                            if (Array.isArray(result[key]) && Array.isArray(elm[key])) {
                                // concatenate the two arrays and remove any duplicate primitive values
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                result[key] = Array.from(new Set(result[key].concat(elm[key])));
                            } else {
                                result[key] = elm[key];
                            }
                        }
                    }
                }
            }
        }
    }

    return result;
};
