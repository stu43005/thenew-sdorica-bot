import { Message, MessageReaction, User } from 'discord.js';
import {
    ReactionRole,
    ReactionRoleEmoji,
    ReactionRoleType,
} from '../commands/config/reaction-role.js';
import { EventData } from '../models/event-data.js';
import { ClientUtils } from '../utils/client-utils.js';
import { Reaction } from './reaction.js';

export class ReactionRoleRemove implements Reaction {
    public emoji = '';
    public requireGuild = true;
    public requireSentByClient = false;
    public requireEmbedAuthorTag = false;
    public requireRemove = true;

    public triggered(msgReaction: MessageReaction, msg: Message, reactor: User): boolean {
        if (reactor.bot) return false;

        return true;
    }

    public async execute(
        msgReaction: MessageReaction,
        msg: Message,
        reactor: User,
        data: EventData
    ): Promise<void> {
        if (!msg.inGuild()) return;

        const member = await ClientUtils.findMember(msg.guild, reactor.id);
        if (!member) return;

        const reactionRoles: ReactionRole[] = data.guild?.reactionRoles ?? [];
        if (!reactionRoles.length) return;

        const rr = reactionRoles.find(rr => rr.messageId == msg.id);
        if (!rr) return;

        if (
            rr.type === ReactionRoleType.VERIFY ||
            rr.type === ReactionRoleType.DROP ||
            rr.type === ReactionRoleType.BINDING
        ) {
            return;
        }

        const emoji = msgReaction.emoji.id || msgReaction.emoji.name;
        if (!emoji) return;
        const rrEmoji = rr.emojis.find(emo => emo.emoji == emoji);
        if (!rrEmoji) return;

        const role = await ClientUtils.findRole(msg.guild, rrEmoji.roleId);
        if (!role) return;

        let adds: ReactionRoleEmoji[] = [];
        let removes: ReactionRoleEmoji[] = [rrEmoji];

        if (rr.type === ReactionRoleType.REVERSED) {
            const temp = removes;
            removes = adds;
            adds = temp;
        }

        if (adds.length) await member.roles.add(adds.map(emo => emo.roleId));
        if (removes.length) await member.roles.remove(removes.map(emo => emo.roleId));
    }
}
