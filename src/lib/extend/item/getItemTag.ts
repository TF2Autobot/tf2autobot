import { EconItem } from '@tf2autobot/tradeoffer-manager';

/**
 * Gets a tag by category
 * @param category - Category to search for
 */
export = function (category: string): string | null {
    const self = this as EconItem;

    if (!Array.isArray(self.tags)) {
        return null;
    }

    const match = self.tags.find(v => v.category === category);

    if (match === undefined) {
        return null;
    } else {
        // localized_tag_name for EconItem and name for CEconItem
        return match.localized_tag_name || match.name;
    }
};
