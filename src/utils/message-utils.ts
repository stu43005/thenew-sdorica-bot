import {
    ChannelType,
    DiscordAPIError,
    EmbedBuilder,
    EmojiResolvable,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessageEditOptions,
    MessageReaction,
    MessageReactionResolvable,
    RESTJSONErrorCodes,
    StartThreadOptions,
    ThreadChannel,
    User,
    type SendableChannels,
} from 'discord.js';

const IGNORED_ERRORS: (string | number)[] = [
    RESTJSONErrorCodes.UnknownMessage,
    RESTJSONErrorCodes.UnknownChannel,
    RESTJSONErrorCodes.UnknownGuild,
    RESTJSONErrorCodes.UnknownUser,
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.CannotSendMessagesToThisUser, // User blocked bot or DM disabled
    RESTJSONErrorCodes.ReactionWasBlocked, // User blocked bot or DM disabled
];

export class MessageUtils {
    public static async send(
        target: User | SendableChannels,
        content: string | EmbedBuilder | MessageCreateOptions
    ): Promise<Message | undefined> {
        try {
            const msgOptions = this.messageOptions(content);
            return await target.send(msgOptions);
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async reply(
        msg: Message,
        content: string | EmbedBuilder | MessageCreateOptions,
        mentionRepliedUser: boolean = true
    ): Promise<Message | undefined> {
        try {
            const msgOptions = this.messageOptions(content);
            if (!mentionRepliedUser) {
                msgOptions.allowedMentions ??= {};
                msgOptions.allowedMentions.repliedUser = false;
            }
            return await msg.reply(msgOptions);
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async edit(
        msg: Message,
        content: string | EmbedBuilder | MessageCreateOptions
    ): Promise<Message | undefined> {
        try {
            const msgOptions = this.messageOptions(content) as MessageEditOptions;
            return await msg.edit(msgOptions);
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async react(
        msg: Message,
        emoji: EmojiResolvable
    ): Promise<MessageReaction | undefined> {
        try {
            return await msg.react(emoji);
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async unreact(
        msg: Message,
        emoji: MessageReactionResolvable,
        user?: User | GuildMember | string
    ): Promise<MessageReaction | undefined> {
        try {
            const reaction = msg.reactions.resolve(emoji);
            if (reaction && msg.channel.type !== ChannelType.DM) {
                if (user === 'all') {
                    return await reaction.remove();
                }
                return await reaction.users.remove(user || msg.client.user || undefined);
            }
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async pin(msg: Message): Promise<Message | undefined> {
        try {
            return await msg.pin();
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async unpin(msg: Message): Promise<Message | undefined> {
        try {
            return await msg.unpin();
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async startThread(
        msg: Message,
        options: StartThreadOptions
    ): Promise<ThreadChannel | undefined> {
        try {
            return await msg.startThread(options);
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async delete(msg: Message): Promise<Message | undefined> {
        try {
            return await msg.delete();
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static messageOptions(
        content: string | EmbedBuilder | MessageCreateOptions
    ): MessageCreateOptions {
        let options: MessageCreateOptions = {};
        if (typeof content === 'string') {
            options.content = content;
        } else if (content instanceof EmbedBuilder) {
            options.embeds = [content];
        } else {
            options = content;
        }
        return options;
    }
}
