import {Core} from './core';
import {Command} from './define';
import {accessSync} from 'fs';
import {CommanderStatic} from 'commander';

describe('postgres', () => {
    const getCore = async () => {
        const core = new Core();
        await core.setHosts({
            hosts: './test_data/postgres/hosts.yml',
            input: './test_data/postgres/db.yml',
            outDir: './test_data/postgres'
        });
        return core;
    };
    
    beforeAll(async () => {
        
    });

    it('create', async () => {
        const core = await getCore();
        const res = await core.execute(Command.create);
        expect(res).toBeTruthy();
    });
    
    it('updte', async () => {
        const core = await getCore();
        const res = await core.execute(Command.update);
        expect(res).toBeTruthy();
    });

    it('recreate', async () => {
        const core = await getCore();
        const res = await core.execute(Command.reCreate);
        expect(res).toBeTruthy();
    });

    it('diff', async () => {
        const core = await getCore();
        const res = await core.execute(Command.diff);
        expect(res).toBeTruthy();
    });

    it('extract', async () => {
        const core = await getCore();
        const res = await core.execute(Command.extract);
        expect(res).toBeTruthy();
    });
});

describe('mysql', () => {
    const getCore = async () => {
        const core = new Core();
        await core.setHosts({
            hosts: './test_data/mysql/hosts.yml',
            input: './test_data/mysql/db.yml',
            outDir: './test_data/mysql/',
        });
        return core;
    };
    
   
    beforeAll(async () => {
        
    });

    it('create', async () => {
        const core = await getCore();
        const res = await core.execute(Command.create);
        expect(res).toBeTruthy();
    });

    it('updte', async () => {
        const core = await getCore();
        const res = await core.execute(Command.update);
        expect(res).toBeTruthy();
    });

    it('recreate', async () => {
        const core = await getCore();
        const res = await core.execute(Command.reCreate);
        expect(res).toBeTruthy();
    });

    it('diff', async () => {
        const core = await getCore();
        const res = await core.execute(Command.diff);
        expect(res).toBeTruthy();
    });

    it('extract', async () => {
        const core = await getCore();
        const res = await core.execute(Command.extract);
        expect(res).toBeTruthy();
    });
});

describe('mssql', () => {
    const getCore = async () => {
        const core = new Core();
        await core.setHosts({
            hosts: './test_data/mssql/hosts.yml',
            input: './test_data/mssql/db.yml',
            outDir: './test_data/mssql/',
        });
        return core;
    };
    
    beforeAll(async () => {
        
    });

    it('create', async () => {
        const core = await getCore();
        const res = await core.execute(Command.create);
        expect(res).toBeTruthy();
    });

    it('updte', async () => {
        const core = await getCore();
        const res = await core.execute(Command.update);
        expect(res).toBeTruthy();
    });

    it('recreate', async () => {
        const core = await getCore();
        const res = await core.execute(Command.reCreate);
        expect(res).toBeTruthy();
    });

    it('diff', async () => {
        const core = await getCore();
        const res = await core.execute(Command.diff);
        expect(res).toBeTruthy();
    });

    it('extract', async () => {
        const core = await getCore();
        const res = await core.execute(Command.extract);
        expect(res).toBeTruthy();
    });
});
