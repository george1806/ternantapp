declare module 'mjml' {
    interface MJMLParseResults {
        html: string;
        errors: Array<{
            line: number;
            message: string;
            tagName: string;
        }>;
    }

    interface MJMLParsingOptions {
        fonts?: { [key: string]: string };
        keepComments?: boolean;
        beautify?: boolean;
        minify?: boolean;
        validationLevel?: 'strict' | 'soft' | 'skip';
        filePath?: string;
    }

    function mjml2html(
        mjmlContent: string,
        options?: MJMLParsingOptions
    ): MJMLParseResults;

    export = mjml2html;
}
