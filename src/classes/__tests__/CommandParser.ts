import CommandParser from '../CommandParser';

it('can parse arrays', () => {
    let message = '!config highValue.sheens=[Team Shine]';
    let params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: ['Team Shine'] } });

    message = '!config highValue.sheens=[Team Shine, Hot Rod]';
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: ['Team Shine', 'Hot Rod'] } });

    // test parse with quotes included
    message = '!config highValue.sheens=["Team Shine"]';
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: ['Team Shine'] } });

    message = '!config highValue.sheens=["Team Shine", "Hot Rod"]';
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: ['Team Shine', 'Hot Rod'] } });

    message = "!config highValue.sheens=['Team Shine']";
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: ['Team Shine'] } });

    message = "!config highValue.sheens=['Team Shine', 'Hot Rod']";
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: ['Team Shine', 'Hot Rod'] } });

    message = '!config highValue.sheens=[]';
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ highValue: { sheens: [] } });
});

it('can parse item id commands', () => {
    const message = '!add id=10151297782&intent=sell&sell.keys=1';
    const command = CommandParser.getCommand(message, '!');
    expect(command).toEqual('add');
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ id: 10151297782, intent: 'sell', sell: { keys: 1 } });
});

it('can parse values with &', () => {
    let message = '!changeName name=Buying spells & hats&i_am_sure=i_am_sure';
    let params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ name: 'Buying spells & hats', i_am_sure: 'i_am_sure' });

    message = `!test key1=value1&key2=value2&&key3=3`;
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ key1: 'value1', key2: 'value2&', key3: 3 });

    message = `!test key1=value1&key2=&value2&&key3=[value3]`;
    params = CommandParser.parseParams(CommandParser.removeCommand(message));
    expect(params).toEqual({ key1: 'value1', key2: '&value2&', key3: ['value3'] });
});
