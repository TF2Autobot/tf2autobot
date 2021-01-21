/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Gets an action by name
 * @param action - Action to search for
 */
export = function (action: string): string | null {
    if (!Array.isArray(this.actions)) {
        return null;
    }

    const match: { link: string; name: string } = this.actions.find(v => v.name === action);

    if (match === undefined) {
        return null;
    } else return match.link;
};
