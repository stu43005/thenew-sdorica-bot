import config from 'config';
import admin from 'firebase-admin';
import fireorm from 'fireorm';

export class Database {
    private static inited = false;

    public static async connect(): Promise<admin.firestore.Firestore> {
        if (this.inited) {
            return admin.firestore();
        }
        admin.initializeApp({
            credential: admin.credential.cert(config.get('firebaseAdmin.cert')),
            databaseURL: config.get('firebaseAdmin.databaseURL'),
        });
        const firestore = admin.firestore();
        fireorm.initialize(firestore);
        this.inited = true;
        return firestore;
    }
}
