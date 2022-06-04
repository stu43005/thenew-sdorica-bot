import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';
import { CommandInteraction, MessageEmbed, PermissionString } from 'discord.js';
import admin from 'firebase-admin';
import { groupBy, sumBy } from 'lodash-es';
import fetch from 'node-fetch';
import { setTimeout } from 'node:timers/promises';
import rwc from 'random-weighted-choice';
import { CacheUtils } from '../../utils/cache-utils.js';
import { FormatUtils, MessageUtils } from '../../utils/index.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class GashaponCommand implements Command {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = {
        name: 'gashapon',
        description: '試試你的非洲程度',
        options: [
            {
                name: 'gashapon',
                description: '賦魂名稱 (list, me)',
                required: true,
                type: ApplicationCommandOptionType.String.valueOf(),
            },
            {
                name: 'count',
                description: '想要抽的抽數',
                required: false,
                type: ApplicationCommandOptionType.Integer.valueOf(),
            },
        ]
    };
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionString[] = [];
    public requireUserPerms: PermissionString[] = [];

    public async execute(intr: CommandInteraction): Promise<void> {
        if (intr.guild && intr.guild.id === '437330083976445953' && intr.channelId !== '643335140902436905') {
            await InteractionUtils.send(intr, `禁止在此頻道使用指令，請至 <#643335140902436905> 頻道使用。`);
            return;
        }

        const gashaponName = intr.options.getString('gashapon', true);
        let count = intr.options.getInteger('count') ?? 10;
        if (isNaN(count) || (count != 1 && count != 5 && count != 10)) {
            count = 10;
        }

        if (gashaponName == 'me') {
            const historys = await getMyHistorys(intr.user.id);
            const groupByGashapons = groupBy(historys, r => r.gashapon);
            let out = '';
            for (const gashaponName of Object.keys(groupByGashapons)) {
                const datas = groupByGashapons[gashaponName];
                const count = sumBy(datas, cur => cur.results.length);
                const countSSR = sumBy(datas, cur => cur.counts.SSR);
                const countSR = sumBy(datas, cur => cur.counts.SR);
                out += `${gashaponName}：${count} / ${rankEmojis['三階']}${countSSR} / ${rankEmojis['二階']}${countSR}\n`;
            }
            const embed = new MessageEmbed();
            embed.setTitle('各賦魂池抽數');
            embed.setDescription(out);
            const member = await InteractionUtils.getMemberOrUser(intr);
            await InteractionUtils.send(intr, FormatUtils.embedOriginUserData(member, embed));
            return;
        }

        const gashapons = await CacheUtils.getOrFetch<Gashapons>('Gashapons', async () => {
            const resp = await fetch('https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/Gashapons.json');
            return await resp.json() as Gashapons;
        });

        const gashapon = gashapons[gashaponName];
        if (gashapon) {
            const results: GashaponResult[] = [];
            for (let i = 0; i < count; i++) {
                results.push(parseResult(rwc(gashapon)));
            }

            const data: GashaponData = {
                userId: intr.user.id,
                time: Date.now(),
                gashapon: gashaponName,
                results: results,
                counts: {
                    SSR: results.filter(s => s.rank == '三階').length,
                    SR: results.filter(s => s.rank == '二階').length,
                    R: results.filter(s => s.rank == '一階').length,
                    N: results.filter(s => s.rank == '零階').length,
                }
            };

            addHistory(data);

            const animationEmbed = new MessageEmbed();
            animationEmbed.setTitle(gashaponName);
            animationEmbed.setURL(`https://sdorica.xyz/index.php/${gashaponName}`);
            animationEmbed.setThumbnail(`https://sdorica.xyz/index.php/特殊:重新導向/file/${gashaponName}(橫幅).jpg`);
            animationEmbed.setImage('https://media.discordapp.net/attachments/440490263245225994/608494798730428426/8a0ac007d09fab56.gif');
            const member = await InteractionUtils.getMemberOrUser(intr);
            await InteractionUtils.send(intr, FormatUtils.embedOriginUserData(member, animationEmbed));

            await setTimeout(3000);

            const resultEmbed = new MessageEmbed();
            resultEmbed.setThumbnail(`https://sdorica.xyz/index.php/特殊:重新導向/file/${gashaponName}(橫幅).jpg`);
            resultEmbed.setTitle(gashaponName);
            resultEmbed.setDescription(formatResult(results));
            resultEmbed.setURL(`https://sdorica.xyz/index.php/${gashaponName}`);
            const msg = await InteractionUtils.editReply(intr, FormatUtils.embedOriginUserData(member, resultEmbed));

            if (msg && data.counts.N == 10) {
                await MessageUtils.react(msg, '673561486613938187'); // PuggiMask
            }
            if (msg && data.counts.SSR > 0) {
                await MessageUtils.react(msg, '594945785553092608'); // torch
            }

        } else {
            const embed = new MessageEmbed();
            embed.setTitle('可用賦魂列表');
            embed.setDescription(Object.keys(gashapons).map((s, i) => `${i + 1}. [${s}](${encodeURI(`https://sdorica.xyz/index.php/${s}`)})`).join('\n'));
            embed.addField('使用方法', `/gashapon <賦魂名稱> [抽數(1,5,10)]`);
            embed.addField('顯示自己最近一天內的抽數', `/gashapon me`);
            await InteractionUtils.send(intr, embed);
        }
    }
}

const historyTime = 24 * 60 * 60 * 1000;

export const rankEmojis: Record<string, string> = {
    '零階': '<:rank0:729195470928478238>',
    '一階': '<:rank1:729195470974484610>',
    '二階': '<:rank2:729195470974353520>',
    '三階': '<:rank3:729195470869758036>',
};

type Gashapons = Record<string, {
    weight: number;
    id: string;
}[]>;

interface GashaponData {
    userId: string;
    time: number;
    gashapon: string;
    results: GashaponResult[];
    counts: {
        SSR: number,
        SR: number,
        R: number,
        N: number,
    };
}
interface GashaponResult {
    hero: string;
    rank: string;
}

function addHistory(data: GashaponData): void {
    const db = admin.firestore();
    db.collection('gashapon_history').add(data);
    CacheUtils.del(`gashapon_history/${data.userId}`);
}

async function getMyHistorys(userId: string): Promise<GashaponData[]> {
    const data = await CacheUtils.getOrFetch<GashaponData[]>(`gashapon_history/${userId}`, async () => {
        const db = admin.firestore();
        const snapshot = await db.collection('gashapon_history').where('userId', '==', userId).where('time', '>=', Date.now() - historyTime).get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => doc.data()) as GashaponData[];
    });
    return data;
}

function parseResult(result: string): GashaponResult {
    const strs = result.split(':');
    const name = strs[0];
    const rank = strs[1];
    return {
        hero: name,
        rank,
    };
}

function formatResult(results: GashaponResult[]): string {
    return results.map(result => {
        return `${rankEmojis[result.rank] ?? result.rank} ${result.hero}`;
    }).join('\n');
}
