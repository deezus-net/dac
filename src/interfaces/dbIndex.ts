export interface DbIndex {
    name?: string;
    columns: { [key: string]: string };
    unique: boolean;
}