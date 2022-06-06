import { ClientEvents } from 'discord.js';

export interface CustomEvent<K extends keyof ClientEvents> {
    event: K;
    process(...args: ClientEvents[K]): Promise<void>;
}
