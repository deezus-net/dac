import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbMysql} from './dbMysql';
import {dbToYaml, yamlToDb} from './utility';
import * as mysqlx from '@mysql/xdevapi';
import {ColumnMetaData} from 'tedious';


describe('dbMysql', () => {
    let mysql: DbMysql;
    let db: Db;

    beforeAll(async () => {
        const hostText = await promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};
        mysql = new DbMysql(hosts['mysql']);

        const dbText = await promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = yamlToDb(dbText);
       
    });
    
    it('test', async () => {
        await new Promise(resolve => {
            mysqlx.getSession({
                host: 'localhost',
                port: 33060,
                password: 'dac',
                user: 'dac',
                schema: 'dac' // created by default
            }).then(e => {
                console.log(e);
                resolve();
            }).catch(e => {
                console.log(e.stack);
            });
        });
    });
    

    it.skip('query', async () => {
        const query = mysql.query(db);
        console.log(query);
        await mysql.close();
    });

    
    it.skip('create', async () => {
        await mysql.connect();
        const res = await mysql.create(db, false);
        expect(res).toBeTruthy();
        await mysql.close();

    });

    it.skip('reCreate', async () => {
        await mysql.connect();
        const res = await mysql.reCreate(db, false);
        expect(res).toBeTruthy();
        await mysql.close();

    });

    it.skip('extract', async () => {
        await mysql.connect();
        const res = await mysql.extract();
        const text = dbToYaml(res);
        console.log(text);
        await mysql.close();

    });

    it.skip ('update', async () => {
        await mysql.connect();
        const res = await mysql.update(db, false);
        await mysql.close();
    });

    it.skip ('diff', async () => {
        await mysql.connect();
        const res = await mysql.diff(db);
        await mysql.close();
    });

    afterAll(() => {

    });
});