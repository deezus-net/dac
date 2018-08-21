import { Client } from 'pg';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';

export class DbPostgres implements DbInterface {
    private client: Client;

    constructor(dbHost: DbHost) {
        try {
            this.client = new Client({
                user: dbHost.user,
                host: dbHost.host,
                database: dbHost.database,
                password: dbHost.password
            });
        } catch (e) {
            console.log(e);
        }
    }

    public async create() {

    }

    public async diff(db: Db) {

    }

    public extract() {
        return null;
    }
    
    public query(db: Db) {
        return '';
    }
    
    public async reCreate(db: Db) {

    }
    
    public async update(db: Db) {

    }

    /**
     * execute query
     * @param {string} query
     * @returns {Promise<QueryResult>}
     */
    public async exec(query: string) {
        await this.client.connect();
        const res = await this.client.query(query);
        await this.client.end();
        return res;
    }
}
