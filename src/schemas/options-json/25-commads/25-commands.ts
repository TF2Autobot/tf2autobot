import jsonschema from 'jsonschema';

export const commandsSchema: jsonschema.Schema = {
    id: 'commands',
    type: 'object',
    properties: {
        enable: {
            type: 'boolean'
        },
        customDisableReply: {
            type: 'string'
        },
        how2trade: {
            type: 'only-reply-cmd' // 26.a
        },
        price: {
            type: 'price-cmd'
        },
        buy: {
            type: 'buy-sell-cmd'
        },
        sell: {
            type: 'buy-sell-cmd'
        },
        buycart: {
            type: 'buy-sell-cmd'
        },
        sellcart: {
            type: 'buy-sell-cmd'
        },
        cart: {
            type: 'cart-cmd'
        },
        clearcart: {
            type: 'only-reply-cmd' // 26.a
        },
        checkout: {
            type: 'checkout-cmd'
        },
        addToQueue: {
            type: 'add-to-queue-cmd'
        },
        cancel: {
            type: 'cancel-cmd'
        },
        queue: {
            type: 'queue-cmd'
        },
        owner: {
            type: 'only-enable-disabled-reply-cmd' // 26.d
        },
        discord: {
            type: 'discord-cmd'
        },
        more: {
            type: 'only-enable-disabled-cmd' // 26.b
        },
        autokeys: {
            type: 'only-enable-disabled-cmd' // 26.b
        },
        message: {
            type: 'message-cmd'
        },
        time: {
            type: 'only-enable-disabled-reply-cmd' // 26.d
        },
        uptime: {
            type: 'only-enable-disabled-reply-cmd' // 26.d
        },
        pure: {
            type: 'only-enable-disabled-reply-cmd' // 26.d
        },
        rate: {
            type: 'only-enable-disabled-reply-cmd' // 26.d
        },
        stock: {
            type: 'stock-cmd'
        },
        craftweapon: {
            type: 'weapons-cmd'
        },
        uncraftweapon: {
            type: 'weapons-cmd'
        }
    },
    additionalProperties: false,
    required: []
};
