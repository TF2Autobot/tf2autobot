declare module 'jsonlint' {
    namespace jsonLint {
        interface JSONLint {
            parse(text: string): any;
        }
    }

    const jsonLint: jsonLint.JSONLint;
    export default jsonLint;
}
