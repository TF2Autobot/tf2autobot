import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { saveCritCredentials } from './critCredentials';

const ORIGIN = 'https://crit.tf';
const STEAM = 'https://steamcommunity.com';

class CritSetupError extends Error {}

/** Only explicit authentication failures justify replacing an existing key. */
async function validKey(apiKey: string, steam64: string): Promise<boolean> {
    const response = await axios.post<{ token?: string; type?: string }>(`${ORIGIN}/api/v2/auth`, undefined, {
        headers: { 'X-API-Key': apiKey },
        timeout: 30000,
        maxRedirects: 0,
        validateStatus: () => true
    });
    if ([401, 403].includes(response.status)) return false;
    if (
        response.status === 400 &&
        response.data.type === `${ORIGIN}/static/api-errors.html#api-key-account-unavailable`
    )
        return false;
    if (response.status !== 200 || typeof response.data.token !== 'string') {
        throw new CritSetupError('Crit TF key validation failed; try again later.');
    }
    // The token comes directly from Crit TF over TLS. Read its SWT claims to
    // prevent accidentally connecting a different Steam account's valid key.
    const claims = new URLSearchParams(response.data.token);
    if (claims.get('Steam64') !== steam64) {
        throw new CritSetupError('The Crit TF API key belongs to a different Steam account.');
    }
    if (
        claims.get('Audience') !== 'ShortLivedToken' ||
        !Number.isFinite(Number(claims.get('ExpiresOn'))) ||
        Number(claims.get('ExpiresOn')) <= Date.now() / 1000
    ) {
        throw new CritSetupError('Crit TF returned an invalid access token.');
    }
    return true;
}

class CritSession {
    private readonly jar = new CookieJar();

    constructor(cookies: string[]) {
        // Steam cookies are scoped to Steam and never copied to Crit TF.
        for (const cookie of cookies) this.jar.setCookieSync(cookie, STEAM);
    }

    async request(url: string, body?: URLSearchParams | FormData): Promise<{ url: string; html: string }> {
        let method = body === undefined ? 'GET' : 'POST';
        for (let redirects = 0; redirects <= 10; redirects++) {
            const target = new URL(url);
            if (![ORIGIN, STEAM].includes(target.origin) || target.username || target.password) {
                throw new CritSetupError('Crit TF sign-in redirected to an unexpected location.');
            }
            const response: AxiosResponse<string> = await axios.request<string>({
                url,
                method,
                data: body instanceof URLSearchParams ? body.toString() : body,
                headers: {
                    Cookie: this.jar.getCookieStringSync(url),
                    ...(method === 'POST' ? { Origin: target.origin } : {}),
                    ...(body instanceof URLSearchParams ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
                },
                timeout: 30000,
                maxRedirects: 0,
                maxContentLength: 2 * 1024 * 1024,
                responseType: 'text',
                validateStatus: () => true
            });
            for (const cookie of response.headers['set-cookie'] ?? [])
                this.jar.setCookieSync(cookie, url, { ignoreError: true });
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.location as string | undefined;
                if (!location) throw new CritSetupError('Crit TF sign-in returned an incomplete redirect.');
                const next = new URL(location, url);
                if (method === 'POST' && [307, 308].includes(response.status) && next.origin !== target.origin) {
                    throw new CritSetupError('Crit TF sign-in tried to forward a form to another origin.');
                }
                if ([301, 302, 303].includes(response.status)) {
                    method = 'GET';
                    body = undefined;
                }
                url = next.href;
                continue;
            }
            if (response.status !== 200) throw new CritSetupError(`Crit TF sign-in failed (HTTP ${response.status}).`);
            return { url, html: response.data };
        }
        throw new CritSetupError('Crit TF sign-in exceeded the redirect limit.');
    }

    async createKey(steam64: string): Promise<string> {
        const login = await this.request(`${ORIGIN}/auth/steam`);
        if (new URL(login.url).origin !== STEAM) throw new CritSetupError('Crit TF did not redirect to Steam sign-in.');
        const $ = load(login.html);
        const form = $('#openidForm');
        if (form.length !== 1 || $('#loginForm').length) {
            throw new CritSetupError('Steam web session is not signed in; restart the bot to obtain a fresh session.');
        }
        const fields =
            form.attr('enctype')?.toLowerCase() === 'multipart/form-data' ? new FormData() : new URLSearchParams();
        form.find('input[name]').each((_, input) => {
            fields.set($(input).attr('name'), $(input).attr('value') ?? '');
        });
        const result = await this.request(`${STEAM}/openid/login`, fields);
        if (new URL(result.url).origin !== ORIGIN) throw new CritSetupError('Steam did not complete Crit TF sign-in.');
        // The site's Steam callback uses an HTML POST form rather than an HTTP
        // redirect to finish registration, including for existing accounts.
        const callback = load(result.html);
        if (callback('form[action="/users/register"][method="post"]').length === 1) {
            await this.request(`${ORIGIN}/users/register`, new URLSearchParams());
        }
        const response = await this.request(
            `${ORIGIN}/settings/new-api-key`,
            new URLSearchParams({ 'api-key-name': `TF2Autobot ${steam64}` })
        );
        const apiKey = load(response.html)('#newApiKeyValue').attr('value');
        if (!apiKey || !/^sk_[a-f0-9]{64}$/.test(apiKey))
            throw new CritSetupError('Crit TF did not return a new API key.');
        return apiKey;
    }
}

export async function setupCrit(
    apiKey: string,
    steam64: string,
    cookies: string[],
    directory: string
): Promise<string> {
    try {
        if (!apiKey || !(await validKey(apiKey, steam64))) {
            apiKey = await new CritSession(cookies).createKey(steam64);
            if (!(await validKey(apiKey, steam64))) throw new CritSetupError('The new Crit TF key was rejected.');
        }
    } catch (error) {
        // Axios errors retain request headers/cookies and response bodies. Never
        // pass those objects to the startup error logger.
        if (axios.isAxiosError(error))
            throw new CritSetupError('Crit TF auto setup could not reach the service; try again later.');
        if (error instanceof CritSetupError) throw error;
        throw new CritSetupError('Crit TF auto setup could not process the service response; try again later.');
    }
    await saveCritCredentials(directory, { steam64, apiKey });
    return apiKey;
}
