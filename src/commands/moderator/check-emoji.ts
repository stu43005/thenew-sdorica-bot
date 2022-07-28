import {
    ChatInputCommandInteraction,
    GuildEmoji,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder
} from 'discord.js';
import admin from 'firebase-admin';
import moment from 'moment';
import { mergeRecordData } from '../../database/stat-collection.js';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { StringUtils } from '../../utils/string-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class CheckEmojiCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('check-emoji')
        .setDescription('顯示最不常使用的 30 個表符')
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageEmojisAndStickers').valueOf())
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = ['ManageEmojisAndStickers'];

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        const count = 30;
        if (!intr.guild) return;
        const guildId = intr.guild.id;

        const db = admin.firestore();
        const data: any = {
            emojis: {},
        };
        let day = moment();
        for (let i = 0; i < 4; i++) {
            day = day.subtract(7, 'days');
            const weekly = day.format('GGGG-[W]WW');
            const weeklyRef = db.collection('stat').doc(guildId).collection('weekly').doc(weekly);
            const weeklySnapshot = await weeklyRef.get();
            const weeklyData = weeklySnapshot.data() as any;
            if (weeklyData) {
                mergeRecordData(data, weeklyData, 'emojis');
                if (weeklyData['reactions']) {
                    if (!data['emojis']) data['emojis'] = {};
                    Object.keys(weeklyData['reactions']).forEach(key => {
                        data['emojis'][key] = (+data['emojis'][key] || 0) + +weeklyData['reactions'][key];
                    });
                }
            }
        }

        let data2: {
            count: number,
            emoji: GuildEmoji,
        }[] = [];
        intr.guild.emojis.cache.forEach((emoji) => {
            data2.push({
                count: data.emojis[emoji.id] || 0,
                emoji
            });
        });
        data2 = data2.sort((a, b) => b.count - a.count).slice(data2.length - count);

        const data3: string[] = data2.map(e => {
            return `${e.emoji.animated ? ':a' : ''}:${e.emoji.name}: ${e.count}`;
        });

        await InteractionUtils.send(intr, StringUtils.discordEscape(data3.join('\n')));
    }
}
