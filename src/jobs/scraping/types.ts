import { WebhookMessageOptions } from 'discord.js';
import { JsonObject } from 'type-fest';

export interface Scraping {
    id: string;
    enabled: boolean;
    type: string;
    url: string;
    options?: JsonObject;
    filter?: JsonObject;
    filterOutputs?: JsonObject;
    skip?: number;
    limit?: number;
    messageTemplate?: WebhookMessageOptions;
    defaultEmbed?: boolean;
}

export interface TriggerClass {
    getItemKey: (config: Scraping, item: JsonObject) => string;
    run(config: Scraping): Promise<JsonObject[]> | JsonObject[];
}
