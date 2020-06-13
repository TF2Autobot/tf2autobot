/**
 * Gets an action by name
 * @param action - Action to search for
 */
export = function(action: string): string | null {
    // @ts-ignore
    if (!Array.isArray(this.actions)) {
        return null;
    }

    // @ts-ignore
    const match: { link: string; name: string } = this.actions.find(v => v.name === action);

    if (match === undefined) {
        return null;
    } else {
        return match.link;
    }
};
