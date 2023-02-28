import { Message, MessageReaction, User } from 'discord.js';
import {
    ReactionRole,
    ReactionRoleEmoji,
    ReactionRoleType,
} from '../commands/config/reaction-role.js';
import { EventData } from '../models/event-data.js';
import { ClientUtils } from '../utils/client-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { Reaction } from './reaction.js';

export class ReactionRoleAdd implements Reaction {
    public emoji = '';
    public requireGuild = true;
    public requireSentByClient = false;
    public requireEmbedAuthorTag = false;
    public requireRemove = false;

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

        const emoji = msgReaction.emoji.id || msgReaction.emoji.name;
        if (!emoji) return;
        const rrEmoji = rr.emojis.find(emo => emo.emoji == emoji);
        if (!rrEmoji) return;

        const role = await ClientUtils.findRole(msg.guild, rrEmoji.roleId);
        if (!role) return;

        const roleIds = rr.emojis.map(emo => emo.roleId);
        const memberHasRoles = member.roles.cache.filter(role => roleIds.includes(role.id));

        let adds: ReactionRoleEmoji[] = [rrEmoji];
        let removes: ReactionRoleEmoji[] = [];
        let unreacts: ReactionRoleEmoji[] = [];

        if (rr.type === ReactionRoleType.REVERSED || rr.type === ReactionRoleType.DROP) {
            const temp = removes;
            removes = adds;
            adds = temp;
        }
        if (
            rr.type === ReactionRoleType.VERIFY ||
            rr.type === ReactionRoleType.DROP ||
            rr.type === ReactionRoleType.BINDING
        ) {
            unreacts.push(rrEmoji);
        }
        if (rr.type === ReactionRoleType.UNIQUE) {
            removes = removes.concat(
                rr.emojis.filter(
                    emo => emo !== rrEmoji && memberHasRoles.find(r => r.id == emo.roleId)
                )
            );
            unreacts = unreacts.concat(removes);
        }
        if (rr.type === ReactionRoleType.LIMIT || rr.type === ReactionRoleType.BINDING) {
            if (rr.type === ReactionRoleType.BINDING) rr.limit = 1;
            if (memberHasRoles.size >= rr.limit) {
                adds = [];
            }
        }

        if (adds.length) await member.roles.add(adds.map(emo => emo.roleId));
        if (removes.length) await member.roles.remove(removes.map(emo => emo.roleId));
        for (const emo of unreacts) {
            await MessageUtils.unreact(msg, emo.emoji, reactor);
        }
    }
}
