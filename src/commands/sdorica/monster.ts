import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import fetch from 'node-fetch';
import { setTimeout } from 'node:timers/promises';
import rwc from 'random-weighted-choice';
import { CacheUtils } from '../../utils/cache-utils.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class MonsterCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('monster')
        .setDescription('野獸抽抽樂')
        .addStringOption(builder =>
            builder.setName('item-name').setDescription('呼喚道具名稱 (list)').setRequired(true)
        )
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const itemName = intr.options.getString('item-name', true);

        const monsterTrap = await CacheUtils.wrap<MonsterTrap>('MonsterTrap', async () => {
            const resp = await fetch(
                'https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/MonsterTrap.json'
            );
            return (await resp.json()) as MonsterTrap;
        });

        const item = monsterTrap.items[itemName];
        if (item) {
            const monsterAndRank = rwc(item);
            const [monster, rank] = monsterAndRank.split(':');
            const abilitys = monsterTrap.monsters[monster]
                ? monsterTrap.monsters[monster][rank]
                : undefined;
            if (abilitys) {
                const skill1table = monsterTrap.ability[abilitys[0]];
                const skill2table = monsterTrap.ability[abilitys[1]];
                const speciality1table = monsterTrap.ability[abilitys[2]];
                const speciality2table = monsterTrap.ability[abilitys[3]];

                const skill1 = skill1table ? rwc(skill1table) : '未知技能';
                const skill2 = skill2table ? rwc(skill2table) : '未知技能';
                const speciality1 = speciality1table ? rwc(speciality1table) : '未知特長';
                const speciality2 = speciality2table ? rwc(speciality2table) : '未知特長';

                const animationEmbed = new EmbedBuilder();
                animationEmbed.setTitle(`Get Items`);
                animationEmbed.setAuthor({
                    name: itemName,
                    iconURL: `https://sdorica.xyz/index.php/特殊:重新導向/file/${itemName}_M_Icon.png`,
                    url: `https://sdorica.xyz/index.php/${itemName}`,
                });
                animationEmbed.setImage(
                    'https://cdn.discordapp.com/attachments/461498327746347018/641641290471047168/ex_trap_lossy.gif'
                );
                const member = await InteractionUtils.getMemberOrUser(intr);
                await InteractionUtils.send(
                    intr,
                    FormatUtils.embedOriginUserData(member, animationEmbed)
                );

                await setTimeout(3000);

                const resultEmbed = new EmbedBuilder();
                resultEmbed.setAuthor({
                    name: itemName,
                    iconURL: `https://sdorica.xyz/index.php/特殊:重新導向/file/${itemName}_M_Icon.png`,
                    url: `https://sdorica.xyz/index.php/${itemName}`,
                });
                resultEmbed.setThumbnail(
                    `https://sdorica.xyz/index.php/特殊:重新導向/file/${monster}_Mob.png`
                );
                resultEmbed.setTitle(`【★ ${rank}】${monster}`);
                resultEmbed.setDescription(
                    `技能一：${skill1}\n技能二：${skill2}\n特長一：${speciality1}\n特長二：${speciality2}`
                );
                resultEmbed.setURL(`https://sdorica.xyz/index.php/${monster}`);
                await InteractionUtils.editReply(
                    intr,
                    FormatUtils.embedOriginUserData(member, resultEmbed)
                );
            } else {
                await InteractionUtils.send(intr, '發生了一點錯誤...');
            }
        } else {
            const embed = new EmbedBuilder();
            embed.setTitle('可用道具列表');
            embed.setDescription(
                Object.keys(monsterTrap.items)
                    .map(
                        (s, i) =>
                            `${i + 1}. [${s}](${encodeURI(`https://sdorica.xyz/index.php/${s}`)})`
                    )
                    .join('\n')
            );
            embed.addFields([
                {
                    name: '使用方法',
                    value: `/monster <道具名稱>`,
                },
            ]);
            await InteractionUtils.send(intr, embed);
        }
    }
}

type MonsterTrap = {
    items: Record<
        string,
        {
            weight: number;
            id: string;
        }[]
    >;
    monsters: Record<string, Record<string, [string, string, string, string]>>;
    ability: Record<
        string,
        {
            weight: number;
            id: string;
        }[]
    >;
};
