import {Db} from './db';

export interface DbInterface {
    extract: () => Db;
    query: (db: Db) => string;
    create: (db: Db) => void;
    reCreate: (db: Db) => void;
    update: (db: Db) => void;
    diff: (db: Db) => void;
}