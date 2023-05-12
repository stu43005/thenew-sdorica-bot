import { PermissionsString } from 'discord.js';
import { LangCode } from '../../enums/lang-code.js';
import { Lang } from '../../services/lang.js';

interface PermissionData {
    displayName(langCode: LangCode): string;
}

export class Permission {
    public static Data: {
        [key in PermissionsString]: PermissionData;
    } = {
        AddReactions: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.ADD_REACTIONS', langCode);
            },
        },
        Administrator: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.ADMINISTRATOR', langCode);
            },
        },
        AttachFiles: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.ATTACH_FILES', langCode);
            },
        },
        BanMembers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.BAN_MEMBERS', langCode);
            },
        },
        ChangeNickname: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.CHANGE_NICKNAME', langCode);
            },
        },
        Connect: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.CONNECT', langCode);
            },
        },
        CreateInstantInvite: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.CREATE_INSTANT_INVITE', langCode);
            },
        },
        CreatePrivateThreads: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.CREATE_PRIVATE_THREADS', langCode);
            },
        },
        CreatePublicThreads: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.CREATE_PUBLIC_THREADS', langCode);
            },
        },
        DeafenMembers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.DEAFEN_MEMBERS', langCode);
            },
        },
        EmbedLinks: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.EMBED_LINKS', langCode);
            },
        },
        KickMembers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.KICK_MEMBERS', langCode);
            },
        },
        ManageChannels: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_CHANNELS', langCode);
            },
        },
        ManageEmojisAndStickers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_EMOJIS_AND_STICKERS', langCode);
            },
        },
        ManageEvents: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_EVENTS', langCode);
            },
        },
        ManageGuild: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_GUILD', langCode);
            },
        },
        ManageMessages: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_MESSAGES', langCode);
            },
        },
        ManageNicknames: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_NICKNAMES', langCode);
            },
        },
        ManageRoles: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_ROLES', langCode);
            },
        },
        ManageThreads: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_THREADS', langCode);
            },
        },
        ManageWebhooks: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_WEBHOOKS', langCode);
            },
        },
        MentionEveryone: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MENTION_EVERYONE', langCode);
            },
        },
        ModerateMembers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MODERATE_MEMBERS', langCode);
            },
        },
        MoveMembers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MOVE_MEMBERS', langCode);
            },
        },
        MuteMembers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MUTE_MEMBERS', langCode);
            },
        },
        PrioritySpeaker: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.PRIORITY_SPEAKER', langCode);
            },
        },
        ReadMessageHistory: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.READ_MESSAGE_HISTORY', langCode);
            },
        },
        RequestToSpeak: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.REQUEST_TO_SPEAK', langCode);
            },
        },
        SendMessages: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.SEND_MESSAGES', langCode);
            },
        },
        SendMessagesInThreads: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.SEND_MESSAGES_IN_THREADS', langCode);
            },
        },
        SendTTSMessages: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.SEND_TTS_MESSAGES', langCode);
            },
        },
        Speak: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.SPEAK', langCode);
            },
        },
        UseEmbeddedActivities: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.START_EMBEDDED_ACTIVITIES', langCode);
            },
        },
        Stream: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.STREAM', langCode);
            },
        },
        UseApplicationCommands: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.USE_APPLICATION_COMMANDS', langCode);
            },
        },
        UseExternalEmojis: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.USE_EXTERNAL_EMOJIS', langCode);
            },
        },
        UseExternalStickers: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.USE_EXTERNAL_STICKERS', langCode);
            },
        },
        // UsePrivateThreads: {
        //     displayName(langCode: LangCode): string {
        //         return Lang.getRef('permissions.USE_PRIVATE_THREADS', langCode);
        //     },
        // },
        // UsePublicThreads: {
        //     displayName(langCode: LangCode): string {
        //         return Lang.getRef('permissions.USE_PUBLIC_THREADS', langCode);
        //     },
        // },
        UseVAD: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.USE_VAD', langCode);
            },
        },
        ViewAuditLog: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.VIEW_AUDIT_LOG', langCode);
            },
        },
        ViewChannel: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.VIEW_CHANNEL', langCode);
            },
        },
        ViewGuildInsights: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.VIEW_GUILD_INSIGHTS', langCode);
            },
        },
        ManageGuildExpressions: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.MANAGE_GUILD_EXPRESSIONS', langCode);
            },
        },
        ViewCreatorMonetizationAnalytics: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.VIEW_CREATOR_MONETIZATION_ANALYTICS', langCode);
            },
        },
        UseSoundboard: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.USE_SOUNDBOARD', langCode);
            },
        },
        UseExternalSounds: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.USE_EXTERNAL_SOUNDS', langCode);
            },
        },
        SendVoiceMessages: {
            displayName(langCode: LangCode): string {
                return Lang.getRef('permissions.SEND_VOICE_MESSAGES', langCode);
            },
        },
    };
}
