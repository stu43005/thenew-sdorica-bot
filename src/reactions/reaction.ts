import { Message, MessageReaction, User } from 'discord.js';
import { EventData } from '../models/event-data.js';

export interface Reaction {
    emoji?: string;
    requireGuild: boolean;
    requireSentByClient: boolean;
    requireEmbedAuthorTag: boolean;
    requireRemove: boolean;
    triggered(
        msgReaction: MessageReaction,
        msg: Message,
        reactor: User,
    ): boolean;
    execute(
        msgReaction: MessageReaction,
        msg: Message,
        reactor: User,
        data: EventData,
    ): Promise<void>;
}
