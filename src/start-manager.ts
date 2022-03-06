import config from 'config';
import { ShardingManager } from 'discord.js';
import { createRequire } from 'node:module';
import 'reflect-metadata';
import { GuildsController, RootController, ShardsController } from './controllers/index.js';
import { Job, UpdateServerCountJob } from './jobs/index.js';
import { Api } from './models/api.js';
import { Manager } from './models/manager.js';
import { HttpService, JobService, Logger, MasterApiService } from './services/index.js';
import { MathUtils, ShardUtils } from './utils/index.js';

const require = createRequire(import.meta.url);
let Logs = require('../lang/logs.json');

async function start(): Promise<void> {
    Logger.info(Logs.info.appStarted);

    // Dependencies
    let httpService = new HttpService();
    let masterApiService = new MasterApiService(httpService);
    if (config.get('clustering.enabled')) {
        await masterApiService.register();
    }

    // Sharding
    let shardList: number[];
    let totalShards: number;
    try {
        if (config.get('clustering.enabled')) {
            let resBody = await masterApiService.login();
            shardList = resBody.shardList;
            let requiredShards = await ShardUtils.requiredShardCount(config.get('client.token'));
            totalShards = Math.max(requiredShards, resBody.totalShards);
        } else {
            let recommendedShards = await ShardUtils.recommendedShardCount(
                config.get('client.token'),
                config.get('sharding.serversPerShard')
            );
            shardList = MathUtils.range(0, recommendedShards);
            totalShards = recommendedShards;
        }
    } catch (error) {
        Logger.error(Logs.error.retrieveShards, error);
        return;
    }

    if (shardList.length === 0) {
        Logger.warn(Logs.warn.managerNoShards);
        return;
    }

    let shardManager = new ShardingManager('dist/start-bot.js', {
        token: config.get('client.token'),
        mode: config.get('debug.override.shardMode.enabled') ? config.get('debug.override.shardMode.value') : 'worker',
        respawn: true,
        totalShards,
        shardList,
    });

    // Jobs
    let jobs: Job[] = [
        ...(config.get('clustering.enabled') ? [] : [new UpdateServerCountJob(shardManager, httpService)]),
        // TODO: Add new jobs here
    ];

    let manager = new Manager(shardManager, new JobService(jobs));

    // API
    let guildsController = new GuildsController(shardManager);
    let shardsController = new ShardsController(shardManager);
    let rootController = new RootController();
    let api = new Api([guildsController, shardsController, rootController]);

    // Start
    await manager.start();
    await api.start();
    if (config.get('clustering.enabled')) {
        await masterApiService.ready();
    }
}

process.on('unhandledRejection', (reason, _promise) => {
    Logger.error(Logs.error.unhandledRejection, reason);
});

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});
