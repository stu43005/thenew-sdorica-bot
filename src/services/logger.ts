import { codeBlock, inlineCode } from '@discordjs/builders';
import config from 'config';
import { DiscordAPIError, MessageEmbed, WebhookClient } from 'discord.js';
import { Response } from 'node-fetch';
import { Transform } from 'node:stream';
import pino, { DestinationStream, Level, StreamEntry } from 'pino';
import build, { OnUnknown } from 'pino-abstract-transport';
import { FormatUtils } from '../utils/format-utils.js';

const streams: (DestinationStream | StreamEntry)[] = [
    ...(config.get('logging.pretty')
        ? [pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'yyyy-mm-dd HH:MM:ss.l',
            },
        })]
        : undefined),
    ...(config.get('logging.discordWebhook.enabled')
        ? [await discordWebhookTransport({
            id: config.get('logging.discordWebhook.id'),
            token: config.get('logging.discordWebhook.token'),
        })]
        : undefined),
];
let logger = pino(
    {
        formatters: {
            level: label => {
                return { level: label };
            },
        },
    },
    streams.length ? pino.multistream(streams) : undefined
);

export interface DiscordWebhookTransportOptions {
    id: string;
    token: string;
}

export async function discordWebhookTransport(opts: DiscordWebhookTransportOptions): Promise<Transform & OnUnknown> {
    const webhookClient = new WebhookClient(opts);

    function webhookError(reason: any): void {
        Logger.error('[Logger] Webhoook error:', reason);
    }
    function getLevel(level: Level): [number, string] {
        switch (level) {
            case 'trace': return [0, '🐛'];
            case 'debug': return [0, '🐛'];
            case 'info': return [0xd5d5d5, 'ℹ️'];
            case 'warn': return [0xfedda1, '⚠️'];
            case 'error': return [0xfe8082, '❌'];
            case 'fatal': return [0xfe8082, '❌'];
        }
    }
    const ignore = 'level,time,msg,pid,hostname,err'.split(',');
    function printExtraKey(embed: MessageEmbed, obj: any): string {
        const extraKeys = Object.keys(obj).filter((key) => !ignore.includes(key));
        if (extraKeys.length) {
            const extra = extraKeys.reduce<any>((acc, cur) => {
                acc[cur] = obj[cur];
                return acc;
            }, {});

            const inlineString = JSON.stringify(extra);
            if (inlineString.length > 100) {
                return `\n${FormatUtils.jsonBlock(extra)}`;
            }
            return `\n${inlineCode(inlineString)}`;
        }
        return '';
    }

    return build(async (source: Transform & OnUnknown) => {
        for await (let obj of source) {
            const [color, emoji] = getLevel(obj.level);
            if (!color) continue;

            const embed = new MessageEmbed();
            embed.setColor(color);
            embed.setDescription(`${emoji}：${obj.msg}${printExtraKey(embed, obj)}`);
            if ('err' in obj) {
                embed.addField('err', codeBlock(obj.err.stack ?? obj.err.toString()));
            }

            await webhookClient.send({ embeds: [embed] }).catch(webhookError);
            // await webhookClient.send(codeBlock('json', JSON.stringify(obj))).catch(webhookError);
        }
    });
}

export class Logger {
    private static shardId: number;

    public static info(message: string, obj?: any): void {
        obj ? logger.info(obj, message) : logger.info(message);
    }

    public static warn(message: string, obj?: any): void {
        obj ? logger.warn(obj, message) : logger.warn(message);
    }

    public static async error(message: string, obj?: any): Promise<void> {
        // Log just a message if no error object
        if (!obj) {
            logger.error(message);
            return;
        }

        // Otherwise log details about the error
        if (typeof obj === 'string') {
            logger
                .child({
                    message: obj,
                })
                .error(message);
        } else if (obj instanceof Response) {
            let resText: string;
            try {
                resText = await obj.text();
            } catch {
                // Ignore
            }
            logger
                .child({
                    path: obj.url,
                    statusCode: obj.status,
                    statusName: obj.statusText,
                    headers: obj.headers.raw(),
                    body: resText,
                })
                .error(message);
        } else if (obj instanceof DiscordAPIError) {
            logger
                .child({
                    message: obj.message,
                    code: obj.code,
                    statusCode: obj.httpStatus,
                    method: obj.method,
                    path: obj.path,
                    stack: obj.stack,
                })
                .error(message);
        } else {
            logger.error(obj, message);
        }
    }

    public static setShardId(shardId: number): void {
        if (this.shardId !== shardId) {
            this.shardId = shardId;
            logger = logger.child({ shardId });
        }
    }
}
