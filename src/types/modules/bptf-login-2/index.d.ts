declare module 'bptf-login-2' {
    class BptfLogin {
        setCookies(cookies: string[]): void;

        login(callback: (err?: Error) => void): void;

        getAccessToken(callback: (err?: Error, accessToken?: string) => void): void;

        getAPIKey(callback: (err?: Error, apiKey?: string) => void): void;

        generateAPIKey(domain: string, description: string, callback: (err?: Error, apiKey?: string) => void): void;
    }

    export = BptfLogin;
}
