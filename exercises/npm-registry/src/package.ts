import {RequestHandler} from "express";
import got from "got";
import {maxSatisfying} from "semver";
import {NPMPackage} from "./types";
import {IDependency} from "./interfaces/IDependency";

/**
 * Attempts to retrieve package data from the npm registry and return it
 */
const npmUrl = 'https://registry.npmjs.org';
const cacheMap = new Map();


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
    dependencyTree = await generateDependenciesTree(npmPackage, version, name)
    return res
        .status(200)
        .json({
            name: name,
            version: version,
            dependencies: dependencyTree
        });
}


async function generateDependenciesTree(npmPackage, version, path): Promise<IDependency[]> {
    const newDeps = npmPackage.versions[version].dependencies;
    let packageDependencies = Object.entries(newDeps || ({} as Object));
    const dependencyTree: IDependency[] = [];
    for (const [dependencyName, version] of packageDependencies) { // extract for
        if(path.contains(dependencyName)){
            continue;
        }
        if(cacheMap.has(dependencyName)){
            dependencyTree.push(cacheMap.get(dependencyName))
        }else{
            const subDep = await getDependencies(dependencyName, version, `${path}/${dependencyName}`);
            const currentDependency: IDependency =  {
                name: dependencyName,
                version: version,
                dependencies: subDep
            };
            dependencyTree.push(currentDependency)
            cacheMap.set(dependencyName, currentDependency);
        }
    }
    return dependencyTree
}

async function getDependencies(name, version, path) : Promise<IDependency[]> {
    return got(`${npmUrl}/${name}`)
        .json()
        .then((npmPackage: any) => {
            let maximalVersion = maxSatisfying(Object.keys(npmPackage.versions), version);
            return (maximalVersion && !path.contains(name)) ? generateDependenciesTree(npmPackage, maximalVersion, path) : [];
        });
}
