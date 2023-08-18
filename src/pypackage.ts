export class PythonSetup {
    constructor(
        public pythonVersion: string,
        public pylsPackage: PythonPackage,
        public pluginsPackages: PythonPackage[]
    ) {}
}

interface PackagesRootDict {
    readonly python: string;
    readonly packages: object[];
}

interface PackagesError {
    readonly error: string;
}

export type PythonPackageType = 'main' | 'plugin';

export class PythonPackage {
    public readonly name: string;
    public readonly type: PythonPackageType;
    public readonly version: string | null;

    constructor(name: string, type: PythonPackageType, version?: string) {
        this.name = name;
        this.type = type;
        this.version = version ?? null;
    }

    static deserialize(input: any): PythonPackage {
        return new PythonPackage(input.name, input.type, input.version);
    }

    get isInstalled(): boolean {
        return this.version != null;
    }
}

export function pythonPackagesFromJSON(jsonString: string): PythonSetup {
    const parseResult: PackagesRootDict | PackagesError = JSON.parse(jsonString);
    if ('error' in parseResult) {
        throw new Error(parseResult.error);
    }

    const packagesObjects = parseResult.packages;

    let pylsPackage: PythonPackage | null = null;
    let pluginsPackages: PythonPackage[] = [];
    for (const packageObject of packagesObjects) {
        const pyPackage = PythonPackage.deserialize(packageObject);
        if (pyPackage.type === 'main') {
            pylsPackage = pyPackage;
        } else {
            pluginsPackages.push(pyPackage);
        }
    }

    if (pylsPackage === null) {
        throw new Error('Main python language server package not found, did you install "python-lsp-server"?');
    }

    pluginsPackages = pluginsPackages.sort((lhs: PythonPackage, rhs: PythonPackage) => {
        return lhs.name.localeCompare(rhs.name);
    });

    return new PythonSetup(parseResult.python, pylsPackage, pluginsPackages);
}
