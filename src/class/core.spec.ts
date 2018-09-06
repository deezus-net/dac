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
        const res = await core.execute(Command.create);
        expect(res).toBeTruthy();
    });
    
    it('updte', async () => {
        const res = await core.execute(Command.update);
        expect(res).toBeTruthy();
    });

    it('recreate', async () => {
        const res = await core.execute(Command.reCreate);
        expect(res).toBeTruthy();
    });

    it('diff', async () => {
        const res = await core.execute(Command.diff);
        expect(res).toBeTruthy();
    });

    it('extract', async () => {
        const res = await core.execute(Command.extract);
        expect(res).toBeTruthy();
    });
});

describe('mysql', () => {
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
        const res = await core.execute(Command.create);
        expect(res).toBeTruthy();
    });

    it('updte', async () => {
        const res = await core.execute(Command.update);
        expect(res).toBeTruthy();
    });

    it('recreate', async () => {
        const res = await core.execute(Command.reCreate);
        expect(res).toBeTruthy();
    });

    it('diff', async () => {
        const res = await core.execute(Command.diff);
        expect(res).toBeTruthy();
    });

    it('extract', async () => {
        const res = await core.execute(Command.extract);
        expect(res).toBeTruthy();
    });
});

describe('mssql', () => {
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
        const res = await core.execute(Command.create);
        expect(res).toBeTruthy();
    });

    it('updte', async () => {
        const res = await core.execute(Command.update);
        expect(res).toBeTruthy();
    });

    it('recreate', async () => {
        const res = await core.execute(Command.reCreate);
        expect(res).toBeTruthy();
    });

    it('diff', async () => {
        const res = await core.execute(Command.diff);
        expect(res).toBeTruthy();
    });

    it('extract', async () => {
        const res = await core.execute(Command.extract);
        expect(res).toBeTruthy();
    });
});
