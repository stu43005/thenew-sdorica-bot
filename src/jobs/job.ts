export interface Job {
    uuid: string;
    name: string;
    log: boolean;
    schedule: string;
    run(): Promise<void>;
}
