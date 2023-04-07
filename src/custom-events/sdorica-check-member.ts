import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { CustomEvent } from './custom-event.js';

const mee6Roles = [
    '600722580554645512',
    '563071305860251658',
    '528452576786776084',
    '510500081242341376',
    '491245761703444480',
    '480380943400435728',
    '468212645074436097',
    '472745958866944000',
    '467673070392573962',
    '458648914250170373',
    '458648552197849088',
    '458645463810441228',
    '458476983412588577',
    '457518374688129044',
    '458792329784983572',
];
const assignRole = '622371686502891529';
const wrongAnswerRole = '1093881059701182554';

export class SdoricaCheckMember implements CustomEvent<Events.GuildMemberUpdate> {
    public readonly event = Events.GuildMemberUpdate;

    public async process(
        oldMember: GuildMember | PartialGuildMember,
        newMember: GuildMember
    ): Promise<void> {
        if (newMember.guild.id === '437330083976445953') {
            const ownRoles = Array.from(newMember.roles.cache.keys());

            const matchedRoles = ownRoles.filter(r => mee6Roles.includes(r));
            if (matchedRoles.length > 0 && !newMember.roles.cache.has(assignRole)) {
                await newMember.roles.add(assignRole);
            }

            if (ownRoles.includes(wrongAnswerRole) && newMember.kickable) {
                await newMember.kick('成員培訓回答錯誤');
            }
        }
    }
}
