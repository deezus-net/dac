import {Db} from './db';

export interface DbInterface {
    extract: () => Promise<Db>;
    query: (db: Db) => string;
    create: (db: Db, queryOnly: boolean) => Promise<string>;
    reCreate: (db: Db, queryOnly: boolean) => Promise<string>;
    update: (db: Db, queryOnly: boolean) => Promise<string>;
    diff: (db: Db) => void;
    connect: () => Promise<boolean>;
    close: () => Promise<boolean>;
}