const EXTENSION_ROOT_IDENTIFIER = 'com.guillaumealgis.serpens';

type NovaSettingsTypes = {
    string: string;
    number: number;
    boolean: boolean;
    array: string[];
};

type SettingsTypes = NovaSettingsTypes & {
    path: string;
};

export class Settings {
    private static _instance: Settings;

    // https://stackoverflow.com/a/36978360/404321
    static get shared() {
        return this._instance || (this._instance = new this());
    }

    virtualenvPath: string | null = null;

    get humanReadableVirtualenvPath(): string {
        if (this.virtualenvPath === null) {
            return this.humanReadablePath(null);
        }

        return this.humanReadablePath(this.virtualenvPath);
    }

    get pythonBinPath(): string | null {
        return this.getBinPathInVirtualenv('python');
    }

    get languageServerBinPath(): string | null {
        return this.getBinPathInVirtualenv('pylsp');
    }

    get humanReadableLanguageServerBinPath(): string {
        if (this.virtualenvPath === null) {
            return this.humanReadablePath(null);
        }

        return this.humanReadablePath(this.languageServerBinPath);
    }

    // Internals

    private constructor() {
        this.migrateSettings();
        this.registerSettings();
    }

    private migrateSettings() {
        this.migrateSetting('pyls.executable', 'virtualenvPath', this.convertPylsBinPathToVirtualenvPath);
    }

    private registerSettings() {
        this.registerSetting('virtualenvPath', 'path', undefined, () => {
            nova.commands.invoke('reloadLanguageClient');
        });
    }

    private registerSetting<K extends keyof this>(
        settingsPropName: K,
        settingType: keyof SettingsTypes,
        configKeyOrNil?: string,
        onDidChange?: (newValue: this[K], oldValue: this[K]) => void
    ) {
        let configKey = configKeyOrNil ?? settingsPropName.toString();
        configKey = EXTENSION_ROOT_IDENTIFIER + '.' + configKey;

        const value = this.getSetting(configKey, settingType) as this[K];
        this[settingsPropName] = value;

        const onDidChangeWrapper = (_: this[K], oldValue: this[K]) => {
            const newValue = this.getSetting(configKey, settingType) as this[K];
            this[settingsPropName] = newValue;

            if (onDidChange) {
                onDidChange(newValue, oldValue);
            }
        };

        nova.config.onDidChange(configKey, onDidChangeWrapper);
        nova.workspace.config.onDidChange(configKey, onDidChangeWrapper);
    }

    private getSetting<K extends keyof SettingsTypes>(key: string, type: K): SettingsTypes[K] | null {
        let pref: ConfigurationValue | null;

        let coercionType: keyof NovaSettingsTypes;
        if (type === 'path') {
            coercionType = 'string' as const;
        } else {
            coercionType = type;
        }

        // https://github.com/microsoft/TypeScript/issues/17471

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        pref = nova.workspace.config.get(key, coercionType);
        if (pref == null) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            pref = nova.config.get(key, coercionType);
        }

        if (pref != null) {
            if (type === 'path' && typeof pref === 'string') {
                pref = nova.path.expanduser(pref);
            }
            return pref as SettingsTypes[K];
        }
        return null;
    }

    // Migrate legacy config values from keys defined by mmshivesh's Python-Nova extension.
    private migrateSetting<T extends ConfigurationValue>(
        legacyConfigKey: string,
        newConfigKey: string,
        valueTransformationFunc?: (value: T) => T | null
    ) {
        newConfigKey = EXTENSION_ROOT_IDENTIFIER + '.' + newConfigKey;

        const newWorkspaceValue = nova.workspace.config.get(newConfigKey);
        if (newWorkspaceValue === null) {
            const legacyWorkspaceValue = nova.workspace.config.get(legacyConfigKey) as T;
            if (legacyWorkspaceValue !== null) {
                let newWorkspaceValue = null;
                if (valueTransformationFunc !== undefined) {
                    newWorkspaceValue = valueTransformationFunc(legacyWorkspaceValue);
                }
                if (newWorkspaceValue !== null) {
                    nova.workspace.config.set(newConfigKey, newWorkspaceValue);
                }
            }
        }
        nova.workspace.config.remove(legacyConfigKey);

        const newGlobalValue = nova.config.get(newConfigKey);
        if (newGlobalValue === null) {
            const legacyGlobalValue = nova.config.get(legacyConfigKey) as T;
            if (legacyGlobalValue !== null) {
                let newGlobalValue = null;
                if (valueTransformationFunc !== undefined) {
                    newGlobalValue = valueTransformationFunc(legacyGlobalValue);
                }
                if (newGlobalValue !== null) {
                    nova.config.set(newConfigKey, newGlobalValue);
                }
            }
        }
        nova.config.remove(legacyConfigKey);
    }

    private convertPylsBinPathToVirtualenvPath(pylsBinPath: string): string | null {
        pylsBinPath = nova.path.normalize(pylsBinPath);
        const pylsBinPathParts = nova.path.split(pylsBinPath);
        if (pylsBinPathParts.length < 4) {
            return null;
        }
        const venvPathParts = pylsBinPathParts.slice(0, -2);
        const venvPath = nova.path.join(...venvPathParts);
        return venvPath;
    }

    private getBinPathInVirtualenv(binName: string): string | null {
        if (this.virtualenvPath == null) {
            return null;
        }

        const binPath = nova.path.join(this.virtualenvPath, 'bin', binName);
        if (!nova.fs.access(binPath, nova.fs.X_OK)) {
            return null;
        }
        return binPath;
    }

    private humanReadablePath(path: string | null): string {
        if (path === null) {
            return 'Not Found';
        }

        const userDir = nova.path.expanduser('~');
        if (path.startsWith(userDir)) {
            return path.replace(userDir, '~');
        }
        return path;
    }

    //     // Try to find an appropriate bin for the PyLSP server in the user's $PATH.
    //     private searchUsablePyLSExecutable(): string | null {
    //         const envPath = nova.environment['PATH'];
    //         if (envPath === undefined) {
    //             return null;
    //         }
    //
    //         const possibleBins = ['pylsp', 'pyls'];
    //         const possiblePaths = envPath.split(':');
    //         for (const bin of possibleBins) {
    //             for (const path of possiblePaths) {
    //                 const binPath = path + '/' + bin;
    //                 if (nova.fs.access(binPath, nova.fs.F_OK | nova.fs.X_OK)) {
    //                     return binPath;
    //                 }
    //             }
    //         }
    //
    //         return null;
    //     }
}
