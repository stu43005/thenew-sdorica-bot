declare module 'json-templates' {
    export interface Parameters {
        key: string;
        defaultValue?: string;
    }
    declare function parse<T extends string | object>(
        atemplate: T
    ): { parameters: Parameters[] } & ((parameters?: object) => T);
    export = parse;
}
