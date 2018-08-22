import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import { DbPostgres } from './dbPostgres';
import {dbToYaml} from './utility';

describe('DbPostgres', () => {
    let pg;
    let db;
    
    beforeAll(async () => {
        const hostText = await promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};
        pg = new DbPostgres(hosts['postgres']);
        
        const dbText = await promisify(fs.readFile)('./test_data/sample.yml', 'utf8');
        db = yaml.safeLoad(dbText) as Db;
        
    });

    
    it.skip('query', async () => {
       const query = pg.query(db);
       console.log(query);
       await pg.exec(query);
    });

    it.skip('create', async () => {
        const res = await pg.create(db);
        expect(res).toBeTruthy();
        
    });

    it.skip('reCreate', async () => {
        const res = await pg.reCreate(db);
        expect(res).toBeTruthy();

    });
    
    it('extract', async () => {
        const res = await pg.extract();
        const text = dbToYaml(res);
        console.log(text);

    });
    
    afterAll(() => {
        
    });
});