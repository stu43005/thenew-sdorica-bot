import { Message, PartialMessage } from 'discord.js';

import { EventData } from '../models/event-data.js';

export interface Trigger {
    requireGuild: boolean;
    triggered(msg: Message): boolean;
    execute(msg: Message, data: EventData): Promise<void>;
    onUpdate?: (oldMsg: Message | PartialMessage, newMsg: Message, data: EventData) => Promise<void>;
}
