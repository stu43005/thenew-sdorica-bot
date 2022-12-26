import admin from 'firebase-admin';
import * as fs from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import v8Profiler from 'v8-profiler-next';
import { Database } from '../database/database.js';

export async function cpuProfile(title: string): Promise<void> {
    // Make sure DB is initialized
    await Database.connect();

    // set generateType 1 to generate new format for cpuprofile
    // to be compatible with cpuprofile parsing in vscode.
    v8Profiler.setGenerateType(1);

    // Use stdout directly to bypass eventloop
    fs.writeSync(1, `Start profiler with title [${title}]\n`);
    v8Profiler.startProfiling(title, true);

    await setTimeout(60 * 1000);
    const profile = v8Profiler.stopProfiling(title);

    const db = admin.firestore();
    const ref = db.collection('cpuprofile').doc(title);
    await ref.set(profile);
    console.log('Profiler data written');
}
