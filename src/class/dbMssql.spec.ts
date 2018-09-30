import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbMssql} from './dbMssql';
import { DbPostgres } from './dbPostgres';
import {dbToYaml, yamlToDb} from './utility';

describe('DbMssql', () => {
    let sql: DbMssql;
    let db;

    beforeAll(async () => {
        const hostText = await promisify(fs.readFile)('./test_data/mssql/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};
        sql = new DbMssql(hosts['mssql']);

        const dbText = await promisify(fs.readFile)('./test_data/mssql/db.yml', 'utf8');
        db = yamlToDb(dbText);

        //  db = yaml.safeLoad(dbText) as Db;

    });
    
    it.skip('query', async () => {
        await sql.connect();
        const data = sql.query(db);
        console.log(data);
        await sql.close();
    });

    it ('drop', async () => {
        await sql.connect();
        const res = await sql.drop(db, false);
        await sql.close();
    });
    
    it.skip('create', async () => {
        await sql.connect();
        const res = await sql.create(db, false);
        expect(res).toBeTruthy();
        await sql.close();

    });

    it.skip('reCreate', async () => {
        await sql.connect();
        const res = await sql.reCreate(db, false);
        expect(res).toBeTruthy();
        await sql.close();

    });

    it.skip('extract', async () => {
        await sql.connect();
        const res = await sql.extract();
        const text = dbToYaml(res);
        console.log(text);
        await sql.close();

    });

    it.skip ('update', async () => {
        await sql.connect();
        const res = await sql.update(db, false);
        await sql.close();
    });

    it.skip ('diff', async () => {
        await sql.connect();
        const res = await sql.diff(db);
        await sql.close();
    });

    afterAll(() => {

    });
});