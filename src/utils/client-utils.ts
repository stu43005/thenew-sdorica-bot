import {
    Channel,
    Client,
    DiscordAPIError,
    DMChannel,
    Guild,
    GuildEmoji,
    GuildMember,
    GuildTextBasedChannel,
    NonThreadGuildBasedChannel,
    RESTJSONErrorCodes,
    Role,
    TextChannel,
    User,
    VoiceBasedChannel,
} from 'discord.js';
import { PermissionUtils } from './permission-utils.js';
import { RegexUtils } from './regex-utils.js';

const FETCH_MEMBER_LIMIT = 20;

export class ClientUtils {
    public static async getUser(client: Client, input: string): Promise<User | undefined> {
        const discordId = RegexUtils.discordId(input);
        if (!discordId) {
            return;
        }

        try {
            return await client.users.fetch(discordId);
        } catch (error) {
            const allowErrors: (string | number)[] = [RESTJSONErrorCodes.UnknownUser];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async getChannel(
        client: Client,
        input: string
    ): Promise<Channel | null | undefined> {
        const discordId = RegexUtils.discordId(input);
        if (!discordId) {
            return;
        }

        try {
            return await client.channels.fetch(discordId);
        } catch (error) {
            const allowErrors: (string | number)[] = [RESTJSONErrorCodes.UnknownChannel];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async findMember(guild: Guild, input: string): Promise<GuildMember | undefined> {
        try {
            const discordId = RegexUtils.discordId(input);
            if (discordId) {
                return await guild.members.fetch(discordId);
            }

            const tag = RegexUtils.tag(input);
            if (tag) {
                return (
                    await guild.members.fetch({ query: tag.username, limit: FETCH_MEMBER_LIMIT })
                ).find(member => member.user.discriminator === tag?.discriminator);
            }

            return (await guild.members.fetch({ query: input, limit: 1 })).first();
        } catch (error) {
            const allowErrors: (string | number)[] = [
                RESTJSONErrorCodes.UnknownMember,
                RESTJSONErrorCodes.UnknownUser,
            ];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async findRole(guild: Guild, input: string): Promise<Role | null | undefined> {
        try {
            const discordId = RegexUtils.discordId(input);
            if (discordId) {
                return await guild.roles.fetch(discordId);
            }

            const search = input.toLowerCase();
            return (await guild.roles.fetch()).find(role =>
                role.name.toLowerCase().includes(search)
            );
        } catch (error) {
            const allowErrors: (string | number)[] = [RESTJSONErrorCodes.UnknownRole];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async findGuildEmoji(
        guild: Guild,
        input: string
    ): Promise<GuildEmoji | null | undefined> {
        try {
            const { id: discordId } = RegexUtils.guildEmoji(input) ?? {};
            if (discordId) {
                return await guild.emojis.fetch(discordId);
            }

            const search = input.toLowerCase();
            return (await guild.emojis.fetch()).find(
                emoji => emoji.name?.toLowerCase().includes(search) ?? false
            );
        } catch (error) {
            const allowErrors: (string | number)[] = [RESTJSONErrorCodes.UnknownRole];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async findTextChannel(
        guild: Guild,
        input: string
    ): Promise<GuildTextBasedChannel | undefined> {
        try {
            const discordId = RegexUtils.discordId(input);
            if (discordId) {
                const channel = await guild.channels.fetch(discordId);
                if (channel?.isTextBased()) {
                    return channel;
                } else {
                    return;
                }
            }

            const search = input.toLowerCase().replaceAll(' ', '-');
            return [...(await guild.channels.fetch()).values()]
                .filter(
                    (channel): channel is NonThreadGuildBasedChannel & GuildTextBasedChannel =>
                        channel?.isTextBased() ?? false
                )
                .find(channel => channel.name.toLowerCase().includes(search));
        } catch (error) {
            const allowErrors: (string | number)[] = [RESTJSONErrorCodes.UnknownChannel];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async findVoiceChannel(
        guild: Guild,
        input: string
    ): Promise<VoiceBasedChannel | undefined> {
        try {
            const discordId = RegexUtils.discordId(input);
            if (discordId) {
                const channel = await guild.channels.fetch(discordId);
                if (channel?.isVoiceBased()) {
                    return channel;
                } else {
                    return;
                }
            }

            const search = input.toLowerCase();
            return [...(await guild.channels.fetch()).values()]
                .filter((channel): channel is VoiceBasedChannel => channel?.isVoiceBased() ?? false)
                .find(channel => channel.name.toLowerCase().includes(search));
        } catch (error) {
            const allowErrors: (string | number)[] = [RESTJSONErrorCodes.UnknownChannel];
            if (error instanceof DiscordAPIError && allowErrors.includes(error.code)) {
                return;
            } else {
                throw error;
            }
        }
    }

    public static async findNotifyChannel(guild: Guild): Promise<TextChannel | DMChannel> {
        // Prefer the public updates channel
        const publicUpdatesChannel = guild.publicUpdatesChannel;
        if (publicUpdatesChannel && PermissionUtils.canSend(publicUpdatesChannel, true)) {
            return publicUpdatesChannel;
        }

        // Prefer the system channel
        const systemChannel = guild.systemChannel;
        if (systemChannel && PermissionUtils.canSend(systemChannel, true)) {
            return systemChannel;
        }

        // Otherwise DM server owner
        const owner = await guild.fetchOwner();
        const dmChannel = await owner.createDM();
        return dmChannel;
    }
}
