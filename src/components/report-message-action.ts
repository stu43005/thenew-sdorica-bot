import { ButtonInteraction, Message, TimestampStyles, time } from 'discord.js';
import moment from 'moment';
import { InteractionData, getInteractionDataRepository } from '../database/entities/interaction.js';
import { EventData } from '../models/event-data.js';
import { ClientUtils } from '../utils/client-utils.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { Button, MessageComponentDeferType } from './component.js';
import { ReportMessageData } from './report-message.js';

export default class ReportMessageAction implements Button {
    public ids = ['report_message_action-delete-', 'report_message_action-mute-'];
    public deferType = MessageComponentDeferType.REPLY;
    public requireGuild = true;
    public requireEmbedAuthorTag = false;

    public async execute(intr: ButtonInteraction, _msg: Message, _data: EventData): Promise<void> {
        if (!intr.channel || !intr.guild) return;
        const [, action, intrId] = intr.customId.split('-');

        const data = (await getInteractionDataRepository().findById(
            intrId
        )) as InteractionData<ReportMessageData>;

        switch (action) {
            case 'delete': {
                const channel = await ClientUtils.findTextChannel(
                    intr.guild,
                    data.data.message.channelId
                );
                if (!channel) {
                    await InteractionUtils.send(intr, '錯誤: 找不到該頻道。');
                    break;
                }
                const message = await channel.messages
                    .fetch(data.data.message.id)
                    .catch(() => undefined);
                if (!message) {
                    await InteractionUtils.send(intr, '錯誤: 找不到該訊息。');
                    break;
                }
                try {
                    await MessageUtils.delete(message);
                    await InteractionUtils.send(intr, '已移除該訊息。');
                } catch (error) {
                    await InteractionUtils.send(intr, '錯誤: 無法移除該訊息。');
                }
                break;
            }
            case 'mute': {
                const member = await ClientUtils.findMember(
                    intr.guild,
                    data.data.message.author.id
                );
                if (!member) {
                    await InteractionUtils.send(intr, '錯誤: 找不到該成員。');
                    break;
                }
                const until = moment().add(1, 'hour').toDate();
                try {
                    await member.disableCommunicationUntil(until);
                    await InteractionUtils.send(
                        intr,
                        `已禁言該成員直到 ${time(until, TimestampStyles.LongDateTime)}。`
                    );
                } catch (error) {
                    await InteractionUtils.send(intr, '錯誤: 無法禁言該成員。');
                }
                break;
            }
        }
    }
}
