import { EmbedBuilder, Message, ModalSubmitInteraction } from 'discord.js';
import { CommandDeferType } from '../commands/command.js';
import { getInteractionDataRepository, InteractionData } from '../database/entities/interaction.js';
import { EventData } from '../models/event-data.js';
import { FormatUtils } from '../utils/format-utils.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { SerializationMessage } from '../utils/serialization-utils.js';
import { ModelSubmit } from './component.js';

export default class ReportMessageSubmit implements ModelSubmit {
    public ids = ['report_message_submit-'];
    public deferType = CommandDeferType.HIDDEN;
    public requireGuild = true;
    public requireEmbedAuthorTag = false;

    public async execute(
        intr: ModalSubmitInteraction,
        _msg: Message,
        _data: EventData
    ): Promise<void> {
        if (!intr.channel || !intr.guild) return;
        const [, intrId] = intr.customId.split('-');

        const data = (await getInteractionDataRepository().findById(
            intrId
        )) as InteractionData<ReportMessageData>;

        const reason = intr.fields.getTextInputValue('reason');

        const report = new EmbedBuilder();
        report.setAuthor({
            name: `Report by: ${intr.user.tag} | in channel: #${
                'name' in intr.channel ? intr.channel.name : intr.channel.id
            }`,
            iconURL: intr.user.displayAvatarURL(),
        });
        report.setTitle('檢舉原因');
        report.setDescription(reason);
        report.setTimestamp(intr.createdAt);
        const embed = FormatUtils.embedTheMessage(data.data.message, intr.channel);

        if (
            intr.guild.publicUpdatesChannel &&
            PermissionUtils.canSend(intr.guild.publicUpdatesChannel)
        ) {
            await MessageUtils.send(intr.guild.publicUpdatesChannel, {
                content: `收到回報的訊息：`,
                embeds: [report, embed],
            });
        } else {
            const owner = await intr.guild.fetchOwner();
            const dmChannel = await owner.createDM();
            await MessageUtils.send(dmChannel, {
                content: `收到從 ${intr.guild.name} 回報的訊息：`,
                embeds: [report, embed],
            });
        }

        await InteractionUtils.send(
            intr,
            {
                content: `已報告此訊息給管理員：`,
                embeds: [report, embed],
            },
            true
        );

        data.data.reason = reason;
        await data.update();
    }
}

export interface ReportMessageData {
    message: SerializationMessage;
    reason?: string;
}
