import config from 'config';
import { ActivityType, ShardingManager } from 'discord.js';
import { createRequire } from 'node:module';
import { BotSite } from '../models/config-models.js';
import { HttpService, Lang, Logger } from '../services/index.js';
import { ShardUtils } from '../utils/index.js';
import { Job } from './index.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class UpdateServerCountJob implements Job {
    public name = 'Update Server Count';
    public schedule: string = config.get('jobs.updateServerCount.schedule');
    public log: boolean = config.get('jobs.updateServerCount.log');

    private botSites: BotSite[];

    constructor(private shardManager: ShardingManager, private httpService: HttpService) {
        this.botSites = config.get<BotSite[]>('bot-sites').filter(botSite => botSite.enabled);
    }

    public async run(): Promise<void> {
        const serverCount = await ShardUtils.serverCount(this.shardManager);

        const type: ActivityType = 'STREAMING';
        const name = `to ${serverCount.toLocaleString()} servers`;
        const url = Lang.getCom('links.stream');

        await this.shardManager.broadcastEval(
            (client, context) => {
                return client.user?.setPresence({
                    activities: [
                        {
                            type: context.type,
                            name: context.name,
                            url: context.url,
                        },
                    ],
                });
            },
            { context: { type, name, url } }
        );

        Logger.info(
            Logs.info.updatedServerCount.replaceAll('{SERVER_COUNT}', serverCount.toLocaleString())
        );

        for (const botSite of this.botSites) {
            try {
                const body = JSON.parse(
                    botSite.body.replaceAll('{{SERVER_COUNT}}', serverCount.toString())
                );
                const res = await this.httpService.post(botSite.url, botSite.authorization, body);

                if (!res.ok) {
                    throw res;
                }
            } catch (error) {
                Logger.error(
                    Logs.error.updatedServerCountSite.replaceAll('{BOT_SITE}', botSite.name),
                    error
                );
                continue;
            }

            Logger.info(Logs.info.updatedServerCountSite.replaceAll('{BOT_SITE}', botSite.name));
        }
    }
}
