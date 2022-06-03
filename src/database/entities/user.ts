import { Collection, CustomRepository, getRepository } from 'fireorm';
import { LangCode } from '../../enums/lang-code.js';
import { CustomBaseRepository } from './base-repository.js';

@Collection()
export class UserData {
    id!: string;

    language?: LangCode;

    public update(): Promise<UserData> {
        return getUserRepository().update(this);
    }
}

@CustomRepository(UserData)
export class CustomUserDataRepository extends CustomBaseRepository<UserData> {
}

export function getUserRepository(): CustomUserDataRepository {
    return getRepository(UserData) as CustomUserDataRepository;
}
