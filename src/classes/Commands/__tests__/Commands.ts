import Commands from '../Commands';
import Bot from '../../Bot';
import BotManager from '../../BotManager';
import SteamID from 'steamid';
import { loadOptions } from '../../Options';
import InventoryManager from '../../InventoryManager';
import { setupPricelist } from '../../__tests__/Pricelist';
import Inventory from '../../Inventory';
import SchemaManager from 'tf2-schema-2';

jest.mock('../../MyHandler/SocketManager');
jest.mock('../../Friends');
jest.mock('../../Trades');
jest.mock('../../Listings');
jest.mock('../../TF2GC');
jest.mock('../../BotManager');
jest.mock('../../Groups');
jest.mock('bptf-listings-2');
jest.mock('../../../lib/pricer-api');
jest.mock('../../BotManager');
it('can run id commands', async () => {
    // setup the bot
    const [pricer, schema, schemaManager, priceList] = await setupPricelist();
    const botManager = new BotManager(pricer);

    const adminId = '76561198013127982';
    const incomingId = new SteamID(adminId);
    const options = loadOptions({ steamAccountName: 'abc123', admins: [adminId] });
    const bot = new Bot(botManager, options, pricer);
    bot.schemaManager = new SchemaManager({
        apiKey: 'abc123',
        updateTime: 24 * 60 * 60 * 1000
    });
    bot.schemaManager.setSchema(schema);
    bot.schema = schemaManager.schema;
    bot.options = options;
    bot.pricelist = priceList;
    bot.setProperties();
    const inventory = new Inventory(
        adminId,
        bot.manager,
        schemaManager.schema,
        options,
        bot.effects,
        bot.paints,
        bot.strangeParts,
        'our'
    );

    // add items to inventory (https://steamcommunity.com/inventory/<steam64id>/440/2?l=english&count=5000)
    inventory.addItem('5000;6', '10345785556');
    inventory.addItem('5001;6', '10345786705');
    inventory.addItem('5002;6', '10345786003');
    inventory.addItem('5021;6', '10367793888');
    inventory.addItem('265;6;uncraftable', '10345786776');
    bot.inventoryManager = new InventoryManager(priceList, inventory);

    // here is the command parser we will test
    const cmds = new Commands(bot, pricer);

    // test add with bad current id and spy to see if the bot response with a message
    const spySendMessage = jest.spyOn(bot, 'sendMessage');
    let currentId = '547798288';
    let message = `!add assetid=${currentId}&intent=sell&sell.keys=1`;
    await cmds.processMessage(incomingId, message);
    expect(spySendMessage).toBeCalledWith(
        { accountid: 52862254, instance: 1, type: 1, universe: 1 },
        `❌ item with assetid "547798288" was not found.`
    );
    spySendMessage.mockClear();

    // test assetid of key should be rejected
    currentId = '10367793888';
    message = `!add assetid=${currentId}&intent=sell&sell.keys=1`;
    await cmds.processMessage(incomingId, message);
    expect(spySendMessage).toBeCalledWith(
        { accountid: 52862254, instance: 1, type: 1, universe: 1 },
        `❌ Failed to add the item to the pricelist: Don't price Mann Co. Supply Crate Key with keys property`
    );
    spySendMessage.mockClear();

    // test good assetid and spy on price api call
    const spyAddPrice = jest.spyOn(priceList, 'addPrice');
    currentId = '10345786776';
    message = `!add assetid=${currentId}&intent=sell&sell.keys=1`;
    await cmds.processMessage(incomingId, message);
    expect(spySendMessage).toBeCalledWith(
        { accountid: 52862254, instance: 1, type: 1, universe: 1 },
        `✅ Added "Non-Craftable Sticky Jumper" (10345786776)
💲 Buy: 0 keys, 0 ref | Sell: 1 key
🛒 Intent: sell
📦 Stock: 1 | Min: 0 | Max: 1
📋 Enabled: ✅
🔄 Autoprice: ❌
½🔄 isPartialPriced: ❌
🔰 Group: all`
    );
    expect(spyAddPrice).toBeCalledWith(
        '10345786776',
        {
            assetid: '10345786776',
            autoprice: false,
            buy: { keys: 0, metal: 0 },
            enabled: true,
            group: 'all',
            intent: 1,
            isPartialPriced: false,
            max: 1,
            min: 0,
            note: {
                buy: null,
                sell: null
            },
            promoted: 0,
            sell: {
                keys: 1,
                metal: 0
            },
            sku: '265;6;uncraftable'
        },
        true,
        'COMMAND'
    );

    // // test buy
    // message = '!buy id=10151297782';
    // cmds.processMessage(incomingId, message);
    // expect(spy).toBeCalledWith(incomingId, message);
    //
    // // test buycart
    // message = '!buycart id=10151297782';
    // cmds.processMessage(incomingId, message);
    // expect(spy).toBeCalledWith(incomingId, message);
    //
    // // test sell
    // message = '!sell id=10151297782';
    // cmds.processMessage(incomingId, message);
    // expect(spy).toBeCalledWith(incomingId, message);
    //
    // // test sellcart
    // message = '!sell id=10151297782';
    // cmds.processMessage(incomingId, message);
    // expect(spy).toBeCalledWith(incomingId, message);
    //
    // // test update
    // message = '!update id=10151297782&intent=sell&sell.keys=2';
    // cmds.processMessage(incomingId, message);
    // expect(spy).toBeCalledWith(incomingId, message);
    //
    // // test remove
    // message = '!remove id=10151297782';
    // cmds.processMessage(incomingId, message);
    // expect(spy).toBeCalledWith(incomingId, message);
});
