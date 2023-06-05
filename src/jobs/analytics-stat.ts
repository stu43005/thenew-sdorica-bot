import config from 'config';
import admin from 'firebase-admin';
import moment from 'moment';
import { Database } from '../database/database.js';
import { getGuildRepository } from '../database/entities/guild.js';
import { mergeData, StatData } from '../database/stat-collection.js';
import { Job } from './job.js';

export class AnalyticsStatJob implements Job {
    public uuid = '1fb34860-064b-48ca-8e6d-2105ada3c5d8';
    public name = 'Analytics Stat job';
    public schedule: string = config.get('jobs.analyticsStatJob.schedule');
    public log: boolean = config.get('jobs.analyticsStatJob.log');

    public async run(): Promise<void> {
        // Make sure DB is initialized
        await Database.connect();

        const db = admin.firestore();
        const docs = await db.collection('stat').listDocuments();

        for (const doc of docs) {
            const guildId = doc.id;

            for (const [collection, statConfig] of Object.entries(analyticConfigs)) {
                if (!statConfig.calcFrom || !statConfig.scheduled) continue;

                let current = moment();
                for (let index = 0; index < 1; index++) {
                    current = current.clone().subtract(1, statConfig.durationUnit);
                    await AnalyticsStatJob.calc(guildId, collection, current);
                }
            }
        }
    }

    public static async calc(
        guildId: string,
        collection: string,
        current: moment.Moment
    ): Promise<StatData> {
        const db = admin.firestore();
        const statConfig = analyticConfigs[collection];
        const name = statConfig.nameFormat(current);

        const currentRef = db.collection('stat').doc(guildId).collection(collection).doc(name);
        const currentSnapshot = await currentRef.get();
        if (currentSnapshot.exists) {
            const currentData = currentSnapshot.data() as StatData;
            return currentData;
        } else {
            const data: any = {
                days: [],
            };
            if (!statConfig.calcFrom) return data;
            const calcConfig = analyticConfigs[statConfig.calcFrom];

            let startOfTime = statConfig.startOfTime(current.clone());
            const endOfTime = statConfig.endOfTime(current.clone());

            const guildData = await getGuildRepository().findById(guildId);
            if (guildData.joinAt) {
                const joinAt = moment(guildData.joinAt);
                if (startOfTime.isBefore(joinAt)) {
                    startOfTime = joinAt;
                }
            }

            for (
                let time = startOfTime.clone();
                time.isBefore(endOfTime);
                time = time.clone().add(1, calcConfig.durationUnit)
            ) {
                const timeName = calcConfig.nameFormat(time);
                const timeData = await this.calc(guildId, statConfig.calcFrom, time);
                if (timeData) {
                    mergeData(data, timeData);
                    data.days.push(timeName);
                }
            }
            if (data.days.length) {
                await currentRef.set(data);
            }
            return data;
        }
    }
}

const analyticConfigs: Record<string, AnalyticConfig> = {
    daily: {
        durationUnit: 'day',
        startOfTime: current => current.startOf('day'),
        endOfTime: current => current.endOf('day'),
        nameFormat: day => day.format('YYYY-MM-DD'),
        scheduled: false,
    },
    weekly: {
        durationUnit: 'week',
        startOfTime: current => current.startOf('isoWeek'),
        endOfTime: current => current.endOf('isoWeek'),
        nameFormat: day => day.format('GGGG-[W]WW'),
        calcFrom: 'daily',
        scheduled: true,
    },
    monthly: {
        durationUnit: 'month',
        startOfTime: current => current.startOf('month'),
        endOfTime: current => current.endOf('month'),
        nameFormat: day => day.format('YYYY-MM'),
        calcFrom: 'daily',
        scheduled: true,
    },
    quarterly: {
        durationUnit: 'quarter',
        startOfTime: current => current.startOf('quarter'),
        endOfTime: current => current.endOf('quarter'),
        nameFormat: day => day.format('YYYY-[Q]Q'),
        calcFrom: 'monthly',
        scheduled: true,
    },
    yearly: {
        durationUnit: 'year',
        startOfTime: current => current.startOf('year'),
        endOfTime: current => current.endOf('year'),
        nameFormat: day => day.format('YYYY'),
        calcFrom: 'quarterly',
        scheduled: true,
    },
    last30days: {
        durationUnit: 'day',
        startOfTime: current => current.subtract(30, 'day').startOf('day'),
        endOfTime: current => current.subtract(1, 'day').endOf('day'),
        nameFormat: day => day.format('YYYY-MM-DD'),
        calcFrom: 'daily',
        scheduled: false,
    },
};

interface AnalyticConfig {
    durationUnit: moment.unitOfTime.DurationConstructor;
    startOfTime(current: moment.Moment): moment.Moment;
    endOfTime(current: moment.Moment): moment.Moment;
    nameFormat(day: moment.Moment): string;
    calcFrom?: string;
    scheduled: boolean;
}
