import { parseItemAndAmountFromMessage } from '../../../Commands/functions/utils';

it('can parse one word item names', () => {
    let messageArgs = '5 Maul';
    let parsedMessage = parseItemAndAmountFromMessage(messageArgs);
    expect(parsedMessage).toEqual({ name: 'Maul', amount: 5 });

    messageArgs = 'Maul';
    parsedMessage = parseItemAndAmountFromMessage(messageArgs);
    expect(parsedMessage).toEqual({ name: 'Maul', amount: 1 });
});

it('can parse multiple word item names', () => {
    let messageArgs = '5 Nostromo Napalmer';
    let parsedMessage = parseItemAndAmountFromMessage(messageArgs);
    expect(parsedMessage).toEqual({ name: 'Nostromo Napalmer', amount: 5 });

    messageArgs = 'Nostromo Napalmer';
    parsedMessage = parseItemAndAmountFromMessage(messageArgs);
    expect(parsedMessage).toEqual({ name: 'Nostromo Napalmer', amount: 1 });
});
