import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { CommandInteraction, MessageEmbed, PermissionString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import fetch from 'node-fetch';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../command.js';

export class HitokotoCommand implements Command {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = {
        name: 'hitokoto',
        description: '獲取一則一言。',
    };
    public cooldown = new RateLimiter(1, 60 * 1000);
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionString[] = [];
    public requireUserPerms: PermissionString[] = [];

    public async execute(intr: CommandInteraction): Promise<void> {
        const res = await fetch('https://v1.hitokoto.cn/');
        const hitokoto = await res.json() as Hitokoto;
        const embed = new MessageEmbed();
        embed.setTitle('一言');
        embed.setURL(`https://hitokoto.cn?id=${hitokoto.id}`);
        embed.setDescription(hitokoto.hitokoto);
        embed.setFooter({
            text: `-「${hitokoto.from}」`,
        });
        await InteractionUtils.send(intr, embed);
    }
}

export interface Hitokoto {
    /**
     * 本条一言的id。
     * 可以链接到 https://hitokoto.cn?id=[id] 查看这个一言的完整信息。
     */
    id: number;
    /**
     * 一言正文。编码方式unicode。使用utf-8。
     */
    hitokoto: string;
    /**
     * 类型。请参考第三节参数的表格。
     */
    type: string;
    /**
     * 一言的出处。
     */
    from: string;
    /**
     * 添加者。
     */
    creator: string;
    /**
     * 添加时间。
     */
    created_at: string;
}
