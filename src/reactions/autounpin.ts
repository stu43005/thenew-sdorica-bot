import { Message, MessageReaction, User } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { ClientUtils } from '../utils/client-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { Reaction } from './reaction.js';

export class AutoUnpinReaction implements Reaction {
    public emoji = '❌';
    public requireGuild = true;
    public requireSentByClient = false;
    public requireEmbedAuthorTag = false;
    public requireRemove = false;

    public triggered(msgReaction: MessageReaction, msg: Message, reactor: User): boolean {
        if (reactor.bot) return false;
        if (!msg.guild) return false;

        return PermissionUtils.canPin(msg.channel, true);
    }

    public async execute(msgReaction: MessageReaction, msg: Message, reactor: User, _data: EventData): Promise<void> {
        if (!msg.guild) return;

        const member = await ClientUtils.findMember(msg.guild, reactor.id);
        if (PermissionUtils.memberHasPermission(msg.channel, member, 'MANAGE_MESSAGES')) {
            if (msg.pinnable && msg.pinned) {
                await MessageUtils.unpin(msg);
            }
        }
    }
}
