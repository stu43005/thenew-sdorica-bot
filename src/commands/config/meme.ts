import {
    ChatInputCommandInteraction,
    codeBlock,
    EmbedBuilder,
    GuildMember,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
    User,
} from 'discord.js';
import * as crypto from 'node:crypto';
import { EventData } from '../../models/event-data.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class MemeCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('meme')
        .setDescription('編輯梗圖')
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageGuild').valueOf())
        .addSubcommand(builder => builder.setName('list').setDescription('列出梗圖清單'))
        .addSubcommand(builder =>
            builder
                .setName('add')
                .setDescription('新增一則梗圖')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('關鍵字匹配類型')
                        .setRequired(true)
                        .addChoices(
                            {
                                name: 'normal',
                                value: 'normal',
                            },
                            {
                                name: 'strict',
                                value: 'strict',
                            },
                            {
                                name: 'exact',
                                value: 'exact',
                            },
                            {
                                name: 'startswith',
                                value: 'startswith',
                            },
                            {
                                name: 'endswith',
                                value: 'endswith',
                            }
                        )
                )
                .addStringOption(option =>
                    option.setName('keyword').setDescription('關鍵字').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('url').setDescription('圖片網址').setRequired(true)
                )
        )
        .addSubcommand(builder =>
            builder
                .setName('remove')
                .setDescription('刪除一則梗圖')
                .addStringOption(option =>
                    option.setName('keyword').setDescription('關鍵字').setRequired(true)
                )
                .addStringOption(option => option.setName('url').setDescription('圖片網址'))
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
                const memes: MemeItem[] = data.guild.memes ?? [];
                if (memes.length) {
                    await InteractionUtils.send(
                        intr,
                        codeBlock([...new Set(memes.map(meme => meme.keyword))].join('\n'))
                    );
                } else {
                    await InteractionUtils.send(intr, `尚無任何梗圖。`);
                }
                break;
            }
            case 'add': {
                const type = intr.options.getString('type', true);
                const keyword = intr.options.getString('keyword', true);
                const url = intr.options.getString('url', true);

                const matchtype = getMatchType(type);
                if (matchtype) {
                    const memes: MemeItem[] = data.guild.memes ?? [];
                    const newitem: MemeItem = {
                        uuid: crypto.randomUUID(),
                        keyword,
                        url,
                        matchtype,
                    };
                    memes.push(newitem);
                    data.guild.memes = memes;
                    await data.guild.update();

                    const member = await InteractionUtils.getMemberOrUser(intr);
                    await InteractionUtils.send(intr, {
                        content: 'Meme added. Preview:',
                        embeds: [getMemeEmbed(member, newitem)],
                    });
                }
                break;
            }
            case 'remove': {
                const keyword = intr.options.getString('keyword', true);
                const url = intr.options.getString('url');

                const memes: MemeItem[] = data.guild.memes ?? [];
                const itemIndex = memes.findIndex(m => m.keyword === keyword && m.url === url);
                if (itemIndex !== -1) {
                    memes.splice(itemIndex, 1);
                    await data.guild.update();
                    await InteractionUtils.send(intr, `Meme removed.`);
                } else {
                    await InteractionUtils.send(intr, `Meme not found.`);
                }
                break;
            }
        }
    }
}

function regexpEscape(str: string): string {
    return str.replace(/(\[|\\|\^|\$|\.|\||\?|\*|\+|\(|\))/g, '\\$1');
}

export function getMatchRegexp(item: MemeItem): RegExp | undefined {
    switch (item.matchtype) {
        case MatchType.Normal:
            return new RegExp(regexpEscape(item.keyword), 'i');
        case MatchType.Strict:
            return new RegExp(
                `(^|$|[\\s.,:\u3002]+)${regexpEscape(item.keyword)}(^|$|[\\s.,:\u3002]+)`,
                'i'
            );
        case MatchType.Exact:
            return new RegExp(`^${regexpEscape(item.keyword)}$`, 'i');
        case MatchType.StartsWith:
            return new RegExp(`^${regexpEscape(item.keyword)}`, 'i');
        case MatchType.EndsWith:
            return new RegExp(`${regexpEscape(item.keyword)}$`, 'i');
    }
}

export function getMatchType(str: string): MatchType | null {
    switch (String(str).toLowerCase()) {
        case 'add':
        case 'create':
        case 'n':
        case 'normal':
            return MatchType.Normal;
        case 's':
        case 'strict':
            return MatchType.Strict;
        case 'e':
        case 'exact':
            return MatchType.Exact;
        case 'sw':
        case 'startswith':
            return MatchType.StartsWith;
        case 'ew':
        case 'endswith':
            return MatchType.EndsWith;
        case 'remove':
        case 'delete':
            return MatchType.Remove;
    }
    return null;
}

export function getMemeEmbed(user: User | GuildMember, item: MemeItem): EmbedBuilder {
    const embed = new EmbedBuilder();
    embed.setTitle(item.keyword);
    embed.setImage(item.url);
    return FormatUtils.embedOriginUserData(user, embed);
}

export function metchMeme(
    memes: MemeItem[],
    content: string,
    strict: boolean = false
): MemeItem | undefined {
    const matches: MemeItem[] = [];
    for (let i = 0; i < memes.length; i++) {
        const item = memes[i];
        if (strict) {
            if (item.keyword === content) {
                matches.push(item);
            }
        } else {
            const reg = getMatchRegexp(item);
            if (reg && content.match(reg)) {
                matches.push(item);
            }
        }
    }

    if (matches.length) {
        const index = crypto.randomInt(matches.length);
        return matches[index];
    }
}

export interface MemeItem {
    uuid: string;
    keyword: string;
    matchtype: MatchType;
    url: string;
}

export enum MatchType {
    Normal = 'normal',
    Strict = 'strict',
    Exact = 'exact',
    StartsWith = 'startswith',
    EndsWith = 'endswith',
    Remove = 'remove',
}
