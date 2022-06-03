import { AutoCrosspostingTrigger } from './auto-crossposting.js';
import { MemeTrigger } from './meme.js';
import { PttTrigger } from './ptt.js';
import { QuoteTrigger } from './quote.js';
import { Trigger } from './trigger.js';

export { Trigger } from './trigger.js';

export const triggers: Trigger[] = [
    new AutoCrosspostingTrigger(),
    new MemeTrigger(),
    new PttTrigger(),
    new QuoteTrigger(),
];
