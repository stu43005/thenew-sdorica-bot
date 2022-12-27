import config from 'config';
import { APIEmbed, isJSONEncodable, WebhookClient, WebhookCreateMessageOptions } from 'discord.js';
import jsonTemplates from 'json-templates';
import mingo from 'mingo';
import moment from 'moment';
import { JsonArray, JsonObject } from 'type-fest';
import { Database } from '../database/database.js';
import {
    getScrapingSourceRepository,
    ScrapingItem,
    ScrapingSource,
    ScrapingSubscription,
} from '../database/entities/scraping.js';
import { Logger } from '../services/logger.js';
import { StringUtils } from '../utils/string-utils.js';
import { Job } from './job.js';
import { triggerClasses } from './scraping/index.js';
import { Scraping, TriggerClass } from './scraping/types.js';

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

                if (
                    scrapingSource.scrapingTime &&
                    scraping.interval &&
                    scrapingSource.scrapingTime + scraping.interval > Date.now()
                ) {
                    continue;
                }

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
                        const itemKey = this.getItemKey(scraping, item);
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
                            // Logger.debug(
                            //     `scraping [${scraping.id}] item: ${itemKey} already exist`
                            // );
                        }
                    }
                }

                if (scraping.interval) {
                    scrapingSource.scrapingTime = Date.now();
                    await getScrapingSourceRepository().update(scrapingSource);
                }
            } catch (error) {
                Logger.error(`scraping [${scraping.id}] error: ${error}`);
            }
        }
    }

    private itemToMessages(scraping: Scraping, item: JsonObject): WebhookCreateMessageOptions {
        let templateResult: WebhookCreateMessageOptions | undefined;
        if (scraping.messageTemplate) {
            const template = jsonTemplates(scraping.messageTemplate);
            templateResult = template(item);
        }
        const message: WebhookCreateMessageOptions = {
            ...templateResult,
        };
        message.content ||= item.link ? `<${item.link}>` : void 0;
        if (scraping.defaultEmbed !== false) {
            message.embeds ??= [];
            const embed: APIEmbed = isJSONEncodable(message.embeds[0])
                ? message.embeds[0].toJSON()
                : message.embeds[0] ?? {};
            embed.title ||= item.title?.toString() || 'Untitled';
            embed.description ||= item.contentSnippet?.toString() || item.content?.toString();
            embed.url ||= item.link?.toString();
            embed.timestamp ||=
                item.isoDate?.toString() ||
                (item.pubDate ? moment(item.pubDate.toString()).toISOString() : void 0);
            const images = item.images as JsonArray;
            if (Array.isArray(images) && images.length > 0) {
                embed.image = {
                    url: images[0] as string,
                };
                if (images.length > 1) {
                    message.embeds.push(
                        ...images.slice(1).map(img => ({
                            image: {
                                url: img as string,
                            },
                        }))
                    );
                }
            }
            message.embeds[0] ??= embed;
        }
        return message;
    }

    private async sendNofitication(
        subscribes: ScrapingSubscription[] | undefined,
        message: WebhookCreateMessageOptions
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

    private getTriggerClass(type: string, defaultType?: string): TriggerClass {
        let trigger = triggerClasses[type];
        if (!trigger && defaultType) {
            trigger = triggerClasses[defaultType];
        }
        if (!trigger) {
            throw new Error(`Trigger not found: ${type}`);
        }
        return trigger;
    }

    private async fetch(scraping: Scraping): Promise<JsonObject[]> {
        const trigger = this.getTriggerClass(scraping.type);
        const items: JsonObject[] = await trigger.run(scraping);
        return items;
    }

    private getItemKey(scraping: Scraping, item: JsonObject): string {
        const trigger = this.getTriggerClass(scraping.type, 'rss');
        let key = trigger.getItemKey(scraping, item);
        if (typeof key !== 'string') {
            key = StringUtils.createContentDigest(key);
        }
        if (key.includes('//')) {
            key = StringUtils.createContentDigest(key);
        }
        return key;
    }

    private filter(
        items: JsonObject[],
        condition: JsonObject,
        projection?: JsonObject
    ): JsonObject[] {
        const cursor = mingo.find(items, condition, projection);
        return cursor.all() as JsonObject[];
    }
}
