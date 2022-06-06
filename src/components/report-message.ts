import { inlineCode } from '@discordjs/builders';
import { Message, MessageEmbed, ModalSubmitInteraction } from 'discord.js';
import { CommandDeferType } from '../commands/command.js';
import { EventData } from '../models/event-data.js';
import { FormatUtils, MessageUtils, PermissionUtils, RegexUtils } from '../utils/index.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { ModelSubmit } from './component.js';

export default class ReportMessageSubmit implements ModelSubmit {
    static #instance: ReportMessageSubmit;

    public static getInstance(): ReportMessageSubmit {
        return this.#instance ??= new ReportMessageSubmit();
    }

    public ids = ['report_message_submit'];
    public deferType = CommandDeferType.HIDDEN;
    public requireGuild = true;
    public requireEmbedAuthorTag = false;

    public async execute(intr: ModalSubmitInteraction, _msg: Message, _data: EventData): Promise<void> {
        if (!intr.channel || !intr.guild) return;
        const messageId = RegexUtils.discordId(intr.fields.getTextInputValue('messageId'));
        if (!messageId) {
            await InteractionUtils.send(intr, `Error: 訊息ID格式錯誤。`);
            return;
        }
        const message = await intr.channel.messages.fetch(messageId);
        if (!message) {
            await InteractionUtils.send(intr, `Error: 找不到目標訊息ID: ${inlineCode(messageId)}。`);
            return;
        }
        const reason = intr.fields.getTextInputValue('reason');

        await ReportMessageSubmit.report(intr, message, reason);
    }

    public static addId(customId: string): void {
        ReportMessageSubmit.getInstance().ids.push(customId);
    }

    public static async report(intr: ModalSubmitInteraction, message: Message, reason: string): Promise<void> {
        if (!intr.channel || !intr.guild) return;

        const report = new MessageEmbed();
        report.setAuthor({
            name: `Report by: ${intr.user.tag} | in channel: #${'name' in intr.channel ? intr.channel.name : intr.channel.id}`,
            iconURL: intr.user.displayAvatarURL(),
        });
        report.setTitle('檢舉原因');
        report.setDescription(reason);
        report.setTimestamp(intr.createdAt);
        const embed = FormatUtils.embedTheMessage(message, intr.channel);

        if (intr.guild.publicUpdatesChannel && PermissionUtils.canSend(intr.guild.publicUpdatesChannel)) {
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

        await InteractionUtils.send(intr, {
            content: `已報告此訊息給管理員：`,
            embeds: [report, embed],
        }, true);
    }
}
