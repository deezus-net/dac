import {createConnection} from 'mysql';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';

export class DbMysql implements DbInterface {
    constructor(dbHost: DbHost) {
        console.log(dbHost);
        try {
            const con = createConnection({
                host: dbHost.host,
                user: dbHost.user,
                password: dbHost.password,
                database: dbHost.dataBase,
            });
            con.connect();
          //  console.log(con)
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