import {
    Attachment,
    BaseManager,
    Collection,
    Guild,
    GuildMember,
    Message,
    TextBasedChannel,
    User,
} from 'discord.js';
import { Except, Jsonify } from 'type-fest';

export class SerializationUtils {
    public static serializationMessage(message: Message): SerializationMessage {
        return Object.assign(message.toJSON() as SerializationMessage, {
            url: message.url,
            attachments: [...message.attachments.values()].map(a =>
                this.serializationAttachment(a)
            ),
            author: this.serializationUser(message.author, true),
            channel: this.serializationTextBasedChannel(message.channel, true),
            guild: message.guild ? this.serializationGuild(message.guild, true) : null,
            member: message.member ? this.serializationGuildMember(message.member) : null,
        });
    }

    public static serializationAttachment(attachment: Attachment): SerializationAttachment {
        return Object.assign(attachment.toJSON() as SerializationAttachment, {
            spoiler: attachment.spoiler,
        });
    }

    public static serializationUser(user: User, simple: true): Simplification<SerializationUser>;
    public static serializationUser(user: User, simple?: false): SerializationUser;
    public static serializationUser(user: User, simple: boolean = false): SerializationUser {
        const json = user.toJSON() as SerializationUser;
        if (simple) return this.processSimplification(json);
        return json;
    }

    public static serializationGuildMember(
        member: GuildMember,
        simple: true
    ): Simplification<SerializationGuildMember>;
    public static serializationGuildMember(
        member: GuildMember,
        simple?: false
    ): SerializationGuildMember;
    public static serializationGuildMember(
        member: GuildMember,
        simple: boolean = false
    ): SerializationGuildMember {
        const json = Object.assign(member.toJSON() as SerializationGuildMember, {
            displayColor: member.displayColor,
            displayHexColor: member.displayHexColor,
        });
        if (simple) return this.processSimplification(json);
        return json;
    }

    public static serializationTextBasedChannel(
        channel: TextBasedChannel,
        simple: true
    ): Simplification<SerializationTextBasedChannel>;
    public static serializationTextBasedChannel(
        channel: TextBasedChannel,
        simple?: false
    ): SerializationTextBasedChannel;
    public static serializationTextBasedChannel(
        channel: TextBasedChannel,
        simple: boolean = false
    ): SerializationTextBasedChannel {
        const json = channel.toJSON() as SerializationTextBasedChannel;
        if (simple) return this.processSimplification(json);
        return json;
    }

    public static serializationGuild(
        guild: Guild,
        simple: true
    ): Simplification<SerializationGuild>;
    public static serializationGuild(guild: Guild, simple?: false): SerializationGuild;
    public static serializationGuild(guild: Guild, simple: boolean = false): SerializationGuild {
        const json = guild.toJSON() as SerializationGuild;
        if (simple) return this.processSimplification(json);
        return json;
    }

    private static processSimplification<T extends object>(data: T): Simplification<T> {
        return Object.fromEntries(
            Object.entries(data).filter(([, v]) => !Array.isArray(v) && v !== null)
        ) as Simplification<T>;
    }
}

export type SerializationMessage = Jsonify<
    Except<
        TransformCollection<FilterManagerKeys<Message>>,
        | 'toJSON'
        | 'client'
        | 'bulkDeletable'
        | 'createdAt'
        | 'crosspostable'
        | 'deletable'
        | 'editable'
        | 'editedAt'
        | 'guild'
        | 'hasThread'
        | 'member'
        | 'partial'
        | 'pinnable'
        | 'thread'
        | 'groupActivityApplication'
        | 'attachments'
    >
> & {
    attachments: SerializationAttachment[];
    author: Simplification<SerializationUser>;
    channel: Simplification<SerializationTextBasedChannel>;
    guild: Simplification<SerializationGuild>;
    member: SerializationGuildMember;
};

export type SerializationAttachment = Jsonify<Except<Attachment, 'toJSON'>>;

export type SerializationUser = Jsonify<
    Except<
        TransformCollection<FilterManagerKeys<User>>,
        'toJSON' | 'client' | 'partial' | 'createdAt' | 'dmChannel' | 'partial'
    >
> & {
    avatarURL: string;
    displayAvatarURL: string;
    bannerURL?: string;
};

export type SerializationGuildMember = Jsonify<
    Except<
        TransformCollection<FilterManagerKeys<GuildMember>>,
        | 'toJSON'
        | 'client'
        | 'bannable'
        | 'dmChannel'
        | 'id'
        | 'communicationDisabledUntil'
        | 'joinedAt'
        | 'kickable'
        | 'manageable'
        | 'moderatable'
        | 'partial'
        | 'permissions'
        | 'premiumSince'
        | 'presence'
        | 'voice'
        | 'user'
        | 'guild'
    >
> & {
    avatarURL: string;
    displayAvatarURL: string;
    displayColor: GuildMember['displayColor'];
    displayHexColor: GuildMember['displayHexColor'];
};

export type SerializationTextBasedChannel = Jsonify<
    Except<
        TransformCollection<FilterManagerKeys<TextBasedChannel>>,
        'toJSON' | 'client' | 'partial' | 'createdAt' | 'lastMessage'
    >
>;

export type SerializationGuild = Jsonify<
    Except<
        TransformCollection<FilterManagerKeys<Guild>>,
        | 'toJSON'
        | 'client'
        | 'createdAt'
        | 'afkChannel'
        | 'joinedAt'
        | 'publicUpdatesChannel'
        | 'rulesChannel'
        | 'shard'
        | 'systemChannel'
        | 'voiceAdapterCreator'
        | 'widgetChannel'
        | 'maximumBitrate'
        | 'partnered'
        | 'verified'
        | 'available'
    >
> & {
    iconURL: string | null;
    splashURL: string | null;
    discoverySplashURL: string | null;
    bannerURL: string | null;
};

type FilterManagerKeys<T extends object> = {
    [Key in keyof T]: T[Key] extends BaseManager ? never : T[Key];
};

type TransformCollection<T extends object> = {
    [Key in keyof T]: T[Key] extends Collection<infer CKey, any> ? CKey[] : T[Key];
};

type Simplification<T extends object> = {
    [Key in keyof T]: T[Key] extends any[] ? never : T[Key];
};
