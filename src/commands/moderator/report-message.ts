import {
    ActionRowBuilder,
    ApplicationCommandType,
    ContextMenuCommandBuilder,
    DiscordjsErrorCodes,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    PermissionsString,
    RESTPostAPIApplicationCommandsJSONBody,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import ReportMessageSubmit from '../../components/report-message.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { CommandDeferType, MessageContextMenu } from '../command.js';

export default class ReportMessageCommand implements MessageContextMenu {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = new ContextMenuCommandBuilder()
        .setName('Report Mmessage')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false)
        .toJSON();
    public deferType = CommandDeferType.NONE;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(
        intr: MessageContextMenuCommandInteraction,
        _data: EventData
    ): Promise<void> {
        if (!intr.channel) return;
        const message = intr.targetMessage;

        const customId = `report_message_submit_${randomUUID()}`;
        const modal = new ModalBuilder()
            .setCustomId(customId)
            .setTitle('向管理員檢舉該訊息')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('messageId')
                        .setLabel('訊息ID (請勿修改)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue(intr.targetMessage.id)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel('檢舉原因')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );
        await intr.showModal(modal);

        try {
            const modelIntr = await intr.awaitModalSubmit({
                filter: intr => intr.customId === customId,
                time: 60_000,
            });
            const reason = modelIntr.fields.getTextInputValue('reason');

            await InteractionUtils.deferReply(modelIntr, true);
            await ReportMessageSubmit.report(modelIntr, message, reason);
        } catch (error) {
            if (
                error instanceof Error &&
                error.name.includes(
                    `[${DiscordjsErrorCodes[DiscordjsErrorCodes.InteractionCollectorError]}]`
                )
            ) {
                Logger.debug(`Intercation collector error: ${error.message}`);
                ReportMessageSubmit.addId(customId);
            } else {
                throw error;
            }
        }
    }
}
