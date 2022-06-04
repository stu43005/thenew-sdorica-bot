import { inlineCode, SlashCommandBuilder } from '@discordjs/builders';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { CommandInteraction, PermissionString } from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { RegexUtils } from '../../utils/regex-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class DeleteBetweenCommand implements Command {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = new SlashCommandBuilder()
        .setName('delete-between')
        .setDescription('刪除兩個訊息(不含)之間的所有訊息。')
        .addStringOption((builder) => builder
            .setName('message-id1')
            .setDescription('請輸入第一個訊息ID')
            .setRequired(true))
        .addStringOption((builder) => builder
            .setName('message-id2')
            .setDescription('請輸入第二個訊息ID')
            .setRequired(true))
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionString[] = ['MANAGE_MESSAGES'];
    public requireUserPerms: PermissionString[] = ['MANAGE_MESSAGES'];

    public async execute(intr: CommandInteraction, _data: EventData): Promise<void> {
        if (!intr.channel) return;

        const messageId1 = RegexUtils.discordId(intr.options.getString('message-id1', true));
        if (!messageId1) {
            await InteractionUtils.send(intr, `Error: 訊息ID格式錯誤。`);
            return;
        }
        const message1 = await intr.channel.messages.fetch(messageId1);
        if (!message1) {
            await InteractionUtils.send(intr, `Error: 找不到目標訊息ID: ${inlineCode(messageId1)}。`);
            return;
        }

        const messageId2 = RegexUtils.discordId(intr.options.getString('message-id2', true));
        if (!messageId2) {
            await InteractionUtils.send(intr, `Error: 訊息ID格式錯誤。`);
            return;
        }
        const message2 = await intr.channel.messages.fetch(messageId2);
        if (!message2) {
            await InteractionUtils.send(intr, `Error: 找不到目標訊息ID: ${inlineCode(messageId2)}。`);
            return;
        }

        const [firstMsg, latestMsg] = message1.createdTimestamp < message2.createdTimestamp
            ? [message1, message2]
            : [message2, message1];

        const messages = await intr.channel.messages.fetch({
            before: latestMsg.id,
        });

        await InteractionUtils.send(intr, '刪除中…');

        let count = 0;
        for (const [_id, message] of messages) {
            if (message.createdTimestamp > firstMsg.createdTimestamp && message.createdTimestamp < latestMsg.createdTimestamp) {
                await message.delete();
                count++;
            }
        }

        await InteractionUtils.editReply(intr, `已刪除 ${count} 則訊息。`);
    }
}
