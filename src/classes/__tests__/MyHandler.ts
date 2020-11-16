import MyHandler from '../MyHandler';
import Bot from '../Bot';
import BotManager from '../BotManager';
import SteamID from 'steamid';
import SteamUser from 'steam-user';

jest.mock('SteamUser');

test('onMessage', () => {
    SteamUser.chatMessage.mockResolvedValue();
    const botManager = new BotManager();
    const bot = new Bot(botManager);
    const myHandler = new MyHandler(bot);
    const steamID = new SteamID('abc123');
    myHandler.onMessage(steamID, 'hi');
});
