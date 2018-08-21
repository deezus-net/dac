import { Client } from 'pg';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';

export class DbPostgres implements DbInterface {
    constructor(dbHost: DbHost) {
        console.log(dbHost.database);
        try {
            const client = new Client({
                user: dbHost.user,
                host: dbHost.host,
                database: dbHost.database,
                password: dbHost.password
            });
            console.log(client);
            client.connect();
        }catch (e) {
            console.log(e);
        }
    }

    public create = () => {

    };

    public diff = () => {

    };

    public extract = () => {
        return null;
    }
    public query = () => {
        return '';
    }
    public reCreate = () => {

    }
    public update = () => {

    }
}
