import rssParser from 'rss-parser';
import { JsonObject } from 'type-fest';
import { StringUtils } from '../../utils/string-utils.js';
import { Scraping, TriggerClass } from './types.js';

export class RssTriggerClass implements TriggerClass {
    public getItemKey(config: Scraping, item: JsonObject): string {
        if (item.guid) return item.guid as string;
        if (item.link) return item.link as string;
        if (item.id) return item.id as string;
        return StringUtils.createContentDigest(item);
    }

    public async run(config: Scraping): Promise<JsonObject[]> {
        const options = (config.options as RssOptions) ?? {};
        const items: JsonObject[] = [];
        const feedUrl = config.url;
        const parser = new rssParser(options.parserConfig);
        const feed: rssParser.Output<JsonObject> = await parser.parseURL(feedUrl);
        if (feed && feed.items) {
            feed.items.forEach(item => {
                items.push(item);
            });
        }
        return items;
    }
}

export interface RssOptions {
    parserConfig?: JsonObject;
}
