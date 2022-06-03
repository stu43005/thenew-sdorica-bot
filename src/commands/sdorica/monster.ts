import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbed, PermissionString } from 'discord.js';
import fetch from 'node-fetch';
import { setTimeout } from 'node:timers/promises';
import rwc from 'random-weighted-choice';
import { CacheUtils } from '../../utils/cache-utils.js';
import { FormatUtils } from '../../utils/index.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class MonsterCommand implements Command {
    public metadata: ChatInputApplicationCommandData = {
        name: 'monster',
        description: '野獸抽抽樂',
        options: [
            {
                name: 'item-name',
                description: '呼喚道具名稱 (list)',
                required: true,
                type: ApplicationCommandOptionType.String.valueOf(),
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

        const itemName = intr.options.getString('item-name', true);

        const monsterTrap = await CacheUtils.getOrFetch<MonsterTrap>('MonsterTrap', async () => {
            const resp = await fetch('https://raw.githubusercontent.com/stu43005/sdorica-wiki-bot/data/wiki/MonsterTrap.json');
            return await resp.json() as MonsterTrap;
        });

        const item = monsterTrap.items[itemName];
        if (item) {
            const monsterAndRank = rwc(item);
            const [monster, rank] = monsterAndRank.split(':');
            const abilitys = monsterTrap.monsters[monster] ? monsterTrap.monsters[monster][rank] : undefined;
            if (abilitys) {
                const skill1table = monsterTrap.ability[abilitys[0]];
                const skill2table = monsterTrap.ability[abilitys[1]];
                const speciality1table = monsterTrap.ability[abilitys[2]];
                const speciality2table = monsterTrap.ability[abilitys[3]];

                const skill1 = skill1table ? rwc(skill1table) : '未知技能';
                const skill2 = skill2table ? rwc(skill2table) : '未知技能';
                const speciality1 = speciality1table ? rwc(speciality1table) : '未知特長';
                const speciality2 = speciality2table ? rwc(speciality2table) : '未知特長';

                const animationEmbed = new MessageEmbed();
                animationEmbed.setTitle(`Get Items`);
                animationEmbed.setAuthor(itemName, `https://sdorica.xyz/index.php/特殊:重新導向/file/${itemName}_M_Icon.png`, `https://sdorica.xyz/index.php/${itemName}`);
                animationEmbed.setImage('https://cdn.discordapp.com/attachments/461498327746347018/641641290471047168/ex_trap_lossy.gif');
                const member = await InteractionUtils.getMemberOrUser(intr);
                await InteractionUtils.send(intr, FormatUtils.embedOriginUserData(member, animationEmbed));

                await setTimeout(3000);

                const resultEmbed = new MessageEmbed();
                animationEmbed.setAuthor(itemName, `https://sdorica.xyz/index.php/特殊:重新導向/file/${itemName}_M_Icon.png`, `https://sdorica.xyz/index.php/${itemName}`);
                resultEmbed.setThumbnail(`https://sdorica.xyz/index.php/特殊:重新導向/file/${monster}_Mob.png`);
                resultEmbed.setTitle(`【★ ${rank}】${monster}`);
                resultEmbed.setDescription(`技能一：${skill1}\n技能二：${skill2}\n特長一：${speciality1}\n特長二：${speciality2}`);
                resultEmbed.setURL(`https://sdorica.xyz/index.php/${monster}`);
                await InteractionUtils.editReply(intr, FormatUtils.embedOriginUserData(member, resultEmbed));

            } else {
                await InteractionUtils.send(intr, '發生了一點錯誤...');
            }
        } else {
            const embed = new MessageEmbed();
            embed.setTitle('可用道具列表');
            embed.setDescription(Object.keys(monsterTrap.items).map((s, i) => `${i + 1}. [${s}](${encodeURI(`https://sdorica.xyz/index.php/${s}`)})`).join('\n'));
            embed.addField('使用方法', `/monster <道具名稱>`);
            await InteractionUtils.send(intr, embed);
        }
    }
}

type MonsterTrap = {
    items: Record<string, {
        weight: number;
        id: string;
    }[]>;
    monsters: Record<string, Record<string, [string, string, string, string]>>;
    ability: Record<string, {
        weight: number;
        id: string;
    }[]>;
};
