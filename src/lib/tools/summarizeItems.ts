export default function listItems(
    items: {
        invalid: string[];
        overstock: string[];
        understock: string[];
        duped: string[];
        dupedFailed: string[];
        highValue: string[];
    },
    isSteamChat: boolean
): string {
    let list =
        items.invalid.length !== 0
            ? isSteamChat
                ? '🟨_INVALID_ITEMS:\n- ' + items.invalid.join(',\n- ')
                : '🟨`_INVALID_ITEMS:`\n- ' + items.invalid.join(',@\n- ')
            : '';
    list +=
        items.overstock.length !== 0
            ? (items.invalid.length !== 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟦_OVERSTOCKED:\n- ' + items.overstock.join(',\n- ')
                  : '🟦`_OVERSTOCKED:`\n- ' + items.overstock.join(',@\n- '))
            : '';
    list +=
        items.understock.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟩_UNDERSTOCKED:\n- ' + items.understock.join(',\n- ')
                  : '🟩`_UNDERSTOCKED:`\n- ' + items.understock.join(',@\n- '))
            : '';
    list +=
        items.duped.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 || items.understock.length !== 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🟫_DUPED_ITEMS:\n- ' + items.duped.join(',\n- ')
                  : '🟫`_DUPED_ITEMS:`\n- ' + items.duped.join(',@\n- '))
            : '';
    list +=
        items.dupedFailed.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🟪_DUPE_CHECK_FAILED:\n- ' + items.dupedFailed.join(',\n- ')
                  : '🟪`_DUPE_CHECK_FAILED:`\n- ' + items.dupedFailed.join(',@\n- '))
            : '';
    list +=
        items.highValue.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0 ||
              items.dupedFailed.length !== 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🔶_HIGH_VALUE_ITEMS:\n- ' + items.highValue.join('\n\n- ')
                  : '🔶`_HIGH_VALUE_ITEMS`\n- ' + items.highValue.join('@\n\n- '))
            : '';

    if (list.length === 0) {
        list = '-';
    }
    return list;
}
