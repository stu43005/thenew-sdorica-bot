import config from 'config';
import { APIEmbed, EmbedBuilder, WebhookClient } from 'discord.js';
import jsonTemplates from 'json-templates';
import { cloneDeep, get } from 'lodash-es';
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

                const result = await this.fetch(scraping);
                for (const item of result) {
                    const itemKey = this.getItemKey(scraping, item);
                    const embed = this.itemToEmbeds(scraping, item).toJSON();

                    const savedItem = await scrapingSource.items?.findById(itemKey);
                    if (!savedItem) {
                        Logger.debug(`scraping [${scraping.id}] item: ${itemKey}`, embed);
                        const newItem = new ScrapingItem();
                        Object.assign(newItem, embed);
                        newItem.id = itemKey;
                        await scrapingSource.items?.create(newItem);

                        const subscribes = await scrapingSource.subscriptions?.find();
                        await this.sendNofitication(subscribes, embed);
                    }
                }
            } catch (error) {
                Logger.error(`scraping [${scraping.id}] error: `, error);
            }
        }
    }

    private async sendNofitication(
        subscribes: ScrapingSubscription[] | undefined,
        embed: APIEmbed
    ): Promise<void> {
        if (!subscribes) return;
        for (const subscribe of subscribes) {
            if (!subscribe.url) continue;
            try {
                const webhook = new WebhookClient({
                    url: subscribe.url,
                });
                await webhook.send({
                    embeds: [embed],
                });
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
                const requestResult = (await response.json()) as JsonObject;
                if (requestResult) {
                    let itemsArray: JsonObject[] = itemsPath
                        ? get(requestResult.data, itemsPath)
                        : requestResult.data;
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
                    return requestUrl + '__' + key;
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

    private itemToEmbeds(scraping: Scraping, item: JsonObject): EmbedBuilder {
        let templateResult: APIEmbed | undefined;
        if (scraping.embed) {
            const template = jsonTemplates(scraping.embed);
            templateResult = template(item);
        }
        const embed: APIEmbed = {
            ...templateResult,
        };
        embed.title ||= item.title?.toString() || 'Untitled';
        embed.description ||= item.contentSnippet?.toString();
        embed.url ||= item.link?.toString();
        embed.timestamp ||=
            item.isoDate?.toString() ||
            (item.pubDate ? moment(item.pubDate.toString()).toISOString() : void 0);
        return new EmbedBuilder(embed);
    }
}

export interface Scraping {
    id: string;
    enabled: boolean;
    type: string;
    url: string;
    options?: JsonObject;
    embed?: APIEmbed;
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
