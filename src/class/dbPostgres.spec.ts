import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import { DbPostgres } from './dbPostgres';
import {dbToYaml, yamlToDb} from './utility';

describe('DbPostgres', () => {
    let pg: DbPostgres;
    let db;
    
    beforeAll(async () => {
        const hostText = await promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};
        pg = new DbPostgres(hosts['postgres']);
        
        const dbText = await promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = yamlToDb(dbText);
        
      //  db = yaml.safeLoad(dbText) as Db;
        
    });

    it.skip('create', async () => {
        await pg.connect();
        const res = await pg.create(db, false);
        expect(res).toBeTruthy();
        await pg.close();
        
    });

    it.skip('reCreate', async () => {
        await pg.connect();
        const res = await pg.reCreate(db, false);
        expect(res).toBeTruthy();
        await pg.close();

    });
    
    it.skip('extract', async () => {
        await pg.connect();
        const res = await pg.extract();
        const text = dbToYaml(res);
        console.log(text);
        await pg.close();

    });
    
    it.skip ('update', async () => {
        await pg.connect();
        const res = await pg.update(db, false);
        await pg.close();
    });

    it ('diff', async () => {
        await pg.connect();
        const res = await pg.diff(db);
        console.log(res);
        await pg.close();
    });

    afterAll(() => {
        
    });
});