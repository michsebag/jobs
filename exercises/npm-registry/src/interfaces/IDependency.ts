export interface IDependency{
    name: string
    version: any;
    dependencies: IDependency[];
}
