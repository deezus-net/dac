import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import { DbPostgres } from './dbPostgres';
import {dbToYaml, yamlToDb} from './utility';

describe('DbPostgres', () => {
    let pg;
    let db;
    
    beforeAll(async () => {
        const hostText = await promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};
        pg = new DbPostgres(hosts['postgres']);
        
        const dbText = await promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = yamlToDb(dbText);
        
      //  db = yaml.safeLoad(dbText) as Db;
        
    });

    
    it.skip('query', async () => {
        await pg.connect();
       const query = pg.query(db);
       console.log(query);
       await pg.exec(query);
        await pg.end();
    });

    it.skip('create', async () => {
        await pg.connect();
        const res = await pg.create(db);
        expect(res).toBeTruthy();
        await pg.end();
        
    });

    it.skip('reCreate', async () => {
        await pg.connect();
        const res = await pg.reCreate(db);
        expect(res).toBeTruthy();
        await pg.end();

    });
    
    it.skip('extract', async () => {
        await pg.connect();
        const res = await pg.extract();
        const text = dbToYaml(res);
        console.log(text);
        await pg.end();

    });
    
    it.skip ('update', async () => {
        await pg.connect();
        const res = await pg.update(db);
        await pg.end();
    });

    it ('diff', async () => {
        await pg.connect();
        const res = await pg.diff(db);
        await pg.end();
    });

    afterAll(() => {
        
    });
});