import config from 'config';
import admin from 'firebase-admin';
import fireorm from 'fireorm';

export class Database {
    public static async connect(): Promise<admin.firestore.Firestore> {
        admin.initializeApp({
            credential: admin.credential.cert(config.get('firebaseAdmin.cert')),
            databaseURL: config.get('firebaseAdmin.databaseURL'),
        });
        const firestore = admin.firestore();
        fireorm.initialize(firestore);
        return firestore;
    }
}
