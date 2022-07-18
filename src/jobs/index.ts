import { Job } from './job.js';

export const jobs: Job[] = [];

export const managerJobs: Job[] = [
    // ...(config.get('clustering.enabled') ? [] : [new UpdateServerCountJob(shardManager, httpService)]),
];
