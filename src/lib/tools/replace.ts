export function itemName(name: string): string {
    if (!name) {
        // if undefined, just return untouched.
        return name;
    } else {
        return name
            .replace(/Non-Craftable/g, 'NC')
            .replace(/Professional Killstreak/g, 'Pro KS')
            .replace(/Specialized Killstreak/g, 'Spec KS')
            .replace(/Killstreak/g, 'KS');
    }
}

export function specialChar(toChange: string): string {
    return toChange
        .replace(/_/g, '‗')
        .replace(/\*/g, '^')
        .replace(/~/g, '-')
        .replace(/`/g, "'")
        .replace(/>/g, '<')
        .replace(/\|/g, 'l')
        .replace(/\\/g, '/')
        .replace(/\(/g, '/')
        .replace(/\)/g, '/')
        .replace(/\[/g, '/')
        .replace(/]/g, '/');
}
