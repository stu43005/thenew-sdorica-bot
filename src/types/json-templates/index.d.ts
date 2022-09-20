declare module 'json-templates' {
    export interface Parameters {
        key: string;
        defaultValue?: string;
    }
    declare function parse<T extends string | JsonObject>(
        atemplate: T
    ): { parameters: Parameters[] } & ((parameters?: object) => T);
    export = parse;
}
