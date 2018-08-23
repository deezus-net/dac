import {Db} from './db';

export interface DbInterface {
    extract: () => Promise<Db>;
    query: (db: Db) => string;
    create: (db: Db) => Promise<boolean>;
    reCreate: (db: Db) => Promise<boolean>;
    update: (db: Db) => Promise<boolean>;
    diff: (db: Db) => void;
}