import {Db} from './db';
import {DbDiff} from './dbDiff';

export interface DbInterface {
    drop: (db: Db, queryOnly: boolean) => Promise<string>;
    extract: () => Promise<Db>;
    query: (db: Db) => string;
    create: (db: Db, queryOnly: boolean) => Promise<string>;
    reCreate: (db: Db, queryOnly: boolean) => Promise<string>;
    update: (db: Db, queryOnly: boolean, dropTable: boolean) => Promise<string>;
    diff: (db: Db) => Promise<DbDiff>;
    connect: () => Promise<boolean>;
    close: () => Promise<boolean>;
}