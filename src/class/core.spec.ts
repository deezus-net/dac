import {Core} from './core';
import {Command} from './define';

describe('postgres', () => {
    let core: Core = null;
    beforeAll(async () => {
        core = new Core();
        await core.setHosts({
            hosts: './test_data/postgres_hosts.yml',
            host: null, 
            password: null, 
            port: null, 
            user: null, 
            database: null,
            type: null,
            input: './test_data/postgres.yml',
            outDir: './test_data/extract'
        });
    });

    it.skip('create', async () => {
        await core.execute(Command.create);
    });
    
    it.skip('extract', async () => {
        await core.execute(Command.extract);
    });

    it.skip('updte', async () => {
        await core.execute(Command.update);
    });

    it.skip('recreate', async () => {
        await core.execute(Command.reCreate);
    });

    it('diff', async () => {
        await core.execute(Command.diff);
    });
});