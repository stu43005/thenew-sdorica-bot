import {
    Channel,
    channelMention,
    codeBlock,
    EmbedBuilder,
    Guild,
    GuildMember,
    inlineCode,
    Message,
    roleMention,
    User,
    userMention,
} from 'discord.js';
import { Duration } from 'luxon';
import { LangCode } from '../enums/lang-code.js';
import { Language } from '../models/enum-helpers/language.js';

export class FormatUtils {
    public static roleMention(guild: Guild, discordId: string): string {
        if (discordId === '@here') {
            return discordId;
        }

        if (discordId === guild.id) {
            return '@everyone';
        }

        return roleMention(discordId);
    }

    public static channelMention(discordId: string): string {
        return channelMention(discordId);
    }

    public static userMention(discordId: string): string {
        return userMention(discordId);
    }

    public static inlineCode(content: string): string {
        return inlineCode(content.replaceAll('`', '\\`'));
    }

    public static codeBlock(content: string): string;
    public static codeBlock(language: string, content: string): string;
    public static codeBlock(language: string, content?: string): string {
        return typeof content === 'undefined'
            ? codeBlock(language.replaceAll('`', '\\`'))
            : codeBlock(language, content.replaceAll('`', '\\`'));
    }

    public static jsonBlock(obj: any): string {
        return this.codeBlock('json', JSON.stringify(obj, null, 2));
    }

    public static duration(milliseconds: number, langCode: LangCode): string {
        return Duration.fromObject(
            Object.fromEntries(
                Object.entries(
                    Duration.fromMillis(milliseconds, { locale: Language.locale(langCode) })
                        .shiftTo(
                            'year',
                            'quarter',
                            'month',
                            'week',
                            'day',
                            'hour',
                            'minute',
                            'second'
                        )
                        .toObject()
                ).filter(([_, value]) => !!value) // Remove units that are 0
            )
        ).toHuman({ maximumFractionDigits: 0 });
    }

    public static embedOriginUserData(
        user: User | GuildMember,
        embed?: EmbedBuilder
    ): EmbedBuilder {
        if (!(embed instanceof EmbedBuilder)) {
            embed = new EmbedBuilder(embed);
        }
        embed.setFooter({
            text: user instanceof GuildMember ? user.user.tag : user.tag,
            iconURL: user.displayAvatarURL(),
        });
        if (user instanceof GuildMember && user.displayColor != 0) {
            embed.setColor(user.displayColor);
        }
        return embed;
    }

    public static embedTheMessage(
        message: Message,
        contextChannel: Channel,
        embed?: EmbedBuilder
    ): EmbedBuilder {
        if (!(embed instanceof EmbedBuilder)) {
            embed = new EmbedBuilder(embed);
        }
        embed.setAuthor({
            name: message.author.tag,
            iconURL: message.author.displayAvatarURL(),
            url: message.url,
        });
        embed.setDescription(message.content);
        if (message.attachments && message.attachments.size > 0) {
            if (
                'nsfw' in message.channel &&
                message.channel.nsfw &&
                'nsfw' in contextChannel &&
                !contextChannel.nsfw
            ) {
                embed.addFields([
                    {
                        name: 'Attachments',
                        value: ':underage: **Quoted message belongs in NSFW channel.**',
                    },
                ]);
            } else if (
                message.attachments.size == 1 &&
                String(message.attachments.at(0)?.url).match(
                    /(.jpg|.jpeg|.png|.gif|.gifv|.webp|.bmp)$/i
                )
            ) {
                embed.setImage(message.attachments.at(0)?.url ?? '');
            } else {
                embed.addFields([
                    {
                        name: 'Attachments',
                        value: message.attachments
                            .map(attachment => `[${attachment.name}](${attachment.url})`)
                            .join('\n'),
                    },
                ]);
            }
        }
        embed.setTimestamp(message.createdAt);
        if (message.member && message.member.displayColor != 0) {
            embed.setColor(message.member.displayColor);
        }
        return embed;
    }
}
