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
    RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { CommandDeferType, MessageContextMenu } from '../command.js';

export default class DeleteBetweenCommand implements MessageContextMenu {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = new ContextMenuCommandBuilder()
        .setName('delete-between')
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
        if (!intr.channel || !intr.guild) return;

        if (!this.collecting.has(intr.user.id)) {
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
                        filter: i => i.user.id === intr.user.id,
                        componentType: ComponentType.Button,
                        time: 60_000,
                    });
                    btnIntr.deferUpdate();
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
                if (this.collecting.has(intr.user.id)) {
                    this.collecting.delete(intr.user.id);
                    await InteractionUtils.editReply(intr, {
                        content: `已取消。(原因: ${reason})`,
                        components: [],
                    });
                }
            }
            return;
        }

        const intr1 = this.collecting.get(intr.user.id);
        if (!intr1) return; // never
        const message1 = intr1.targetMessage;
        const message2 = intr.targetMessage;

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

        const messages = await intr.channel.messages.fetch({
            before: latestMsg.id,
        });

        await InteractionUtils.send(intr, '刪除中…');

        let count = 0;
        for (const [_id, message] of messages) {
            if (
                message.createdTimestamp > firstMsg.createdTimestamp &&
                message.createdTimestamp < latestMsg.createdTimestamp
            ) {
                await message.delete();
                count++;
            }
        }

        await InteractionUtils.editReply(intr, `已刪除 ${count} 則訊息。`);
    }
}
