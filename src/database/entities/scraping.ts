import {
    Collection,
    CustomRepository,
    getRepository,
    ISubCollection,
    SubCollection,
} from 'fireorm';
import { CustomBaseRepository } from './base-repository.js';

export class ScrapingItem {
    id!: string;
    title?: string;
}

export class ScrapingSubscription {
    id!: string;
    guildId?: string | null;
    url?: string;
}

@Collection('scraping_source')
export class ScrapingSource {
    id!: string;

    @SubCollection(ScrapingItem, 'items')
    items?: ISubCollection<ScrapingItem>;

    @SubCollection(ScrapingSubscription, 'subscriptions')
    subscriptions?: ISubCollection<ScrapingSubscription>;

    public update(): Promise<ScrapingSource> {
        return getScrapingSourceRepository().update(this);
    }
}

@CustomRepository(ScrapingItem)
export class CustomScrapingItemRepository extends CustomBaseRepository<ScrapingItem> {}

@CustomRepository(ScrapingSubscription)
export class CustomScrapingSubscriptionRepository extends CustomBaseRepository<ScrapingSubscription> {}

@CustomRepository(ScrapingSource)
export class CustomScrapingSourceRepository extends CustomBaseRepository<ScrapingSource> {}

export function getScrapingSourceRepository(): CustomScrapingSourceRepository {
    return getRepository(ScrapingSource) as CustomScrapingSourceRepository;
}
