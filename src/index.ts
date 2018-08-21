#! /usr/bin/env node
import { Args } from './args';
const hosts = (new Args()).parse(process.argv);
console.log(hosts);

