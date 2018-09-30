import {Core} from './core';
import {Command} from './define';
import {accessSync} from 'fs';
import {CommanderStatic} from 'commander';

const dbTypes = [
    'postgres', 
    'mysql',
    'mssql'
];

dbTypes.forEach(dbType => {
    describe(dbType, () => {
        const getCore = async (dbFile = 'db') => {
            const core = new Core();
            await core.setHosts({
                hosts: `./test_data/${dbType}/hosts.yml`,
                input: `./test_data/${dbType}/${dbFile}.yml`,
                outDir: `./test_data/${dbType}`
            });
            return core;
        };

        beforeAll(async () => {
            

        });

        it('drop', async () => {
            const core = await getCore();
            const res = await core.execute(Command.drop);
            expect(res).toBeTruthy();
        });
        
        it('create', async () => {
            const core = await getCore();
            const res = await core.execute(Command.create);
            expect(res).toBeTruthy();
        });

        it('recreate', async () => {
            const core = await getCore();
            const res = await core.execute(Command.reCreate);
            expect(res).toBeTruthy();
        });

        it('updte', async () => {
            const core = await getCore('update');
            const res = await core.execute(Command.update);
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
});
