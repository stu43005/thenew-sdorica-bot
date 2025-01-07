import { Message, MessageReferenceType, PartialMessage, type MessageSnapshot } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import urlRegex from 'url-regex-safe';
import { EventData } from '../models/event-data.js';
import { Logger } from '../services/logger.js';
import { FormatUtils } from '../utils/format-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { Trigger } from './trigger.js';

const bannedDomains: (string | RegExp)[] = [
    // /^[a-z]{2}twitter\.com$/,
    // /\.fxtwitter\.com$/,
    'kocpc.blogspot.com',
    'kocpc.com.tw',
    'kocpc.tumblr.com',
    'twitter64.com',
];

export class FilterUrlTrigger implements Trigger {
    public requireGuild = false;

    private cooldown = new RateLimiter(1, 60 * 1000);

    public triggered(msg: Message): boolean {
        // only sdorica server
        if (msg.guildId !== '437330083976445953') return false;

        if (!PermissionUtils.canDeleteMessage(msg.channel)) return false;

        if (this.checkMessage(msg)) {
            return true;
        }

        if (msg.reference?.type === MessageReferenceType.Forward) {
            for (const [, snapshot] of msg.messageSnapshots) {
                if (this.checkMessage(snapshot)) {
                    return true;
                }
            }
        }

        return false;
    }

    private checkMessage(msg: Message | MessageSnapshot): boolean {
        for (const [, attach] of msg.attachments) {
            if (this.filterUrl(attach.url, true)) {
                return true;
            }
        }
        return this.filterUrl(msg.content);
    }

    private filterUrl(content: string, exact: boolean = false): boolean {
        const matched = content.match(urlRegex({ exact }));
        if (matched) {
            for (const url of matched) {
                if (url.endsWith('.webm')) {
                    return true;
                }
                try {
                    const uri = new URL(url);
                    if (
                        bannedDomains.find(domain => {
                            if (typeof domain === 'string') {
                                return (
                                    uri.hostname === domain || uri.hostname.endsWith(`.${domain}`)
                                );
                            }
                            return domain.test(uri.hostname);
                        })
                    ) {
                        return true;
                    }
                } catch (error) {
                    // ignore
                }
            }
        }
        return false;
    }

    public async execute(msg: Message, _data: EventData): Promise<void> {
        if (this.cooldown.take(msg.id)) {
            return;
        }
        Logger.debug(`Delete message: ${msg.id}`);
        await MessageUtils.reply(
            msg,
            `${FormatUtils.userMention(msg.author.id)}${FormatUtils.codeBlock(
                'diff',
                '-已封鎖了一條有害連結的訊息。'
            )}`
        );
        await MessageUtils.delete(msg);
    }

    public async onUpdate(
        oldMsg: Message | PartialMessage,
        newMsg: Message,
        _data: EventData
    ): Promise<void> {
        if (this.cooldown.take(newMsg.id)) {
            return;
        }
        Logger.debug(`Delete edited message: ${newMsg.id}`);
        await MessageUtils.reply(
            newMsg,
            `${FormatUtils.userMention(newMsg.author.id)}${FormatUtils.codeBlock(
                'diff',
                '-已封鎖了一條有害連結的訊息。 (已編輯)'
            )}`
        );
        await MessageUtils.delete(newMsg);
    }
}
