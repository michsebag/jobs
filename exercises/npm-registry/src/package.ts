import {RequestHandler} from "express";
import got from "got";
import {minSatisfying} from "semver";
import {NPMPackage} from "./types";
import {IDependency} from "./interfaces/IDependency";

/**
 * Attempts to retrieve package data from the npm registry and return it
 */
const npmUrl = 'https://registry.npmjs.org';

export const getPackage: RequestHandler = async function (req, res, next) {
    try {
        return await getPackageDependenciesTree(res, req)
    } catch (error) {
        return next(error);
    }
};

async function getPackageDependenciesTree(res, req) {
    const {name, version} = req.params;
    let dependencyTree = {};
    const npmPackage: NPMPackage = await got(
        `${npmUrl}/${name}`
    ).json();
    dependencyTree = await generateDependenciesTree(npmPackage, version)
    return res
        .status(200)
        .json({
            name: name,
            version: version,
            dependencies: dependencyTree
        });
}


async function generateDependenciesTree(npmPackage, version): Promise<IDependency[]> {
    const newDeps = npmPackage.versions[version].dependencies;
    let packageDependencies = Object.entries(newDeps || ({} as Object));
    const dependencyTree: IDependency[] = [];
    for (const [dependencyName, version] of packageDependencies) { // extract for
        const subDep = await getDependencies(dependencyName, version);
        const currentDependency: IDependency =  {
            name: dependencyName,
            version: version,
            dependencies: subDep
        };
        dependencyTree.push(currentDependency)
    }
    return dependencyTree
}

async function getDependencies(name, version) : Promise<IDependency[]> {
    return got(`${npmUrl}/${name}`)
        .json()
        .then((npmPackage: any) => {
            let lowestVersion = minSatisfying(Object.keys(npmPackage.versions), version);
            return lowestVersion ? generateDependenciesTree(npmPackage, lowestVersion) : [];
        });
}
