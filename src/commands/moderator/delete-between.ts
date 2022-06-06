import { ContextMenuCommandBuilder, hyperlink } from '@discordjs/builders';
import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { InteractionCollector, Message, MessageActionRow, MessageButton, MessageContextMenuInteraction, Permissions, PermissionString } from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { CommandDeferType, MessageContextMenu } from '../command.js';

export default class DeleteBetweenCommand implements MessageContextMenu {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = new ContextMenuCommandBuilder()
        .setName('delete-between')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false)
        .setDefaultMemberPermissions(new Permissions()
            .add('MANAGE_MESSAGES')
            .valueOf())
        .toJSON();
    public deferType = CommandDeferType.NONE;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionString[] = ['MANAGE_MESSAGES'];
    public requireUserPerms: PermissionString[] = ['MANAGE_MESSAGES'];

    private collecting: Map<string, boolean> = new Map();

    public async execute(intr: MessageContextMenuInteraction, _data: EventData): Promise<void> {
        if (!intr.channel || !intr.guild) return;

        if (this.collecting.has(intr.user.id)) {
            return;
        }

        const message1 = intr.targetMessage instanceof Message
            ? intr.targetMessage
            : await intr.channel.messages.fetch(intr.targetMessage.id);

        const msg = await InteractionUtils.send(intr, {
            content: `已選擇${hyperlink('一則訊息', message1.url)}\n請選擇第二則訊息`,
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('delete-between-cancal')
                            .setLabel('Cancel')
                            .setStyle('PRIMARY')
                    )
            ]
        }, true);
        this.collecting.set(intr.user.id, true);

        const collect = new InteractionCollector(intr.client, {
            interactionType: 'APPLICATION_COMMAND',
            guild: intr.guild,
            channel: intr.channel,
            filter: (intr2) =>
                intr2.isMessageContextMenu() &&
                intr2.user.id === intr.user.id &&
                intr2.commandName === this.metadata.name,
            max: 1,
            time: 60_000,
        });

        collect.once('end', async (interactions, reason) => {
            const intr2 = interactions.first();
            if (intr2?.isMessageContextMenu()) {
                if (!intr2.channel || !intr2.guild) return;
                const message2 = intr2.targetMessage instanceof Message
                    ? intr2.targetMessage
                    : await intr2.channel.messages.fetch(intr2.targetMessage.id);

                await InteractionUtils.editReply(intr, `即將刪除${hyperlink('第一則訊息', message1.url)}到${hyperlink('第二則訊息', message2.url)}之間的所有訊息。`);

                const [firstMsg, latestMsg] = message1.createdTimestamp < message2.createdTimestamp
                    ? [message1, message2]
                    : [message2, message1];

                const messages = await intr2.channel.messages.fetch({
                    before: latestMsg.id,
                });

                await InteractionUtils.send(intr2, '刪除中…');

                let count = 0;
                for (const [_id, message] of messages) {
                    if (message.createdTimestamp > firstMsg.createdTimestamp && message.createdTimestamp < latestMsg.createdTimestamp) {
                        await message.delete();
                        count++;
                    }
                }

                await InteractionUtils.editReply(intr2, `已刪除 ${count} 則訊息。`);
            }
            else {
                await InteractionUtils.editReply(intr, `已取消。(原因: ${reason})`);
            }
            this.collecting.delete(intr.user.id);
        });

        if (!msg) return;
        try {
            const btnIntr = await msg.awaitMessageComponent({
                filter: (i) => i.user.id === intr.user.id,
                componentType: 'BUTTON',
                time: 60_000,
            });
            btnIntr.deferUpdate();
            collect.stop('user-cancel');
        } catch (error) {
            if (error instanceof Error && error.name.includes('[INTERACTION_COLLECTOR_ERROR]')) {
                Logger.debug(`Intercation collector error: ${error.message}`);
            } else {
                throw error;
            }
        }
    }
}
