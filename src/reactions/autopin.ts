import { GuildTextBasedChannel, Message, MessageReaction, User } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { ClientUtils } from '../utils/client-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { Reaction } from './reaction.js';

export class AutoPinReaction implements Reaction {
    public emoji = '📌';
    public requireGuild = true;
    public requireSentByClient = false;
    public requireEmbedAuthorTag = false;
    public requireRemove = false;

    public triggered(msgReaction: MessageReaction, msg: Message, reactor: User): boolean {
        if (reactor.bot) return false;
        if (!msg.inGuild()) return false;

        return PermissionUtils.canPin(msg.channel) && msg.pinnable && !msg.pinned;
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

        if (
            msgReaction.count >= data.guild.autopinCount ||
            (await AutoPinReaction.checkUserPinPermission(msg.channel, reactor))
        ) {
            const x = msg.reactions.resolve('❌');
            if (x) {
                for (const [_, user] of x.users.cache) {
                    if (await AutoPinReaction.checkUserPinPermission(msg.channel, user)) {
                        return;
                    }
                }
            }
            await MessageUtils.pin(msg);
        }
    }

    public static async checkUserPinPermission(
        channel: GuildTextBasedChannel,
        user: User
    ): Promise<boolean> {
        const member = await ClientUtils.findMember(channel.guild, user.id);
        if (
            PermissionUtils.memberHasPermission(channel, member, 'ManageMessages') ||
            (channel.isThread() && channel.ownerId === user.id)
        ) {
            return true;
        }
        return false;
    }
}
