import {Core} from './core';
import {Command} from './define';

describe('postgres', () => {
    let core: Core = null;
    beforeAll(async () => {
        core = new Core();
        await core.setHosts({
            hosts: './test_data/postgres/hosts.yml',
            input: './test_data/postgres/db.yml',
            outDir: './test_data/postgres'
        });
    });

    it('create', async () => {
        await core.execute(Command.create);
    });
    
    it('updte', async () => {
        await core.execute(Command.update);
    });

    it('recreate', async () => {
        await core.execute(Command.reCreate);
    });

    it('diff', async () => {
        const diff = await core.execute(Command.diff);
        console.log(diff);
    });

    it('extract', async () => {
        await core.execute(Command.extract);
    });
});

describe.skip('mysql', () => {
    let core: Core = null;
    beforeAll(async () => {
        core = new Core();
        await core.setHosts({
            hosts: './test_data/mysql/hosts.yml',
            input: './test_data/mysql/db.yml',
            outDir: './test_data/mysql/',
            query: false
        });
    });

    it('create', async () => {
        await core.execute(Command.create);
    });

    it('updte', async () => {
        await core.execute(Command.update);
    });

    it('recreate', async () => {
        await core.execute(Command.reCreate);
    });

    it('diff', async () => {
        const diff = await core.execute(Command.diff);
        console.log(diff);
    });

    it('extract', async () => {
        await core.execute(Command.extract);
    });
});

describe.skip('mssql', () => {
    let core: Core = null;
    beforeAll(async () => {
        core = new Core();
        await core.setHosts({
            hosts: './test_data/mssql/hosts.yml',
            input: './test_data/mssql/db.yml',
            outDir: './test_data/mssql/',
            query: false
        });
    });

    it('create', async () => {
        await core.execute(Command.create);
    });

    it('updte', async () => {
        await core.execute(Command.update);
    });

    it('recreate', async () => {
        await core.execute(Command.reCreate);
    });

    it('diff', async () => {
        const diff = await core.execute(Command.diff);
        console.log(diff);
    });

    it('extract', async () => {
        await core.execute(Command.extract);
    });
});
