import { Message, MessageReaction, User } from 'discord.js';
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
        if (!msg.guild) return false;

        return PermissionUtils.canPin(msg.channel);
    }

    public async execute(msgReaction: MessageReaction, msg: Message, reactor: User, data: EventData): Promise<void> {
        if (!msg.guild) return;
        if (typeof data.guild?.autopinCount === 'undefined' || data.guild.autopinCount === 0) return;

        const member = await ClientUtils.findMember(msg.guild, reactor.id);
        if (
            PermissionUtils.memberHasPermission(msg.channel, member, 'MANAGE_MESSAGES') ||
            msgReaction.count >= data.guild.autopinCount
        ) {
            if (msg.pinnable && !msg.pinned) {
                let x = msg.reactions.valueOf().find((react) => react.emoji.name === '❌');
                if (x) {
                    if (x.partial) {
                        x = await x.fetch();
                    }
                    for (const [_, user] of x.users.cache) {
                        const member = await ClientUtils.findMember(msg.guild, user.id);
                        if (PermissionUtils.memberHasPermission(msg.channel, member, 'MANAGE_MESSAGES')) {
                            return;
                        }
                    }
                }
                await MessageUtils.pin(msg);
            }
        }
    }
}
