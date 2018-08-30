import {Core} from './core';

describe('postgres', () => {
    let core: Core = null;
    beforeAll(async () => {
        core = new Core();
        await core.setHosts({
            hosts: './test_data/hosts.yml',
            host: null, 
            password: null, 
            port: null, 
            user: null, 
            database: null,
            type: null,
            input: './test_data/sample.yml',
            outDir: './test_data'
        });
    });
    
    it('extract', async () => {
        await core.execute('extract');
    });

    it.skip('updte', async () => {
        await core.execute('update');
    });

    it.skip('create', async () => {
        await core.execute('create');
    });

    it.skip('recreate', async () => {
        await core.execute('recreate');
    });

    it.skip('diff', async () => {
        await core.execute('diff');
    });
});