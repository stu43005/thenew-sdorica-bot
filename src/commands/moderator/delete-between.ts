import {
    ActionRowBuilder,
    ApplicationCommandType,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ContextMenuCommandBuilder,
    DiscordjsErrorCodes,
    hyperlink,
    MessageActionRowComponentBuilder,
    MessageContextMenuCommandInteraction,
    PermissionsBitField,
    PermissionsString,
} from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { CommandDeferType, MessageContextMenu } from '../command.js';

export default class DeleteBetweenCommand implements MessageContextMenu {
    public metadata = new ContextMenuCommandBuilder()
        .setName('Delete Between')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageMessages').valueOf())
        .toJSON();
    public deferType = CommandDeferType.NONE;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = ['ManageMessages'];
    public requireUserPerms: PermissionsString[] = ['ManageMessages'];

    private collecting: Map<string, MessageContextMenuCommandInteraction> = new Map();

    public async execute(
        intr: MessageContextMenuCommandInteraction,
        _data: EventData
    ): Promise<void> {
        if (!intr.channel || !intr.guild || !('bulkDelete' in intr.channel)) {
            await InteractionUtils.send(intr, 'This command does not support this channel.', true);
            return;
        }

        const intr1 = this.collecting.get(intr.user.id);
        const message1 = intr1?.targetMessage;
        const message2 = intr.targetMessage;

        if (!intr1 || !intr1.replied || !message1 || message1.channelId !== message2.channelId) {
            this.collecting.set(intr.user.id, intr);

            const msg = await InteractionUtils.send(
                intr,
                {
                    content: `已選擇${hyperlink(
                        '一則訊息',
                        intr.targetMessage.url
                    )}\n請選擇第二則訊息`,
                    components: [
                        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('delete-between-cancal')
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Primary)
                        ),
                    ],
                },
                true
            );

            if (msg) {
                let reason = 'timeout';
                try {
                    const btnIntr = await msg.awaitMessageComponent({
                        filter: i =>
                            i.user.id === intr.user.id && i.customId === 'delete-between-cancal',
                        componentType: ComponentType.Button,
                        time: 60_000,
                    });
                    await btnIntr.deferUpdate();
                    reason = 'user-cancel';
                } catch (error) {
                    if (
                        error instanceof Error &&
                        error.name.includes(
                            `[${
                                DiscordjsErrorCodes[DiscordjsErrorCodes.InteractionCollectorError]
                            }]`
                        )
                    ) {
                        Logger.debug(`Intercation collector error: ${error.message}`);
                    }
                }
                if (this.collecting.get(intr.user.id) === intr) {
                    this.collecting.delete(intr.user.id);
                    await InteractionUtils.editReply(intr, {
                        content: `已取消。(原因: ${reason})`,
                        components: [],
                    });
                }
            }
            return;
        }

        this.collecting.delete(intr.user.id);

        await InteractionUtils.editReply(intr1, {
            content: `即將刪除${hyperlink('第一則訊息', message1.url)}到${hyperlink(
                '第二則訊息',
                message2.url
            )}之間的所有訊息。`,
            components: [],
        });

        const [firstMsg, latestMsg] =
            message1.createdTimestamp < message2.createdTimestamp
                ? [message1, message2]
                : [message2, message1];

        const replyMsg = await InteractionUtils.send(intr, {
            content: '刪除中…',
            components: [
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('delete-between-cancal-2')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Primary)
                ),
            ],
        });

        let isCancel = false;
        let count = 0;
        let reason = '';
        let error: unknown = null;

        const cancelCollector = replyMsg?.createMessageComponentCollector({
            filter: i => i.user.id === intr.user.id && i.customId === 'delete-between-cancal-2',
            componentType: ComponentType.Button,
            max: 1,
            time: 60_000,
        });
        if (cancelCollector) {
            cancelCollector.on('collect', async btnIntr => {
                await btnIntr.deferUpdate();
                isCancel = true;
                reason = '(使用者取消)';
                await InteractionUtils.editReply(intr, {
                    content: `取消中… 已刪除 ${count} 則訊息。`,
                    components: [],
                });
            });
        }

        while (!isCancel) {
            try {
                const messages = await intr.channel.messages.fetch({
                    before: latestMsg.id,
                });
                if (isCancel) break;

                const deleteMessages = messages.filter(
                    message =>
                        message.createdTimestamp > firstMsg.createdTimestamp &&
                        message.createdTimestamp < latestMsg.createdTimestamp
                );
                if (deleteMessages.size === 0) break;

                const deletedMessages = await intr.channel.bulkDelete(deleteMessages);
                count += deletedMessages.size;
                if (isCancel) break;
            } catch (err) {
                error = err;
                break;
            }

            await InteractionUtils.editReply(intr, `刪除中… 已刪除 ${count} 則訊息。`);
        }

        cancelCollector?.stop();
        await InteractionUtils.editReply(intr, {
            content: `已刪除 ${count} 則訊息。${reason}`,
            components: [],
        });
        if (error && error instanceof Error) throw error;
    }
}
