import { Component } from './component.js';
import ReportMessageAction from './report-message-action.js';
import ReportMessageSubmit from './report-message.js';
import WikiHeroAction from './wiki-hero.js';

export const components: Component[] = [
    new ReportMessageSubmit(),
    new ReportMessageAction(),
    new WikiHeroAction(),
];
