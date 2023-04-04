import {
    ActionRowBuilder,
    ApplicationCommandType,
    ContextMenuCommandBuilder,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    PermissionsString,
    RESTPostAPIApplicationCommandsJSONBody,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { ReportMessageData } from '../../components/report-message.js';
import {
    getInteractionDataRepository,
    InteractionData,
} from '../../database/entities/interaction.js';
import { EventData } from '../../models/event-data.js';
import { SerializationUtils } from '../../utils/serialization-utils.js';
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
        const message = intr.targetMessage;

        const data = new InteractionData<ReportMessageData>();
        data.fillInteraction(intr);
        data.data = {
            message: SerializationUtils.serializationMessage(message),
        };
        await getInteractionDataRepository().create(data);

        const customId = `report_message_submit-${intr.id}`;
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
                        .setValue(message.id)
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
    }
}
