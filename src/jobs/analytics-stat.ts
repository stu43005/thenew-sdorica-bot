import admin from 'firebase-admin';
import moment from 'moment';
import { mergeData } from '../database/stat-collection.js';
import { Job } from './job.js';

export class AnalyticsStatJob implements Job {
    public name = 'Analytics Stat job';
    public schedule = '0 0 * * *'; // At 00:00
    public log = false;

    public async run(): Promise<void> {
        const lastday = moment().subtract(7, 'days');
        this.job(lastday);
    }

    private async job(lastday: moment.Moment): Promise<void> {
        const lastweek = lastday.format('GGGG-[W]WW');
        const db = admin.firestore();
        const statSnapshot = await db.collection('stat').get();

        for (let i = 0; i < statSnapshot.docs.length; i++) {
            const doc = statSnapshot.docs[i];
            const guildId = doc.id;

            const weeklyRef = db.collection('stat').doc(guildId).collection('weekly').doc(lastweek);
            const weeklySnapshot = await weeklyRef.get();
            if (!weeklySnapshot.exists) {
                const data: any = {
                    days: [],
                };
                for (let i = 1; i <= 7; i++) {
                    const day = lastday.isoWeekday(i).format('YYYY-MM-DD');
                    const dayRef = db.collection('stat').doc(guildId).collection('daily').doc(day);
                    const daySnapshot = await dayRef.get();
                    const dayData = daySnapshot.data() as any;
                    if (dayData) {
                        mergeData(data, dayData);
                        data.days.push(day);
                    }
                }
                weeklyRef.set(data);
            }
        }
    }
}
