import config from 'config';
import { Shard, ShardingManager } from 'discord.js';
import { createRequire } from 'node:module';
import pTimeout from 'p-timeout';
import { JobService } from '../services/job-service.js';
import { Logger } from '../services/logger.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class Manager {
    constructor(private shardManager: ShardingManager, private jobService: JobService) {}

    public async start(): Promise<void> {
        this.registerListeners();

        const shardList = this.shardManager.shardList as number[];

        try {
            Logger.info(
                Logs.info.managerSpawningShards
                    .replaceAll('{SHARD_COUNT}', shardList.length.toLocaleString())
                    .replaceAll('{SHARD_LIST}', shardList.join(', '))
            );
            await this.shardManager.spawn({
                amount: this.shardManager.totalShards,
                delay: config.get<number>('sharding.spawnDelay') * 1000,
                timeout: config.get<number>('sharding.spawnTimeout') * 1000,
            });
            Logger.info(Logs.info.managerAllShardsSpawned);
        } catch (error) {
            Logger.error(Logs.error.managerSpawningShards, error);
            return;
        }

        if (config.get('debug.dummyMode.enabled')) {
            return;
        }

        this.jobService.start();
    }

    private registerListeners(): void {
        this.shardManager.on('shardCreate', shard => this.onShardCreate(shard));

        setInterval(async () => {
            for (const [, shard] of this.shardManager.shards) {
                try {
                    if (!shard.ready) continue;
                    const start = process.hrtime.bigint();
                    const evalPromise = shard.eval(() => {
                        return true;
                    });
                    await pTimeout(evalPromise, {
                        milliseconds: 1000
                    });
                    const end = process.hrtime.bigint();
                    Logger.debug(`[Manager] Shard ${shard.id} heartbeat took ${Number(end - start) / 1000000}ms.`);
                } catch (error) {
                    Logger.error(`[Manager] Shard ${shard.id} heartbeat timed out.`);
                    shard.kill();
                }
            }
        }, 60_000).unref();
    }

    private onShardCreate(shard: Shard): void {
        Logger.info(Logs.info.managerLaunchedShard.replaceAll('{SHARD_ID}', shard.id.toString()));
    }
}
