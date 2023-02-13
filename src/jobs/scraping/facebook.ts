import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { JsonObject } from 'type-fest';
import { Logger } from '../../services/logger.js';
import { DiskCache } from '../../utils/cache-utils.js';
import { StringUtils } from '../../utils/string-utils.js';
import { Scraping, TriggerClass } from './types.js';

export class FacebookTriggerClass implements TriggerClass {
    public getItemKey(config: Scraping, item: JsonObject): string {
        if (item.guid) return item.guid as string;
        if (item.link) return item.link as string;
        if (item.id) return item.id as string;
        return StringUtils.createContentDigest(item);
    }

    public async run(config: Scraping): Promise<JsonObject[]> {
        const options = (config.options as FacebookOptions) ?? {};
        const items: JsonObject[] = [];

        const id = config.url;
        const linkPath = `/${encodeURIComponent(id)}`;
        const html = await this.fetchPageHtml(linkPath, options.lang);
        // this.helpers.log.log(`[run][${linkPath}]: html = ${html}`);
        const $ = cheerio.load(html);

        const $recent = $('#recent').first();
        const $items = $recent.find('[data-ft*="story_fbid"]');

        // const itemLinks = $('#recent>div>div>div>div:nth-child(2)>div:nth-child(2)>span+a')
        //     .add('#recent>div>section>article>footer>div>span:nth-child(2)+a')
        //     .toArray()
        //     .map(a => $(a).attr('href'));
        Logger.debug(`page [${id}] found ${$items.length} items`);

        const pageItems = await Promise.all(
            $items.map(async (index, element) => {
                const $item = cheerio.load(element).root();
                const itemLink =
                    $item.find('div:nth-child(2)>div:nth-child(2)>span+a').first().attr('href') ??
                    $item.find('footer>div>span:nth-child(2)+a').first().attr('href') ??
                    '';

                try {
                    if (new RegExp(`^/.+/photos/`).test(itemLink)) {
                        // ignore...
                        return null;
                        // const data = await this.parsePhotoPage(itemLink);
                        // return {
                        // 	id: this.helpers.createContentDigest(data.url),
                        // 	title: data.title,
                        // 	link: data.url,
                        // 	content: data.content,
                        // 	images: [data.image],
                        // };
                    }

                    if (new RegExp(`^/story.php`).test(itemLink)) {
                        const data = await this.fetchStoryPage(itemLink);

                        return {
                            id: StringUtils.createContentDigest(data.url),
                            title: data.title,
                            link: data.url,
                            content: data.content,
                            images: data.images.map(img => img.image).filter(img => !!img),
                        };
                    }
                } catch (error) {
                    console.log(`[facebook]: fetch item [${itemLink}] error:`, error);
                    const data = await this.parseStoryPage($, $item, itemLink);

                    return {
                        id: StringUtils.createContentDigest(data.url),
                        title: data.title,
                        link: data.url,
                        content: data.content,
                        images: data.images.map(img => img.image).filter(img => !!img),
                    };
                }
            })
        );

        pageItems.forEach(item => {
            if (item) {
                items.push(item);
            }
        });
        return items;
    }

    private async fetchPageHtml(linkPath: string, lang?: string): Promise<string> {
        const url = `https://mbasic.facebook.com${linkPath}`;

        Logger.debug('fetch page html:', url);
        const res = await fetch(url, {
            headers: {
                'accept-language':
                    lang || 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ja;q=0.5',
                // "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
            },
        });
        const html = await res.text();
        return html;
    }

    private getStoryUrl(linkPath: string): { url: string; cacheKey: string } {
        const { searchParams: q } = new URL(`https://mbasic.facebook.com${linkPath}`);
        const storyFbId = q.get('story_fbid');
        const storyId = q.get('id');
        const url = `https://www.facebook.com/story.php?story_fbid=${storyFbId}&id=${storyId}`;
        const cacheKey = `story/${storyFbId}/${storyId}`;
        return {
            url,
            cacheKey,
        };
    }

    private async fetchStoryPage(linkPath: string): Promise<StoryData> {
        const { cacheKey } = this.getStoryUrl(linkPath);

        const html = await DiskCache.wrap(cacheKey, () => this.fetchPageHtml(linkPath));
        // this.helpers.log.log(`[fetchStoryPage][${linkPath}]: html = ${html}`);
        if (~html.indexOf('You must log in first') || ~html.indexOf('請先登入')) {
            throw new Error(`You must log in first.`);
        }
        if (~html.indexOf('temporarily blocked') || ~html.indexOf('你暫時遭到封鎖')) {
            throw new Error(`You have been temporarily blocked from performing this action.`);
        }

        const $ = cheerio.load(html);
        const $story = $('#m_story_permalink_view');
        const $item = $story.find('[data-ft*="story_fbid"]');
        // const $box = $story.find('[data-ft*="story_fbid"] > div').eq(0);
        const result = await this.parseStoryPage($, $item, linkPath);

        // console.log(`-----------------------------------`);
        // console.log(`$:html`, $.html());
        // console.log(`$story`, $story.length);
        // console.log(`$item`, $item.length);
        // console.log(`$box`, $box.length);
        // console.log(`result`, result);

        if (!result.content) {
            throw new Error(`Page no content`);
        }
        return result;
    }

    private async parseStoryPage(
        $: cheerio.CheerioAPI,
        $item: cheerio.Cheerio<cheerio.Element | cheerio.Document>,
        linkPath: string
    ): Promise<StoryData> {
        const { url, cacheKey } = this.getStoryUrl(linkPath);

        const $box = $item.find('div > div').eq(0);
        const $header = $box.find('> div').eq(0);
        const $content = $box.find('> div').eq(1);
        const $attach = $box.find('> div').eq(2);

        // console.log(`-----------------------------------`);
        // console.log(`$item:html`, $item.html());
        // console.log(`$item`, $item.length);
        // console.log(`$box`, $box.length);
        // console.log(`$header`, $header.length);
        // console.log(`$content`, $content.length);
        // console.log(`$attach`, $attach.length);

        const title = $header.find('h3').text();

        let content = '';
        if ($content.find('p').length === 0) {
            $content.find('br').replaceWith('\n');
            content = $content.text();
        } else {
            const $ps = $content.find('p');
            $ps.find('br').replaceWith('\n');
            content = $ps
                .toArray()
                .map(p => $(p).text())
                .join('\n');
        }

        const attachList = $attach.find('a');
        const attachLinkList = attachList
            .toArray()
            .map(a => $(a).attr('href'))
            .filter(Boolean) as string[];
        const attachImgList = attachList
            .find('img')
            .toArray()
            .map(a => $(a).attr('src'))
            .filter(Boolean) as string[];
        Logger.debug(`page [${cacheKey}] found ${attachLinkList.length} images`, attachLinkList);
        const images = await Promise.all(
            attachLinkList.map((link, index) =>
                this.parsePhotoPage(link).catch(reason => {
                    console.log(`fetch photo [${linkPath}] error:`, reason);
                    return {
                        image: attachImgList[index],
                    };
                })
            )
        );

        return {
            url,
            title,
            content,
            images: images.filter(Boolean),
        };
    }

    private async parsePhotoPage(linkPath: string): Promise<PhotoData> {
        const { pathname } = new URL(`https://mbasic.facebook.com${linkPath}`);
        const cacheKey = `photos${pathname}`;

        const html = await DiskCache.wrap(cacheKey, () => this.fetchPageHtml(linkPath));
        const $ = cheerio.load(html);

        const title = $('#MPhotoContent div.msg > a > strong').first().text();
        const url = `https://www.facebook.com${pathname}`;
        const $content = $('#MPhotoContent div.msg > div');
        $content.find('br').replaceWith('\n');
        const content = $content.text();
        const image = $(
            '#MPhotoContent div.desc.attachment > span > div > span > a[target=_blank].sec'
        ).attr('href');

        if (!image) {
            throw new Error(`Page no photo`);
        }
        return {
            url,
            title,
            content,
            image,
        };
    }
}

export interface FacebookOptions {
    lang?: string;
}

interface StoryData {
    url: string;
    title: string;
    content: string;
    images: PhotoData[];
}

interface PhotoData {
    url?: string;
    title?: string;
    content?: string;
    image: string;
}
