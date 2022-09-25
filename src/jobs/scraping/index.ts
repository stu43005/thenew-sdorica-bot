import { FacebookTriggerClass } from './facebook.js';
import { JsonTriggerClass } from './json.js';
import { RssTriggerClass } from './rss.js';
import { TriggerClass } from './types.js';

export const triggerClasses: Record<string, TriggerClass> = {
    rss: new RssTriggerClass(),
    json: new JsonTriggerClass(),
    facebook: new FacebookTriggerClass(),
};
