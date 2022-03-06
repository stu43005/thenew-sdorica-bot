import cheerio from 'cheerio';
import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbed, PermissionString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import fetch from 'node-fetch';
import { Logger } from '../../services/logger.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

const urlRegex = /((?:https?:)?\/\/)?((?:www\.ptt\.cc))\/bbs\/([\w-]+)\/((?:M\.)([\d]+)(?:\.A\.)([\w]+))(?:\.html)/g;

export class PttCommand implements Command {
    public metadata: ChatInputApplicationCommandData = {
        name: 'ptt',
        description: '預覽 PTT 文章訊息',
        options: [
            {
                name: 'link',
                description: 'Link to display.',
                required: true,
                type: ApplicationCommandOptionType.String.valueOf(),
            },
        ],
    };
    public cooldown = new RateLimiter(1, 60 * 1000);
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionString[] = [];
    public requireUserPerms: PermissionString[] = [];

    public async execute(intr: CommandInteraction): Promise<void> {
        const link = intr.options.getString('link', true);
        const embed = await pttAutoEmbed(link);
        if (embed) {
            await InteractionUtils.send(intr, embed);
        }
        else {
            await InteractionUtils.send(intr, `沒有發現ptt文章`, true);
        }
    }
}

export async function pttAutoEmbed(content: string): Promise<MessageEmbed | null> {
    let result: RegExpExecArray | null;
    while ((result = urlRegex.exec(content)) !== null) {
        const url = result[0];
        const metaline = await getPttMetaline(url);

        Logger.debug(`[ptt] url = \`${url}\``);
        Logger.debug(`[ptt] metaline = \`${JSON.stringify(metaline)}\``);

        if (metaline['標題'] && metaline['nsfw']) {
            const embed = new MessageEmbed();
            embed.setColor(789094);
            embed.setAuthor({
                name: `看板：${metaline['看板']}    作者：${metaline['作者']}`,
            });
            embed.setTitle(metaline['標題']);
            embed.setDescription(metaline['內文']);
            embed.setURL(url);
            embed.setFooter({
                text: '※ 發信站: 批踢踢實業坊(ptt.cc)',
            });
            embed.setTimestamp(new Date(`${metaline['時間']} GMT+0800`));
            return embed;
        }
    }
    return null;
}

/*
{
    標題: "[洽特] 蔡X文 & 賴X德",
    看板: "AC_In",
    時間: "Mon Oct 14 23:29:10 2019",
    作者: "youhow0418 (ㄈ87b3)",
    內文: "だむ\n10/17発売のCOMIC失楽天 2019年12月号にて\n28PのHな漫画が載ります～！\nhttps://pbs.twimg.com/media/EG2PA0BUUAcXyCp.jpg\nhttps://pbs.twimg.com/media/EG2PAz3U4AAQU__.jpg\n"
}
*/
export async function getPttMetaline(url: string): Promise<{ [key: string]: string; }> {
    const html = await req(url, false);
    const $ = cheerio.load(html);
    const r18html = await req(url, true);
    const r18$ = cheerio.load(r18html);

    const metalinesData: { [key: string]: string } = {};

    const site_name = $('meta[property=\'og:site_name\']').attr('content');
    metalinesData['nsfw'] = site_name ? '' : 'true';

    // const title = r18$('meta[property=\'og:title\']').attr('content');
    const description = r18$('meta[property=\'og:description\']').attr('content');
    if (description) metalinesData['內文'] = description;

    const metalines = r18$('.article-metaline, .article-metaline-right');
    metalines.each((index, element) => {
        const tag = r18$('.article-meta-tag', element);
        const value = r18$('.article-meta-value', element);
        metalinesData[tag.text()] = value.text();
    });

    return metalinesData;
}

async function req(url: string, over18: boolean = true): Promise<string> {
    const res = await fetch(url, {
        headers: {
            cookie: over18 ? 'over18=1' : '',
        },
    });
    return await res.text();
}
