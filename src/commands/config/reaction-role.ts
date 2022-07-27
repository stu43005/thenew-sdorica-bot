import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message,
    NewsChannel,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
    TextChannel,
} from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { ClientUtils } from '../../utils/client-utils.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { MessageUtils } from '../../utils/message-utils.js';
import { RegexUtils } from '../../utils/regex-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class ReactionRoleCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('reaction-role')
        .setDescription('設定反應表情身分組')
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageGuild').valueOf())
        .addSubcommand(builder =>
            builder
                .setName('list')
                .setDescription('顯示反應表情清單')
                .addStringOption(option =>
                    option.setName('message-id').setDescription('僅顯示該訊息ID的設定')
                )
        )
        .addSubcommand(builder =>
            builder
                .setName('add')
                .setDescription('新增反應表情')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('訊息所在的頻道').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message-id').setDescription('訊息ID').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('emoji').setDescription('表情').setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role').setDescription('用戶組').setRequired(true)
                )
        )
        .addSubcommand(builder =>
            builder
                .setName('setmode')
                .setDescription('改變反應表情模式')
                .addStringOption(option =>
                    option.setName('message-id').setDescription('訊息ID').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('mode').setDescription('模式').setRequired(true).addChoices(
                        {
                            name: 'normal: 反應表情獲得用戶組，再點一次則刪除。',
                            value: 'normal',
                        },
                        {
                            name: 'unique: 一次只能取得訊息中的一個用戶組，自動消除舊的反應。',
                            value: 'unique',
                        },
                        {
                            name: 'verify: 只能取得用戶組，不能刪除用戶組，做出反應後會自動刪除該反應。',
                            value: 'verify',
                        },
                        {
                            name: 'drop: 用戶組只能刪除，不能取得。(點擊表情符號將會移除用戶組)',
                            value: 'drop',
                        },
                        {
                            name: 'reversed: 反應表情時刪除用戶組，刪除反應添加用戶組。',
                            value: 'reversed',
                        },
                        {
                            name: 'limit: 限制每位使用者可以從此訊息中獲得的用戶組數。',
                            value: 'limit',
                        },
                        {
                            name: 'binding: verify和unique的組合。只能選擇一個角色，而不能在兩個角色之間交換。',
                            value: 'binding',
                        }
                    )
                )
                .addIntegerOption(option =>
                    option.setName('limit').setDescription('limit模式需提供限制數量')
                )
        )
        .addSubcommand(builder =>
            builder
                .setName('remove')
                .setDescription('移除反應表情')
                .addChannelOption(option =>
                    option.setName('channel').setDescription('訊息所在的頻道').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('message-id').setDescription('訊息ID').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('emoji').setDescription('僅刪除符合表情的設定')
                )
                .addRoleOption(option =>
                    option.setName('role').setDescription('僅刪除符合該用戶組的設定')
                )
        )
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = ['ManageGuild'];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild || !data.guild) return;

        switch (intr.options.getSubcommand()) {
            case 'list': {
                const messageId = intr.options.getString('message-id');
                await this.list(intr, data, messageId);
                break;
            }
            case 'add': {
                const channel = intr.options.getChannel('channel', true);
                const textChannel = await ClientUtils.findTextChannel(intr.guild, channel.id);
                if (!textChannel) {
                    await InteractionUtils.send(intr, 'Error: 錯誤的頻道或不是文字頻道。');
                    return;
                }
                const messageId = RegexUtils.discordId(intr.options.getString('message-id', true));
                if (!messageId) {
                    await InteractionUtils.send(intr, `Error: 訊息ID格式錯誤。`);
                    return;
                }
                const message = await textChannel.messages.fetch(messageId);
                if (!message) {
                    await InteractionUtils.send(
                        intr,
                        `Error: 找不到目標訊息ID: ${FormatUtils.inlineCode(messageId)}。`
                    );
                    return;
                }
                const emoji = intr.options.getString('emoji', true);
                let emojiId = RegexUtils.emoji(emoji)[0];
                if (!emojiId) {
                    const guildEmoji = await ClientUtils.findGuildEmoji(intr.guild, emoji);
                    if (guildEmoji) {
                        emojiId = guildEmoji.id;
                    }
                }
                if (!emojiId) {
                    await InteractionUtils.send(
                        intr,
                        `Error: 無法解析表情符號: ${FormatUtils.inlineCode(emoji)}。`
                    );
                    return;
                }
                const role = intr.options.getRole('role', true);
                await this.add(intr, data, textChannel, message, emojiId, role.id);
                break;
            }
            case 'setmode': {
                const messageId = intr.options.getString('message-id', true);
                const mode = intr.options.getString('mode', true) as ReactionRoleType;
                let limit = 0;
                if (mode === ReactionRoleType.LIMIT) {
                    limit = intr.options.getNumber('limit') ?? 0;
                    if (limit < 1) {
                        await InteractionUtils.send(intr, `Error: limit模式需提供限制數量。`);
                        return;
                    }
                }
                await this.setMode(intr, data, messageId, mode, limit);
                break;
            }
            case 'unique': {
                const messageId = intr.options.getString('message-id', true);
                await this.setMode(intr, data, messageId, ReactionRoleType.UNIQUE);
                break;
            }
            case 'remove': {
                const channel = intr.options.getChannel('channel', true);
                const textChannel = await ClientUtils.findTextChannel(intr.guild, channel.id);
                if (!textChannel) {
                    await InteractionUtils.send(intr, 'Error: 錯誤的頻道或不是文字頻道。');
                    return;
                }
                const messageId = RegexUtils.discordId(intr.options.getString('message-id', true));
                if (!messageId) {
                    await InteractionUtils.send(intr, `Error: 訊息ID格式錯誤。`);
                    return;
                }
                const message = await textChannel.messages.fetch(messageId);
                if (!message) {
                    await InteractionUtils.send(
                        intr,
                        `Error: 找不到目標訊息ID: ${FormatUtils.inlineCode(messageId)}。`
                    );
                    return;
                }
                const emoji = intr.options.getString('emoji');
                let emojiId: string | null = null;
                if (emoji) {
                    emojiId = RegexUtils.emoji(emoji)[0];
                    if (!emojiId) {
                        const guildEmoji = await ClientUtils.findGuildEmoji(intr.guild, emoji);
                        if (guildEmoji) {
                            emojiId = guildEmoji.id;
                        }
                    }
                    if (!emojiId) {
                        await InteractionUtils.send(
                            intr,
                            `Error: 無法解析表情符號: ${FormatUtils.inlineCode(emoji)}。`
                        );
                        return;
                    }
                }
                const role = intr.options.getRole('role');
                await this.remove(intr, data, message, emojiId, role?.id);
                break;
            }
        }
    }

    private async list(
        intr: ChatInputCommandInteraction,
        data: EventData,
        messageId: string | null
    ): Promise<void> {
        const reactionRoles: ReactionRole[] = data.guild?.reactionRoles ?? [];
        const rrs = reactionRoles.filter(
            rr => (!messageId || rr.messageId == messageId) && rr.emojis.length
        );
        if (rrs.length === 0) {
            await InteractionUtils.send(intr, 'You do not have any reaction roles.');
            return;
        }

        const embed = new EmbedBuilder();
        embed.setTitle('Reaction roles');
        embed.addFields(
            rrs.map(rr => ({
                name: rr.messageId,
                value: rr.emojis
                    .map(rrEmoji => {
                        const emoji = intr.guild?.emojis.resolve(rrEmoji.emoji);
                        const role = intr.guild?.roles.resolve(rrEmoji.roleId);
                        return `${emoji ?? rrEmoji.emoji}: ${role ?? rrEmoji.roleId}`;
                    })
                    .join('\n'),
            }))
        );
        await InteractionUtils.send(intr, embed);
    }

    private async add(
        intr: ChatInputCommandInteraction,
        data: EventData,
        channel: NewsChannel | TextChannel,
        message: Message,
        emojiId: string,
        roleId: string
    ): Promise<void> {
        if (await addReactionRole(data, message, emojiId, roleId)) {
            await InteractionUtils.send(intr, 'succeeded');
        } else {
            await InteractionUtils.send(intr, 'failed');
        }
    }

    private async setMode(
        intr: ChatInputCommandInteraction,
        data: EventData,
        messageId: string,
        type: ReactionRoleType,
        limit: number = 0
    ): Promise<void> {
        if (await setReactionRoleMode(data, messageId, type, limit)) {
            await InteractionUtils.send(intr, 'succeeded');
        } else {
            await InteractionUtils.send(intr, 'failed');
        }
    }

    private async remove(
        intr: ChatInputCommandInteraction,
        data: EventData,
        message: Message,
        emojiId: string | null,
        roleId: string | undefined
    ): Promise<void> {
        if (await removeReactionRole(data, message, emojiId, roleId)) {
            await InteractionUtils.send(intr, 'succeeded');
        } else {
            await InteractionUtils.send(intr, 'failed');
        }
    }
}

async function addReactionRole(
    data: EventData,
    message: Message,
    emoji: string,
    roleId: string
): Promise<boolean> {
    if (!data.guild) return false;
    const reactionRoles: ReactionRole[] = data.guild.reactionRoles ?? [];
    let rr = reactionRoles.find(rr => rr.messageId == message.id);
    if (!rr) {
        rr = {
            channelId: message.channel.id,
            messageId: message.id,
            emojis: [],
            type: ReactionRoleType.NORMAL,
            limit: 0,
        };
        reactionRoles.push(rr);
    }
    const rrEmoji = rr.emojis.find(emo => emo.emoji == emoji);
    if (rrEmoji) {
        return false;
    }
    rr.emojis.push({
        emoji: emoji,
        roleId: roleId,
    });
    await MessageUtils.react(message, emoji);
    Logger.debug(`[addReactionRole] message: ${message.id}, emoji: ${emoji}, role: ${roleId}`);
    await data.guild.update();
    return true;
}

async function setReactionRoleMode(
    data: EventData,
    messageId: string,
    mode: ReactionRoleType,
    limit: number = 0
): Promise<boolean> {
    if (!data.guild) return false;
    const reactionRoles: ReactionRole[] = data.guild.reactionRoles ?? [];
    const rr = reactionRoles.find(rr => rr.messageId == messageId);
    if (!rr) {
        return false;
    }
    rr.type = mode;
    rr.limit = limit;
    Logger.debug(`[setReactionRoleMode] message: ${messageId}, mode: ${mode}, limit: ${limit}`);
    await data.guild.update();
    return true;
}

async function removeReactionRole(
    data: EventData,
    message: Message,
    emojiId: string | null,
    roleId: string | undefined
): Promise<boolean> {
    if (!data.guild) return false;
    const reactionRoles: ReactionRole[] = data.guild.reactionRoles ?? [];
    const rrIndex = reactionRoles.findIndex(rr => rr.messageId == message.id);
    const rr = reactionRoles[rrIndex];
    if (!rr) return false;

    const rrEmojis = rr.emojis
        .filter(emo => !emojiId || emo.emoji == emojiId)
        .filter(emo => !roleId || emo.roleId == roleId);
    if (!rrEmojis.length) return false;

    for (const rrEmoji of rrEmojis) {
        const rrEmojiIndex = rr.emojis.indexOf(rrEmoji);
        if (rrEmojiIndex > -1) {
            rr.emojis.splice(rrEmojiIndex, 1);
            await MessageUtils.unreact(message, rrEmoji.emoji);
            Logger.debug(
                `[removeReactionRole] message: ${message.id}, emoji: ${rrEmoji.emoji}, role: ${rrEmoji.roleId}`
            );
        }
    }
    if (rr.emojis.length === 0) {
        reactionRoles.splice(rrIndex, 1);
    }

    await data.guild.update();
    return true;
}

export interface ReactionRole {
    channelId: string;
    messageId: string;
    emojis: ReactionRoleEmoji[];
    type: ReactionRoleType;
    limit: number;
}

export interface ReactionRoleEmoji {
    emoji: string;
    roleId: string;
}

export enum ReactionRoleType {
    /**
     * Hands out roles when you click on them, does what you'd expect
     *
     * 反應表情獲得用戶組，再點一次則刪除
     */
    NORMAL = 'normal',
    /**
     * Only lets one role from the message be picked up at once
     *
     * 一次只能取得訊息中的一個用戶組，
     * 自動消除舊的反應
     */
    UNIQUE = 'unique',
    /**
     * Roles can only be picked up, not removed
     *
     * 只能取得用戶組，不能刪除用戶組，
     * 做出反應後會自動刪除該反應
     *
     * [add only]
     */
    VERIFY = 'verify',
    /**
     * Roles can only be removed, not picked up
     *
     * 用戶組只能刪除，不能取得
     * (點擊表情符號將會移除用戶組)
     *
     * [add only]
     */
    DROP = 'drop',
    /**
     * Adding a reaction removes the role, removing the reaction adds a role
     *
     * 添加反應刪除用戶組，刪除反應添加用戶組
     */
    REVERSED = 'reversed',
    /**
     * Limits the total number of roles one can pick up from this message
     *
     * 限制可以從此訊息中獲得的用戶組總數
     */
    LIMIT = 'limit',
    /**
     * You can only choose one role and you can not swap between roles
     *
     * verify和unique的組合。
     *
     * 只能選擇一個角色，而不能在兩個角色之間交換
     *
     * [add only]
     */
    BINDING = 'binding',
    // TEMP = 'temp',
}
