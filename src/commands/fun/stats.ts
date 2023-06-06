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
        .addSubcommand(builder => builder.setName('messages').setDescription('Message stats.'))
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
            case 'messages':
                embed.setTitle(`${intr.guild.name} Messages stats`);
                embed.addFields([
                    ...(data.messages
                        ? [
                              {
                                  name: 'Total messages',
                                  value: this.numberFormat(data.messages),
                                  inline: true,
                              },
                          ]
                        : []),
                    ...(data.messagesByMember
                        ? [
                              {
                                  name: 'Active members',
                                  value: this.numberFormat(
                                      Object.keys(data.messagesByMember).length
                                  ),
                                  inline: true,
                              },
                              {
                                  name: 'Top message members',
                                  value:
                                      this.getTop(data.messagesByMember)
                                          .map(
                                              ([userId, messages], index) =>
                                                  `${index + 1}. ${userMention(
                                                      userId
                                                  )}: ${this.numberFormat(messages)}`
                                          )
                                          .join('\n') || 'No data.',
                              },
                          ]
                        : []),
                    ...(data.messagesByChannel
                        ? [
                              {
                                  name: 'Top message channels',
                                  value:
                                      this.getTop(data.messagesByChannel)
                                          .map(
                                              ([channelId, messages], index) =>
                                                  `${index + 1}. ${
                                                      intr.guild?.channels.resolve(channelId)
                                                          ? channelMention(channelId)
                                                          : `#${data.channelNames[channelId]}`
                                                  }: ${this.numberFormat(messages)}`
                                          )
                                          .join('\n') || 'No data.',
                              },
                          ]
                        : []),
                ]);
                break;
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

    private numberFormat(n: number): string {
        return new Intl.NumberFormat('en-US').format(n);
    }

    private getTop(obj: Record<string, number>, n: number = 3): [string, number][] {
        return Object.entries(obj)
            .sort(([, a], [, b]) => b - a)
            .slice(0, n);
    }
}
