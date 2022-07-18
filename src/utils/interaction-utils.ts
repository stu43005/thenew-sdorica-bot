import {
    CommandInteraction,
    DiscordAPIError,
    EmbedBuilder,
    GuildMember,
    InteractionReplyOptions,
    InteractionResponse,
    InteractionUpdateOptions,
    Message,
    MessageComponentInteraction,
    MessageOptions,
    ModalSubmitInteraction,
    RESTJSONErrorCodes,
    User,
} from 'discord.js';
import { ClientUtils } from './client-utils.js';
import { MessageUtils } from './message-utils.js';

const IGNORED_ERRORS: (string | number)[] = [
    RESTJSONErrorCodes.UnknownMessage,
    RESTJSONErrorCodes.UnknownChannel,
    RESTJSONErrorCodes.UnknownGuild,
    RESTJSONErrorCodes.UnknownUser,
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.CannotSendMessagesToThisUser, // User blocked bot or DM disabled
    RESTJSONErrorCodes.ReactionWasBlocked, // User blocked bot or DM disabled
];

export class InteractionUtils {
    public static async deferReply(
        intr: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction,
        hidden: boolean = false
    ): Promise<InteractionResponse | undefined> {
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

    public static async deferUpdate(
        intr: MessageComponentInteraction
    ): Promise<InteractionResponse | undefined> {
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
        intr: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction,
        content: string | EmbedBuilder | MessageOptions,
        hidden: boolean = false
    ): Promise<Message | undefined> {
        try {
            const msgOptions = MessageUtils.messageOptions(content) as InteractionReplyOptions;

            if (intr.deferred || intr.replied) {
                return await intr.followUp({
                    ...msgOptions,
                    ephemeral: hidden,
                });
            } else {
                return await intr.reply({
                    ...msgOptions,
                    ephemeral: hidden,
                    fetchReply: true,
                });
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
        content: string | EmbedBuilder | MessageOptions
    ): Promise<Message | undefined> {
        try {
            const msgOptions = MessageUtils.messageOptions(content);
            return await intr.editReply({
                ...msgOptions,
            });
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
        content: string | EmbedBuilder | MessageOptions
    ): Promise<Message | undefined> {
        try {
            const msgOptions = MessageUtils.messageOptions(content) as InteractionUpdateOptions;
            return await intr.update({
                ...msgOptions,
                fetchReply: true,
            });
        } catch (error) {
            if (error instanceof DiscordAPIError && IGNORED_ERRORS.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async getMemberOrUser(
        intr: CommandInteraction | MessageComponentInteraction
    ): Promise<GuildMember | User> {
        if (intr.guild) {
            const member = await ClientUtils.findMember(intr.guild, intr.user.id);
            if (member) {
                return member;
            }
        }
        return intr.user;
    }
}
