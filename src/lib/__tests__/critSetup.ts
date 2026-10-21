import axios, { AxiosRequestConfig } from 'axios';
import { mkdtempSync, rmSync, statSync } from 'fs';
import os from 'os';
import path from 'path';
import { setupCrit } from '../critSetup';
import { loadCritCredentials } from '../critCredentials';

jest.mock('axios');
const http = axios as jest.Mocked<typeof axios>;
const steam64 = '76561198000000000';
const key = `sk_${'a'.repeat(64)}`;
let directory: string;
const token = (id = steam64) =>
    `Steam64=${id}&Audience=ShortLivedToken&ExpiresOn=${Math.floor(Date.now() / 1000) + 900}`;
const reply = (data: string, headers = {}, status = 200) => ({ data, headers, status });

beforeEach(() => {
    jest.resetAllMocks();
    directory = mkdtempSync(path.join(os.tmpdir(), 'crit-setup-'));
    http.post.mockResolvedValue({ status: 200, data: { token: token() } });
    http.isAxiosError.mockImplementation(
        (error: unknown): error is never => !!error && typeof error === 'object' && 'isAxiosError' in error
    );
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

test('reuses a valid existing key without website login and saves it for restart', async () => {
    await expect(setupCrit(key, steam64, [], directory)).resolves.toBe(key);
    expect(http.request.mock.calls).toHaveLength(0);
    expect(loadCritCredentials(directory)).toEqual({ steam64, apiKey: key });
    if (process.platform !== 'win32') {
        expect(statSync(path.join(directory, 'crit-credentials.json')).mode & 0o777).toBe(0o600);
    }
});

function mockSignIn(): void {
    http.request
        .mockResolvedValueOnce(reply('', { location: 'https://steamcommunity.com/openid/login' }, 302))
        .mockResolvedValueOnce(
            reply(
                '<form id="openidForm" method="post" enctype="multipart/form-data"><input name="action" value="steam_openid_login"><input name="openid.mode" value="checkid_setup"><input name="openidparams" value="safe-fixture"><input name="nonce" value="steam-nonce"></form>'
            )
        )
        .mockResolvedValueOnce(reply('', { location: 'https://crit.tf/auth/steam/return' }, 302))
        .mockResolvedValueOnce(
            reply('<form method="post" action="/users/register"></form>', {
                'set-cookie': ['__Host-registration=registration-secret; Path=/; Secure']
            })
        )
        .mockResolvedValueOnce(
            reply('Registered', {
                'set-cookie': ['__Host-auth=site-secret; Path=/; Secure']
            })
        )
        .mockResolvedValueOnce(reply(`<input id="newApiKeyValue" value="${key}">`));
}

test.each(['', `sk_${'b'.repeat(64)}`])(
    'sets up missing/revoked key %s through Steam and site registration',
    async existing => {
        if (existing) http.post.mockResolvedValueOnce({ status: 403, data: {} });
        mockSignIn();
        await expect(setupCrit(existing, steam64, ['steamLoginSecure=steam-secret'], directory)).resolves.toBe(key);
        const calls = http.request.mock.calls.map(([config]) => config as AxiosRequestConfig);
        expect(calls[2].data).toBeInstanceOf(FormData);
        expect((calls[2].data as FormData).get('nonce')).toBe('steam-nonce');
        expect(calls[2].headers['Content-Type']).toBeUndefined();
        expect(calls[4].url).toBe('https://crit.tf/users/register');
        expect(calls[5].data).toBe(`api-key-name=TF2Autobot+${steam64}`);
        for (const config of calls) {
            const cookie = String(config.headers.Cookie);
            if (config.url.startsWith('https://crit.tf')) expect(cookie).not.toContain('steam-secret');
            else expect(cookie).not.toContain('site-secret');
        }
        expect(loadCritCredentials(directory)?.apiKey).toBe(key);
    }
);

test.each([429, 500, 503, 302])('does not replace a key after service failure %s', async status => {
    http.post.mockResolvedValueOnce({ status, data: {} });
    await expect(setupCrit(key, steam64, [], directory)).rejects.toThrow('validation failed');
    expect(http.request.mock.calls).toHaveLength(0);
    expect(loadCritCredentials(directory)).toBeUndefined();
});

test('rejects a valid key belonging to another account without minting another', async () => {
    http.post.mockResolvedValueOnce({ status: 200, data: { token: token('76561198000000001') } });
    await expect(setupCrit(key, steam64, [], directory)).rejects.toThrow('different Steam account');
    expect(http.request.mock.calls).toHaveLength(0);
});

test('stops before following a redirect outside Steam and Crit TF', async () => {
    http.request.mockResolvedValueOnce(reply('', { location: 'https://example.com/steal' }, 302));
    await expect(setupCrit('', steam64, ['steamLoginSecure=secret'], directory)).rejects.toThrow('unexpected location');
    expect(http.request.mock.calls).toHaveLength(1);
});

test('does not expose axios request headers in errors', async () => {
    http.post.mockRejectedValueOnce({ isAxiosError: true, config: { headers: { 'X-API-Key': key } } });
    await expect(setupCrit(key, steam64, [], directory)).rejects.toThrow('could not reach the service');
});

test('re-registers when the service explicitly reports a deleted account', async () => {
    http.post.mockResolvedValueOnce({
        status: 400,
        data: {
            type: 'https://crit.tf/static/api-errors.html#api-key-account-unavailable'
        }
    });
    mockSignIn();
    await expect(setupCrit(`sk_${'b'.repeat(64)}`, steam64, [], directory)).resolves.toBe(key);
});

test.each([
    `Steam64=${steam64}&Audience=Wrong&ExpiresOn=9999999999`,
    `Steam64=${steam64}&Audience=ShortLivedToken&ExpiresOn=1`
])('does not mint another key for an unexpected authentication token', async accessToken => {
    http.post.mockResolvedValueOnce({ status: 200, data: { token: accessToken } });
    await expect(setupCrit(key, steam64, [], directory)).rejects.toThrow('invalid access token');
    expect(http.request.mock.calls).toHaveLength(0);
});

test('reports a persistence failure clearly without creating another key', async () => {
    await expect(setupCrit(key, steam64, [], path.join(directory, 'missing'))).rejects.toThrow(
        'Could not save Crit TF credentials'
    );
    expect(http.request.mock.calls).toHaveLength(0);
});
