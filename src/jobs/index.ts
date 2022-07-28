import { AnalyticsStatJob } from './analytics-stat.js';
import { Job } from './job.js';

export const jobs: Job[] = [];

export const managerJobs: Job[] = [
    // ...(config.get('clustering.enabled') ? [] : [new UpdateServerCountJob(shardManager, httpService)]),
    new AnalyticsStatJob(),
];
