import { RESTJSONErrorCodes as DiscordApiErrors } from 'discord-api-types/v9';
import {
    CommandInteraction,
    DiscordAPIError,
    GuildMember,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    Message,
    MessageComponentInteraction,
    MessageEmbed,
    MessageOptions,
    User
} from 'discord.js';
import { ClientUtils } from './client-utils.js';
import { MessageUtils } from './index.js';

const IGNORED_ERRORS = [
    DiscordApiErrors.UnknownMessage,
    DiscordApiErrors.UnknownChannel,
    DiscordApiErrors.UnknownGuild,
    DiscordApiErrors.UnknownUser,
    DiscordApiErrors.UnknownInteraction,
    DiscordApiErrors.CannotSendMessagesToThisUser, // User blocked bot or DM disabled
    DiscordApiErrors.ReactionWasBlocked, // User blocked bot or DM disabled
];

export class InteractionUtils {
    public static async deferReply(
        intr: CommandInteraction | MessageComponentInteraction,
        hidden: boolean = false
    ): Promise<void> {
        try {
            return await intr.deferReply({
                ephemeral: hidden,
            });
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async deferUpdate(intr: MessageComponentInteraction): Promise<void> {
        try {
            return await intr.deferUpdate();
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async send(
        intr: CommandInteraction | MessageComponentInteraction,
        content: string | MessageEmbed | MessageOptions,
        hidden: boolean = false
    ): Promise<Message | undefined> {
        try {
            const msgOptions = MessageUtils.messageOptions(content) as InteractionReplyOptions;

            if (intr.deferred || intr.replied) {
                return (await intr.followUp({
                    ...msgOptions,
                    ephemeral: hidden,
                })) as Message;
            } else {
                return (await intr.reply({
                    ...msgOptions,
                    ephemeral: hidden,
                    fetchReply: true,
                })) as Message;
            }
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async editReply(
        intr: CommandInteraction | MessageComponentInteraction,
        content: string | MessageEmbed | MessageOptions
    ): Promise<Message | undefined> {
        try {
            const msgOptions = MessageUtils.messageOptions(content);
            return (await intr.editReply({
                ...msgOptions,
            })) as Message;
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async update(
        intr: MessageComponentInteraction,
        content: string | MessageEmbed | MessageOptions
    ): Promise<Message | undefined> {
        try {
            const msgOptions = MessageUtils.messageOptions(content) as InteractionUpdateOptions;
            return (await intr.update({
                ...msgOptions,
                fetchReply: true,
            })) as Message;
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async getMemberOrUser(intr: CommandInteraction | MessageComponentInteraction): Promise<GuildMember | User> {
        if (intr.guild) {
            const member = await ClientUtils.findMember(intr.guild, intr.user.id);
            if (member) {
                return member;
            }
        }
        return intr.user;
    }
}
