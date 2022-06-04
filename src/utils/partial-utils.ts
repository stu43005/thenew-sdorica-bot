import { RESTJSONErrorCodes as DiscordApiErrors } from 'discord-api-types/v10';
import {
    DiscordAPIError,
    Message,
    MessageReaction,
    PartialMessage,
    PartialMessageReaction,
    PartialUser,
    User,
} from 'discord.js';

const IGNORED_ERRORS = [
    DiscordApiErrors.UnknownMessage,
    DiscordApiErrors.UnknownChannel,
    DiscordApiErrors.UnknownGuild,
    DiscordApiErrors.UnknownUser,
    DiscordApiErrors.UnknownInteraction,
    DiscordApiErrors.MissingAccess,
];

export class PartialUtils {
    public static async fillUser(user: User | PartialUser): Promise<User | undefined> {
        if (user.partial) {
            try {
                return await user.fetch();
            } catch (error) {
                if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                    return;
                } else {
                    throw error;
                }
            }
        }

        return user;
    }

    public static async fillMessage(msg: Message | PartialMessage): Promise<Message | undefined> {
        if (msg.partial) {
            try {
                return await msg.fetch();
            } catch (error) {
                if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                    return;
                } else {
                    throw error;
                }
            }
        }

        return msg;
    }

    public static async fillReaction(
        msgReaction: MessageReaction | PartialMessageReaction
    ): Promise<MessageReaction | undefined> {
        if (msgReaction.partial) {
            try {
                msgReaction = await msgReaction.fetch();
            } catch (error) {
                if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                    return;
                } else {
                    throw error;
                }
            }
        }

        const message = await this.fillMessage(msgReaction.message);
        if (!message) {
            return;
        }
        msgReaction.message = message;

        return msgReaction;
    }
}
