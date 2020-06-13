import { EconItem } from 'steam-tradeoffer-manager';

/**
 * Checks if an item has a specific description
 * @param description - Description to search for
 */
export = function(description: string): boolean {
    // @ts-ignore
    const self = this as EconItem;

    if (!Array.isArray(self.descriptions)) {
        return false;
    }

    return self.descriptions.some(function(d) {
        return d.value === description;
    });
};
