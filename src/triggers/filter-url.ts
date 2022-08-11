import { Message, PartialMessage } from 'discord.js';
import urlRegex from 'url-regex-safe';
import { EventData } from '../models/event-data.js';
import { Logger } from '../services/logger.js';
import { FormatUtils } from '../utils/format-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { Trigger } from './trigger.js';

const bannedDomains = [
    'fxtwitter.com',
    'kocpc.blogspot.com',
    'kocpc.com.tw',
    'kocpc.tumblr.com',
    'sxtwitter.com',
    'twitter64.com',
    'vxtwitter.com',
];

export class FilterUrlTrigger implements Trigger {
    public requireGuild = false;

    public triggered(msg: Message): boolean {
        if (!PermissionUtils.canDeleteMessage(msg.channel)) {
            return false;
        }
        if (msg.attachments.size) {
            for (const [_id, attach] of msg.attachments) {
                if (this.filterUrl(attach.url, true)) {
                    return true;
                }
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
                        bannedDomains.find(
                            domain => uri.hostname === domain || uri.hostname.endsWith(`.${domain}`)
                        )
                    ) {
                        return true;
                    }
                } catch (error) {
                    if (bannedDomains.find(domain => url.includes(domain))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public async execute(msg: Message, _data: EventData): Promise<void> {
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
