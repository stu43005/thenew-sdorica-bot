import config from 'config';
import { APIEmbed, WebhookClient, WebhookMessageOptions } from 'discord.js';
import jsonTemplates from 'json-templates';
import { cloneDeep, get } from 'lodash-es';
import mingo from 'mingo';
import moment from 'moment';
import fetch, { RequestInit } from 'node-fetch';
import crypto from 'node:crypto';
import rssParser from 'rss-parser';
import { JsonObject, JsonValue } from 'type-fest';
import { Database } from '../database/database.js';
import {
    getScrapingSourceRepository,
    ScrapingItem,
    ScrapingSource,
    ScrapingSubscription,
} from '../database/entities/scraping.js';
import { Logger } from '../services/logger.js';
import { Job } from './job.js';

export class ScrapingJob implements Job {
    public name = 'Scraping';
    public schedule: string = config.get('jobs.scraping.schedule');
    public log: boolean = config.get('jobs.scraping.log');

    private scrapings: Scraping[];

    constructor() {
        this.scrapings = config.get<Scraping[]>('scrapings').filter(scraping => scraping.enabled);
    }

    public async run(): Promise<void> {
        // Make sure DB is initialized
        await Database.connect();

        for (const scraping of this.scrapings) {
            try {
                const scrapingSource = await getScrapingSourceRepository().getOrCreate(
                    scraping.id,
                    ScrapingSource
                );

                let items = await this.fetch(scraping);
                if (items.length) {
                    if (scraping.filterOutputs) {
                        items = this.filter(items, {}, scraping.filterOutputs);
                    }
                    if (scraping.filter) {
                        items = this.filter(items, scraping.filter);
                    }
                    if (scraping.skip && scraping.skip > 0) {
                        items = items.slice(scraping.skip, items.length);
                    }
                    if (scraping.limit && scraping.limit > 0) {
                        items = items.slice(0, scraping.limit);
                    }
                    for (const item of items) {
                        let itemKey = this.getItemKey(scraping, item);
                        if (itemKey.includes('//')) itemKey = this.createContentDigest(itemKey);
                        const message = this.itemToMessages(scraping, item);

                        const savedItem = await scrapingSource.items?.findById(itemKey);
                        if (!savedItem) {
                            Logger.debug(`scraping [${scraping.id}] item: ${itemKey}`, message);
                            const newItem = new ScrapingItem();
                            Object.assign(newItem, message);
                            newItem.id = itemKey;
                            await scrapingSource.items?.create(newItem);

                            const subscribes = await scrapingSource.subscriptions?.find();
                            await this.sendNofitication(subscribes, message);
                        } else {
                            Logger.debug(
                                `scraping [${scraping.id}] item: ${itemKey} already exist`
                            );
                        }
                    }
                }
            } catch (error) {
                Logger.error(`scraping [${scraping.id}] error: `, error);
            }
        }
    }

    private async sendNofitication(
        subscribes: ScrapingSubscription[] | undefined,
        message: WebhookMessageOptions
    ): Promise<void> {
        if (!subscribes) return;
        for (const subscribe of subscribes) {
            if (!subscribe.url) continue;
            try {
                const webhook = new WebhookClient({
                    url: subscribe.url,
                });
                await webhook.send(message);
            } catch (error) {
                Logger.error(
                    `post message to [${subscribe.guildId}.${subscribe.id}] error: `,
                    error
                );
            }
        }
    }

    private async fetch(scraping: Scraping): Promise<JsonObject[]> {
        const options = scraping.options ?? {};
        const items: JsonObject[] = [];
        switch (scraping.type) {
            case 'rss': {
                const { parserConfig } = options as RssOptions;
                const feedUrl = scraping.url;
                const parser = new rssParser(parserConfig);
                const feed: rssParser.Output<JsonObject> = await parser.parseURL(feedUrl);
                if (feed && feed.items) {
                    feed.items.forEach(item => {
                        items.push(item);
                    });
                }
                break;
            }
            case 'json': {
                const { itemsPath, requestConfig, shouldIncludeRawBody } = options as JsonOptions;
                const response = await fetch(scraping.url, requestConfig);
                const requestResult = (await response.json()) as JsonValue;
                if (requestResult) {
                    let itemsArray: JsonObject[] = itemsPath
                        ? get(requestResult, itemsPath)
                        : requestResult;
                    if (!Array.isArray(itemsArray)) {
                        itemsArray = [itemsArray];
                    }
                    const deepClonedData = cloneDeep(itemsArray);
                    itemsArray.forEach(item => {
                        if (shouldIncludeRawBody) {
                            item.raw__body = deepClonedData;
                        }
                        if (!item.___url) {
                            // for deduplication key
                            Object.defineProperty(item, '___url', {
                                value: scraping.url,
                            });
                        }
                        items.push(item);
                    });
                }
                break;
            }
        }
        return items;
    }

    private getItemKey(scraping: Scraping, item: JsonObject): string {
        const options = scraping.options ?? {};
        switch (scraping.type) {
            case 'rss':
            default:
                if (item.guid) return item.guid as string;
                if (item.link) return this.createContentDigest(item.link);
                if (item.id) return item.id as string;
                return this.createContentDigest(item);
            case 'json': {
                const { deduplicationKey } = options as JsonOptions;
                let key = '';
                if (deduplicationKey) {
                    key = get(item, deduplicationKey) as string;
                    if (!key) {
                        throw new Error('Can not get deduplicationKey from item');
                    }
                } else if (item.id) {
                    key = item.id as string;
                } else if (item.key) {
                    key = item.key as string;
                }

                if (key) {
                    let requestUrl = scraping.url;
                    if (item.___url) {
                        requestUrl = item.___url as string;
                    }
                    return this.createContentDigest(requestUrl) + '__' + key;
                }
                return this.createContentDigest(item);
            }
        }
        return '';
    }

    private createContentDigest(obj: JsonValue): string {
        if (typeof obj === 'string') {
            return crypto.createHash('md5').update(obj).digest('hex');
        }
        return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
    }

    private filter(
        items: JsonObject[],
        condition: JsonObject,
        projection?: JsonObject
    ): JsonObject[] {
        const cursor = mingo.find(items, condition, projection);
        return cursor.all() as JsonObject[];
    }

    private itemToMessages(scraping: Scraping, item: JsonObject): WebhookMessageOptions {
        let templateResult: WebhookMessageOptions | undefined;
        if (scraping.messageTemplate) {
            const template = jsonTemplates(scraping.messageTemplate);
            templateResult = template(item);
        }
        const message: WebhookMessageOptions = {
            ...templateResult,
        };
        if (scraping.defaultEmbed !== false) {
            message.embeds ??= [];
            const embed: APIEmbed = (message.embeds[0] as APIEmbed) ?? {};
            embed.title ||= item.title?.toString() || 'Untitled';
            embed.description ||= item.contentSnippet?.toString();
            embed.url ||= item.link?.toString();
            embed.timestamp ||=
                item.isoDate?.toString() ||
                (item.pubDate ? moment(item.pubDate.toString()).toISOString() : void 0);
            message.embeds[0] ??= embed;
        }
        return message;
    }
}

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

export interface RssOptions {
    parserConfig?: JsonObject;
}

export interface JsonOptions {
    itemsPath?: string;
    deduplicationKey?: string;
    requestConfig?: RequestInit;
    shouldIncludeRawBody?: boolean;
}
