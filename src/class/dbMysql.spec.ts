import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbMysql} from './dbMysql';
import {dbToYaml, yamlToDb} from './utility';


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

    
    it.skip('query', async () => {
        const query = mysql.query(db);
        console.log(query);
        await mysql.end();
    });

    
    it('create', async () => {
        const res = await mysql.create(db);
        expect(res).toBeTruthy();
        await mysql.end();

    });

    it.skip('reCreate', async () => {

        const res = await mysql.reCreate(db);
        expect(res).toBeTruthy();
        await mysql.end();

    });

    it.skip('extract', async () => {
        const res = await mysql.extract();
        const text = dbToYaml(res);
        console.log(text);
        await mysql.end();

    });

    it.skip ('update', async () => {
        const res = await mysql.update(db);
        await mysql.end();
    });

    it.skip ('diff', async () => {
        await mysql.connect();
        const res = await mysql.diff(db);
        await mysql.end();
    });

    afterAll(() => {

    });
});