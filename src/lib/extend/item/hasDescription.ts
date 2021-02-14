import { EconItem } from '@tf2autobot/tradeoffer-manager';

/**
 * Checks if an item has a specific description
 * @param description - Description to search for
 */
export = function (description: string): boolean {
    const self = this as EconItem;

    if (!Array.isArray(self.descriptions)) {
        return false;
    }

    return self.descriptions.some(d => d.value === description);
};
