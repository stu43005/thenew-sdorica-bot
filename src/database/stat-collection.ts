import {
    Guild,
    Message,
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User,
} from 'discord.js';
import admin from 'firebase-admin';
import moment from 'moment';
import { Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { Logger } from '../services/logger.js';
import { RegexUtils } from '../utils/regex-utils.js';

export class StatCollection {
    private static guilds: { [guildId: string]: StatCollection } = {};

    public static fromGuild(guild: Guild): StatCollection {
        if (!this.guilds[guild.id]) {
            this.guilds[guild.id] = new StatCollection(guild);
        }
        return this.guilds[guild.id];
    }

    private temp: StatData;
    private update$ = new Subject<void>();

    constructor(private guild: Guild) {
        this.temp = {
            members: guild.memberCount,
            userNames: {},
            channelNames: {},
        };

        this.update$.pipe(auditTime(60 * 1000)).subscribe(() => {
            this.save();
        });

        this.update$.next();
    }

    async save(): Promise<void> {
        const temp = this.temp;
        this.newTemp();

        Logger.debug(`save stat ${this.guild.id}: ${JSON.stringify(temp)}`);
        const db = admin.firestore();
        const metaRef = db.collection('stat').doc(this.guild.id);
        const dateStr = moment().format('YYYY-MM-DD');
        const dailyRef = metaRef.collection('daily').doc(dateStr);
        const dailyDoc = await dailyRef.get();
        let daily = dailyDoc.data() as StatData;
        Logger.debug(`save stat ${this.guild.id}: get daily`);
        if (!dailyDoc.exists || !daily) {
            daily = temp;
        } else {
            mergeData(daily, temp);
        }
        await dailyRef.set(daily, { merge: true });
        Logger.debug(`save stat ${this.guild.id}: set daily`);
    }

    newTemp(): void {
        const prev = this.temp;
        this.temp = {
            members: prev.members,
            userNames: {},
            channelNames: {},
        };
    }

    memberChange(): void {
        if (this.temp.members != this.guild.memberCount) {
            this.temp.members = this.guild.memberCount;
            this.update$.next();
        }
    }

    addMessage(message: Message): void {
        if (!this.temp.messagesByMember) this.temp.messagesByMember = {};
        if (!this.temp.messagesByChannel) this.temp.messagesByChannel = {};
        if (!this.temp.messagesByMemberByChannel) this.temp.messagesByMemberByChannel = {};
        if (!this.temp.messagesByMemberByChannel[message.author.id])
            this.temp.messagesByMemberByChannel[message.author.id] = {};

        add(this.temp, 'messages');
        add(this.temp.messagesByMember, message.author.id);
        add(this.temp.messagesByMemberByChannel[message.author.id], message.channel.id);
        add(this.temp.messagesByChannel, message.channel.id);

        const emojis = RegexUtils.guildEmojis(message.content);
        emojis.forEach(emoji => {
            const guildEmoji = message.guild?.emojis.cache.find(e => e.id === emoji.id);
            if (!guildEmoji) return;

            if (!this.temp.emojis) this.temp.emojis = {};
            // if (!this.temp.emojisByMember) this.temp.emojisByMember = {};
            // if (!this.temp.emojisByMember[message.author.id])
            //     this.temp.emojisByMember[message.author.id] = {};

            if (emoji.id) {
                add(this.temp.emojis, emoji.id);
                // add(this.temp.emojisByMember[message.author.id], emoji.id);
            }
        });

        this.temp.userNames[message.author.id] = message.author.username;
        if ('name' in message.channel) {
            this.temp.channelNames[message.channel.id] = message.channel.name;
        }

        this.update$.next();
    }

    addReaction(
        messageReaction: MessageReaction | PartialMessageReaction,
        _user: User | PartialUser
    ): void {
        if (messageReaction.emoji.id) {
            if (!this.temp.reactions) this.temp.reactions = {};
            // if (!this.temp.reactionsByMember) this.temp.reactionsByMember = {};
            // if (!this.temp.reactionsByMember[user.id]) this.temp.reactionsByMember[user.id] = {};

            add(this.temp.reactions, messageReaction.emoji.id);
            // add(this.temp.reactionsByMember[user.id], messageReaction.emoji.id);

            this.update$.next();
        }
    }

    addMeme(message: Message, meme: string): void {
        if (!this.temp.memes) this.temp.memes = {};
        add(this.temp.memes, meme);

        this.update$.next();
    }
}

export function mergeData(base: StatData, temp: StatData): void {
    base.members = temp.members;

    if (temp.messages) base.messages = (base.messages || 0) + temp.messages;

    mergeRecordData(base, temp, 'messagesByMember');
    mergeDoubleRecordData(base, temp, 'messagesByMemberByChannel');
    mergeRecordData(base, temp, 'messagesByChannel');
    mergeRecordData(base, temp, 'emojis');
    // mergeDoubleRecordData(base, temp, 'emojisByMember');
    mergeRecordData(base, temp, 'reactions');
    // mergeDoubleRecordData(base, temp, 'reactionsByMember');
    mergeRecordData(base, temp, 'memes');

    base.channelNames ??= {};
    Object.keys(temp.channelNames ?? {}).forEach(key => {
        base.channelNames[key] = temp.channelNames[key];
    });
    base.userNames ??= {};
    Object.keys(temp.userNames ?? {}).forEach(key => {
        base.userNames[key] = temp.userNames[key];
    });
}

export function mergeRecordData(base: any, temp: any, type: string): void {
    if (temp[type]) {
        if (!base[type]) base[type] = {};
        Object.keys(temp[type]).forEach(key => {
            add(base[type], key, temp[type][key]);
        });
    }
}

export function mergeDoubleRecordData(base: any, temp: any, type: string): void {
    if (temp[type]) {
        if (!base[type]) base[type] = {};
        Object.keys(temp[type]).forEach(key => {
            mergeRecordData(base[type], temp[type], key);
        });
    }
}

function add(obj: any, key: string, value: number = 1): void {
    obj[key] = (+obj[key] || 0) + value;
}

export interface StatData {
    members?: number;

    messages?: number;
    messagesByMember?: Record<string, number>;
    messagesByMemberByChannel?: Record<string, Record<string, number>>;
    messagesByChannel?: Record<string, number>;
    emojis?: Record<string, number>;
    emojisByMember?: Record<string, Record<string, number>>;

    reactions?: Record<string, number>;
    reactionsByMember?: Record<string, Record<string, number>>;

    memes?: Record<string, number>;

    userNames: {
        [userId: string]: string;
    };
    channelNames: {
        [channelId: string]: string;
    };

    days?: string[];
}

/*

/stat/{guildId}
{
	userNames: {
		[userId: string]: string,
	},
	channelNames: {
		[channelId: string]: string,
	},
}

/stat/{guildId}/daily/{date}
{
	members: number,
	messages: number,
	messagesByMember: {
		[userId: string]: number,
	},
	messagesByChannel: {
		[channelId: string]: number,
	},
}

*/
