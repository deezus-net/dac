import { DbPostgres } from './dbPostgres';

describe('DbPostgres', () => {
    let pg;
    beforeAll(() => {
        pg = new DbPostgres({
            host: 'localhost',
            user: 'dac',
            password: 'dac',
            database: 'dac',
            type: 'postgres'
        });

    });

    it('exec', async () => {
        const res = await pg.exec('SELECT NOW() AS time');
        expect(res.rows.length).toEqual(1);
    });
    
    afterAll(() => {
        
    });
});