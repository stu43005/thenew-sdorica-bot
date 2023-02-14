import config from 'config';
import { Shard, ShardingManager } from 'discord.js';
import { spawn } from 'node:child_process';
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
        this.lifeCheckLoop();

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
    }

    private lifeCheckLoop(): void {
        setInterval(async () => {
            for (const [, shard] of this.shardManager.shards) {
                try {
                    if (!shard.ready) continue;
                    const start = process.hrtime.bigint();
                    const evalPromise = shard.eval(() => {
                        return true;
                    });
                    await pTimeout(evalPromise, {
                        milliseconds: 1000,
                    });
                    const end = process.hrtime.bigint();
                    Logger.debug(
                        `[Manager] Shard ${shard.id} heartbeat took ${
                            Number(end - start) / 1000000
                        }ms.`
                    );
                } catch (error) {
                    Logger.error(`[Manager] Shard ${shard.id} heartbeat timed out.`);
                    if (shard.process?.pid) {
                        await this.diat(
                            'cpuprofile',
                            '-p',
                            `${shard.process.pid}`,
                            '--file',
                            `/app/cache/diat_${shard.process.pid}_${Date.now()}.cpuprofile`
                        );
                        await this.diat(
                            'perf',
                            '-p',
                            `${shard.process.pid}`,
                            '--file',
                            `/app/cache/diat_perf_${shard.process.pid}_${Date.now()}.svg`
                        );
                    }
                    // shard.respawn();
                }
            }
        }, 60_000).unref();
    }

    private diat(...args: string[]): Promise<void> {
        return new Promise(resolve => {
            const diat = spawn('diat', args, { timeout: 60_000 });

            diat.on('spawn', () => {
                console.log(`[diat]: spawn 'diat ${args.join(' ')}' at pid:${diat.pid}`);
            });

            diat.stdout.on('data', data => {
                console.log(`[diat][${diat.pid}]: ${data}`);
            });

            diat.stderr.on('data', data => {
                console.error(`[diat][${diat.pid}]: ${data}`);
            });

            diat.on('close', code => {
                console.log(`[diat][${diat.pid}]: exited with code ${code}`);
                resolve();
            });

            diat.on('error', err => {
                console.error(`[diat][${diat.pid}] error:`, err);
                resolve();
            });
        });
    }

    private onShardCreate(shard: Shard): void {
        Logger.info(Logs.info.managerLaunchedShard.replaceAll('{SHARD_ID}', shard.id.toString()));
    }
}
