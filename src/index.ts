#! /usr/bin/env node
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { promisify } from 'util';
import { Args } from './args';
import {DbHost} from './interfaces/dbHost';

async function main() {
    const text = await promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
    const hosts = yaml.safeLoad(text) as {[key: string]: DbHost};
    console.log(hosts);

}

main();
