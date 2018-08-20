#! /usr/bin/env node
import { Args } from './args';
let hosts = (new Args()).parse(process.argv);
console.log(hosts);