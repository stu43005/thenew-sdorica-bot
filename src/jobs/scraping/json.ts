import { cloneDeep, get } from 'lodash-es';
import fetch, { RequestInit } from 'node-fetch';
import { JsonObject, JsonValue } from 'type-fest';
import { StringUtils } from '../../utils/string-utils.js';
import { Scraping, TriggerClass } from './types.js';

export class JsonTriggerClass implements TriggerClass {
    public getItemKey(config: Scraping, item: JsonObject): string {
        const options = (config.options as JsonOptions) ?? {};
        let key = '';
        if (options.deduplicationKey) {
            key = get(item, options.deduplicationKey) as string;
            if (!key) {
                throw new Error('Can not get deduplicationKey from item');
            }
        } else if (item.id) {
            key = item.id as string;
        } else if (item.key) {
            key = item.key as string;
        }

        if (key) {
            let requestUrl = config.url;
            if (item.___url) {
                requestUrl = item.___url as string;
            }
            return StringUtils.createContentDigest(requestUrl) + '__' + key;
        }
        return StringUtils.createContentDigest(item);
    }

    public async run(config: Scraping): Promise<JsonObject[]> {
        const options = (config.options as JsonOptions) ?? {};
        const items: JsonObject[] = [];
        const response = await fetch(config.url, options.requestConfig);
        const requestResult = (await response.json()) as JsonValue;
        if (requestResult) {
            let itemsArray: JsonObject[] = options.itemsPath
                ? get(requestResult, options.itemsPath)
                : requestResult;
            if (!Array.isArray(itemsArray)) {
                itemsArray = [itemsArray];
            }
            const deepClonedData = cloneDeep(itemsArray);
            itemsArray.forEach(item => {
                if (options.shouldIncludeRawBody) {
                    item.raw__body = deepClonedData;
                }
                if (!item.___url) {
                    // for deduplication key
                    Object.defineProperty(item, '___url', {
                        value: config.url,
                    });
                }
                items.push(item);
            });
        }
        return items;
    }
}

export interface JsonOptions {
    itemsPath?: string;
    deduplicationKey?: string;
    requestConfig?: RequestInit;
    shouldIncludeRawBody?: boolean;
}
