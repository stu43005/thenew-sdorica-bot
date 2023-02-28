import { Message, MessageReaction, User } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { AutoPinReaction } from './autopin.js';
import { Reaction } from './reaction.js';

export class AutoUnpinReaction implements Reaction {
    public emoji = '❌';
    public requireGuild = true;
    public requireSentByClient = false;
    public requireEmbedAuthorTag = false;
    public requireRemove = false;

    public triggered(msgReaction: MessageReaction, msg: Message, reactor: User): boolean {
        if (reactor.bot) return false;
        if (!msg.inGuild()) return false;

        return PermissionUtils.canPin(msg.channel, true) && msg.pinned;
    }

    public async execute(
        msgReaction: MessageReaction,
        msg: Message,
        reactor: User,
        data: EventData
    ): Promise<void> {
        if (!msg.inGuild()) return;
        if (typeof data.guild?.autopinCount === 'undefined' || data.guild.autopinCount === 0)
            return;

        if (await AutoPinReaction.checkUserPinPermission(msg.channel, reactor)) {
            await MessageUtils.unpin(msg);
        }
    }
}
