var program = require("commander");

export class Args{
    constructor(){
    }


    parse(argv) {
        const hosts = [];
        program
        .option('-t, --type <s>', 'Database type. (postgres or mysql or mssql) (required if not use hosts)')
        .option("-H, --hosts <s>", "Hosts file path.")
        .option("-h, --host <s>", "Database server / DataBase name when use hosts file. (required if not use hosts)")
        .option("-p, --port <s>", "Database port. (required if not use hosts)")
        .option("-d, --database <s>", "Database name. (required if not use hosts)")
        .option("-u, --user <s>", "Database user. (required if not use hosts)")
        .option("-P, --password <s>", "Database password. (required if not use hosts)")
        .option("-i, --input <s>", "Yaml path.")
        .option("-o", "--output <s>", "output when extracting, querying.")
        .parse(argv);
      
        if (argv.length < 3) {
          program.help();
        }
        if(program.hosts !== undefined){

        
        } else {
            hosts.push({
                type: program.type,
                host: program.host,
                port: program.port,
                user: program.user,
                password: program.password,
                database: program.database
            });

        }

        return hosts;
    }
        
};