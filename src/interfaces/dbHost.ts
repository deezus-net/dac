export interface DbHost {
    type: string;
    host: string;
    port?: string;
    user: string;
    password: string;
    database: string;
    name?: string;
}