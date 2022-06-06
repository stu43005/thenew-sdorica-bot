import { ContextMenuCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { Message, MessageActionRow, MessageContextMenuInteraction, Modal, ModalActionRowComponent, PermissionString, TextInputComponent } from 'discord.js';
import { randomUUID } from 'node:crypto';
import ReportMessageSubmit from '../../components/report-message.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { CommandDeferType, MessageContextMenu } from '../command.js';

export default class ReportMessageCommand implements MessageContextMenu {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = new ContextMenuCommandBuilder()
        .setName('report-message')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false)
        .toJSON();
    public deferType = CommandDeferType.NONE;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionString[] = [];
    public requireUserPerms: PermissionString[] = [];

    public async execute(intr: MessageContextMenuInteraction, _data: EventData): Promise<void> {
        if (!intr.channel) return;
        const message = intr.targetMessage instanceof Message
            ? intr.targetMessage
            : await intr.channel.messages.fetch(intr.targetMessage.id);

        const customId = `report_message_submit_${randomUUID()}`;
        const modal = new Modal()
            .setCustomId(customId)
            .setTitle('向管理員檢舉該訊息')
            .addComponents(
                new MessageActionRow<ModalActionRowComponent>()
                    .addComponents(
                        new TextInputComponent()
                            .setCustomId('messageId')
                            .setLabel('訊息ID (請勿修改)')
                            .setStyle('SHORT')
                            .setRequired(true)
                            .setValue(intr.targetMessage.id)
                    ),
                new MessageActionRow<ModalActionRowComponent>()
                    .addComponents(
                        new TextInputComponent()
                            .setCustomId('reason')
                            .setLabel('檢舉原因')
                            .setStyle('PARAGRAPH')
                            .setRequired(true)
                    ),
            );
        await intr.showModal(modal);

        try {
            const modelIntr = await intr.awaitModalSubmit({
                filter: (intr) => intr.customId === customId,
                time: 60_000,
            });
            const reason = modelIntr.fields.getTextInputValue('reason');

            await InteractionUtils.deferReply(modelIntr, true);
            await ReportMessageSubmit.report(modelIntr, message, reason);
        } catch (error) {
            if (error instanceof Error && error.name.includes('[INTERACTION_COLLECTOR_ERROR]')) {
                Logger.debug(`Intercation collector error: ${error.message}`);
                ReportMessageSubmit.addId(customId);
            } else {
                throw error;
            }
        }
    }
}
