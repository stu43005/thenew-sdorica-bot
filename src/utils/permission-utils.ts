import {
    Channel,
    DMChannel,
    GuildMember,
    PermissionResolvable,
    PermissionsBitField,
} from 'discord.js';

export class PermissionUtils {
    public static canSend(channel: Channel, embedLinks: boolean = false): boolean {
        if (channel instanceof DMChannel) {
            return true;
        } else if ('permissionsFor' in channel && channel.client.user) {
            const channelPerms = channel.permissionsFor(channel.client.user);
            if (!channelPerms) {
                // This can happen if the guild disconnected while a collector is running
                return false;
            }

            // VIEW_CHANNEL - Needed to view the channel
            // SEND_MESSAGES - Needed to send messages
            // EMBED_LINKS - Needed to send embedded links
            return channelPerms.has([
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                ...(embedLinks ? [PermissionsBitField.Flags.EmbedLinks] : []),
            ]);
        } else {
            return false;
        }
    }

    public static canMention(channel: Channel): boolean {
        if (channel instanceof DMChannel) {
            return true;
        } else if ('permissionsFor' in channel && channel.client.user) {
            const channelPerms = channel.permissionsFor(channel.client.user);
            if (!channelPerms) {
                // This can happen if the guild disconnected while a collector is running
                return false;
            }

            // VIEW_CHANNEL - Needed to view the channel
            // MENTION_EVERYONE - Needed to mention @everyone, @here, and all roles
            return channelPerms.has([
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.MentionEveryone,
            ]);
        } else {
            return false;
        }
    }

    public static canReact(channel: Channel, removeOthers: boolean = false): boolean {
        if (channel instanceof DMChannel) {
            return true;
        } else if ('permissionsFor' in channel && channel.client.user) {
            const channelPerms = channel.permissionsFor(channel.client.user);
            if (!channelPerms) {
                // This can happen if the guild disconnected while a collector is running
                return false;
            }

            // VIEW_CHANNEL - Needed to view the channel
            // ADD_REACTIONS - Needed to add new reactions to messages
            // READ_MESSAGE_HISTORY - Needed to add new reactions to messages
            //    https://discordjs.guide/popular-topics/permissions-extended.html#implicit-permissions
            // MANAGE_MESSAGES - Needed to remove others reactions
            return channelPerms.has([
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.AddReactions,
                PermissionsBitField.Flags.ReadMessageHistory,
                ...(removeOthers ? [PermissionsBitField.Flags.ManageMessages] : []),
            ]);
        } else {
            return false;
        }
    }

    public static canPin(channel: Channel, unpinOld: boolean = false): boolean {
        if (channel instanceof DMChannel) {
            return true;
        } else if ('permissionsFor' in channel && channel.client.user) {
            const channelPerms = channel.permissionsFor(channel.client.user);
            if (!channelPerms) {
                // This can happen if the guild disconnected while a collector is running
                return false;
            }

            // VIEW_CHANNEL - Needed to view the channel
            // MANAGE_MESSAGES - Needed to pin messages
            // READ_MESSAGE_HISTORY - Needed to find old pins to unpin
            return channelPerms.has([
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ManageMessages,
                ...(unpinOld ? [PermissionsBitField.Flags.ReadMessageHistory] : []),
            ]);
        } else {
            return false;
        }
    }

    public static canCreateThreads(channel: Channel, manageThreads: boolean = false): boolean {
        if (channel instanceof DMChannel) {
            return false;
        } else if ('permissionsFor' in channel && channel.client.user) {
            const channelPerms = channel.permissionsFor(channel.client.user);
            if (!channelPerms) {
                // This can happen if the guild disconnected while a collector is running
                return false;
            }

            // VIEW_CHANNEL - Needed to view the channel
            // CREATE_PUBLIC_THREADS - Needed to create public threads
            // MANAGE_THREADS - Needed to rename, delete, archive, unarchive, slow mode threads
            return channelPerms.has([
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.CreatePublicThreads,
                ...(manageThreads ? [PermissionsBitField.Flags.ManageThreads] : []),
            ]);
        } else {
            return false;
        }
    }

    public static canDeleteMessage(channel: Channel, deleteOld: boolean = false): boolean {
        if (channel instanceof DMChannel) {
            return false;
        } else if ('permissionsFor' in channel && channel.client.user) {
            const channelPerms = channel.permissionsFor(channel.client.user);
            if (!channelPerms) {
                // This can happen if the guild disconnected while a collector is running
                return false;
            }

            // VIEW_CHANNEL - Needed to view the channel
            // MANAGE_MESSAGES - Needed to delete messages
            // READ_MESSAGE_HISTORY - Needed to find old message to delete
            return channelPerms.has([
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ManageMessages,
                ...(deleteOld ? [PermissionsBitField.Flags.ReadMessageHistory] : []),
            ]);
        } else {
            return false;
        }
    }

    public static memberHasPermission(
        channel: Channel,
        member: GuildMember | null | undefined,
        permission: PermissionResolvable
    ): boolean {
        return (
            (member &&
                'permissionsFor' in channel &&
                channel.permissionsFor(member).has(permission)) ||
            false
        );
    }
}
