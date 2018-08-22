import {createConnection} from 'mysql2';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';

import * as iconv from 'iconv-lite';
import encodings from 'iconv-lite/encodings';
iconv.encodings = encodings;

export class DbMysql implements DbInterface {
    constructor(dbHost: DbHost) {
        console.log(dbHost);
        try {
            const con = createConnection({
                host: dbHost.host,
                user: dbHost.user,
                password: dbHost.password,
                database: dbHost.database,
                insecureAuth: true,
                charset: 'utf8',
                encoding: 'utf8'
               
            });
            con.connect();
            //  console.log(con)
        } catch (e) {
            console.log(e);
        }
    }

    public create(db: Db) {

    }

    public diff(db: Db) {

    }

    public extract() {
        return null;
    }
    
    public query(db: Db) {
        return '';
    }
    
    public reCreate(db: Db) {

    }
    
    public update(db: Db) {

    }
}