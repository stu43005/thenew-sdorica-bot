import {
    channelMention,
    ChatInputCommandInteraction,
    EmbedBuilder,
    formatEmoji,
    PermissionsString,
    SlashCommandBuilder,
    userMention,
} from 'discord.js';
import moment from 'moment';
import { AnalyticsStatJob } from '../../jobs/analytics-stat.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class StatsCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Server stats.')
        .addSubcommand(builder =>
            builder
                .setName('messages')
                .setDescription('Message stats.')
                .addUserOption(option =>
                    option.setName('by-member').setDescription('Message stats for specific member')
                )
                .addChannelOption(option =>
                    option
                        .setName('by-channel')
                        .setDescription('Message stats for specific channel')
                )
        )
        .addSubcommand(builder =>
            builder
                .setName('emojis')
                .setDescription('Emoji stats.')
                .addBooleanOption(option =>
                    option.setName('show-least').setDescription('Show least used emojis')
                )
        )
        .setDMPermission(false)
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        if (!intr.guild) return;

        const data = await AnalyticsStatJob.calc(intr.guild.id, 'last30days', moment());

        const embed = new EmbedBuilder();
        switch (intr.options.getSubcommand()) {
            case 'messages': {
                const byMember = intr.options.getUser('by-member');
                const byChannel = intr.options.getChannel('by-channel');
                embed.setTitle(`${intr.guild.name} Messages stats`);
                if (byMember) {
                    embed.addFields([
                        {
                            name: 'Only show message stats for the following member:',
                            value: `${userMention(byMember.id)}`,
                        },
                        {
                            name: 'Total messages',
                            value: this.numberFormat(data.messagesByMember?.[byMember.id]),
                            inline: true,
                        },
                        {
                            name: 'Top message channels',
                            value: this.getTop(data.messagesByMemberByChannel?.[byMember.id], id =>
                                intr.guild?.channels.resolve(id)
                                    ? channelMention(id)
                                    : `#${data.channelNames[id]}`
                            ),
                        },
                        ...(byChannel
                            ? [
                                  {
                                      name: 'Specific channel',
                                      value: `${channelMention(byChannel.id)}: ${this.numberFormat(
                                          data.messagesByMemberByChannel?.[byMember.id]?.[
                                              byChannel.id
                                          ]
                                      )}`,
                                  },
                              ]
                            : []),
                    ]);
                } else if (byChannel) {
                    const messagesByMember = data.messagesByMemberByChannel
                        ? Object.entries(data.messagesByMemberByChannel)
                              .map<[string, number]>(([userId, messagesByChannel]) => [
                                  userId,
                                  messagesByChannel[byChannel.id],
                              ])
                              .filter(([, count]) => count > 0)
                        : [];
                    embed.addFields([
                        {
                            name: 'Only show message stats for the following channel:',
                            value: `${channelMention(byChannel.id)}`,
                        },
                        {
                            name: 'Total messages',
                            value: this.numberFormat(data.messagesByChannel?.[byChannel.id]),
                            inline: true,
                        },
                        {
                            name: 'Active members',
                            value: data.messagesByMemberByChannel
                                ? this.numberFormat(messagesByMember.length)
                                : 'No data.',
                            inline: true,
                        },
                        {
                            name: 'Top message members',
                            value: this.getTop(Object.fromEntries(messagesByMember), id =>
                                userMention(id)
                            ),
                        },
                    ]);
                } else {
                    embed.addFields([
                        {
                            name: 'Total messages',
                            value: this.numberFormat(data.messages),
                            inline: true,
                        },
                        {
                            name: 'Active members',
                            value: data.messagesByMember
                                ? this.numberFormat(Object.keys(data.messagesByMember).length)
                                : 'No data.',
                            inline: true,
                        },
                        {
                            name: 'Top message members',
                            value: this.getTop(data.messagesByMember, id => userMention(id)),
                        },
                        {
                            name: 'Top message channels',
                            value: this.getTop(data.messagesByChannel, id =>
                                intr.guild?.channels.resolve(id)
                                    ? channelMention(id)
                                    : `#${data.channelNames[id]}`
                            ),
                        },
                    ]);
                }
                break;
            }
            case 'emojis': {
                const guildEmojis = await intr.guild.emojis.fetch();
                const showLeast = intr.options.getBoolean('show-least');
                embed.setTitle(`${intr.guild.name} Emoji stats`);
                if (!data.emojis) {
                    embed.setDescription('No data.');
                } else if (!showLeast) {
                    embed.addFields([
                        {
                            name: 'Most used emojis',
                            value:
                                Object.entries(data.emojis)
                                    .filter(([emojiId]) => guildEmojis.has(emojiId))
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 10)
                                    .map(
                                        ([emojiId, count], index) =>
                                            `${index + 1}. ${formatEmoji(
                                                emojiId,
                                                guildEmojis.get(emojiId)?.animated ?? false
                                            )}: ${this.numberFormat(count)}`
                                    )
                                    .join('\n') || 'No data.',
                        },
                    ]);
                } else {
                    embed.addFields([
                        {
                            name: 'Least used emojis',
                            value:
                                guildEmojis
                                    .map(emoji => ({
                                        emoji,
                                        count:
                                            (data.emojis?.[emoji.id] ?? 0) +
                                            (data.reactions?.[emoji.id] ?? 0),
                                    }))
                                    .sort((a, b) => a.count - b.count)
                                    .slice(0, 10)
                                    .map(
                                        ({ emoji, count }, index) =>
                                            `${index + 1}. ${formatEmoji(
                                                emoji.id,
                                                emoji.animated ?? false
                                            )}: ${this.numberFormat(count)}`
                                    )
                                    .join('\n') || 'No data.',
                        },
                    ]);
                }
                break;
            }
        }
        embed.setFooter({
            text: 'Last 30 days',
        });
        await InteractionUtils.send(intr, embed);
    }

    private numberFormat(n: number | undefined): string {
        return typeof n !== 'undefined' ? new Intl.NumberFormat('en-US').format(n) : 'No data.';
    }

    private getTop(
        obj: Record<string, number> | undefined,
        idFormator: (id: string) => string,
        n: number = 3
    ): string {
        if (!obj) {
            return 'No data.';
        }
        return (
            Object.entries(obj)
                .sort(([, a], [, b]) => b - a)
                .slice(0, n)
                .map(
                    ([id, count], index) =>
                        `${index + 1}. ${idFormator(id)}: ${this.numberFormat(count)}`
                )
                .join('\n') || 'No data.'
        );
    }
}
