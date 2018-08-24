import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbMysql} from './dbMysql';
import {createConnection} from "mysql";

describe.skip('dbMysql', () => {
    let mysql;
    let db;
    
    beforeAll(async () => {
        /*const hostText = await promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};
        mysql = new DbMysql(hosts['mysql']);

        const dbText = await promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = yaml.safeLoad(dbText) as Db;*/
        
    });
    
    it('test', () => {
        const con = createConnection({
            host: 'localhost',
            user: 'dac',
            password: 'dac',
            database: 'dac',


        });
        con.connect();
    });
});