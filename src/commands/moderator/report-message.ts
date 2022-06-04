import { ContextMenuCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { MessageActionRow, MessageContextMenuInteraction, Modal, ModalActionRowComponent, PermissionString, TextInputComponent } from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { Command, CommandDeferType } from '../command.js';

export default class ReportMessageCommand implements Command<MessageContextMenuInteraction> {
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
        // if (!intr.channel) return;
        // const message = intr.targetMessage instanceof Message
        //     ? intr.targetMessage
        //     : await intr.channel.messages.fetch(intr.targetMessage.id);
        // const embed = FormatUtils.embedTheMessage(message, intr.channel);
        // const row = new MessageActionRow()
        //     .addComponents(
        //         new MessageButton()
        //             .setCustomId('report_message_send')
        //             .setLabel('送出')
        //             .setStyle('PRIMARY'),
        //     );
        // await InteractionUtils.send(intr, {
        //     content: '向管理員檢舉該訊息',
        //     embeds: [embed],
        //     components: [row],
        // });

        const modal = new Modal()
            .setCustomId('report_message_submit')
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
    }
}
