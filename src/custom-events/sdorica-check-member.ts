import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { ClientUtils } from '../utils/client-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
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
const verifiedRole = '622371686502891529';
const wrongAnswerRole = '1093881059701182554';

export class SdoricaCheckMember implements CustomEvent<Events.GuildMemberUpdate> {
    public readonly event = Events.GuildMemberUpdate;

    public async process(
        oldMember: GuildMember | PartialGuildMember,
        newMember: GuildMember
    ): Promise<void> {
        const oldRoles = Array.from(oldMember.roles.cache.keys());
        const newRoles = Array.from(newMember.roles.cache.keys());
        if (newMember.guild.id === '437330083976445953') {
            const matchedRoles = newRoles.filter(r => mee6Roles.includes(r));
            if (matchedRoles.length > 0 && !newMember.roles.cache.has(verifiedRole)) {
                await newMember.roles.add(verifiedRole);
            }

            if (newRoles.includes(wrongAnswerRole)) {
                await newMember.roles.remove(wrongAnswerRole);

                if (!oldRoles.includes(verifiedRole) && newMember.kickable) {
                    await newMember.kick('成員培訓回答錯誤');

                    const notifyChannel = await ClientUtils.findNotifyChannel(newMember.guild);
                    await MessageUtils.send(notifyChannel, {
                        content: `【培訓】成員 ${newMember.user.username} 回答錯誤`,
                    });
                }
            }
        }
        // for debug server
        if (newMember.guild.id === '543454386873958411') {
            console.log('oldRoles', oldRoles);
            console.log('newRoles', newRoles);
        }
    }
}
