import {Db} from './db';

export interface DbInterface {
    extract: () => Db;
    query: () => string;
    create: () => void;
    reCreate: () => void;
    update: () => void;
    diff: () => void;
}