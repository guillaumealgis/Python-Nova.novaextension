const EXTENSION_ROOT_IDENTIFIER = 'com.guillaumealgis.serpens';

// https://github.com/python-lsp/python-lsp-server/blob/develop/CONFIGURATION.md
export interface LanguageServerConfigurationArgs {
    settings: LanguageServerSettings;
}

interface LanguageServerSettings {
    pylsp: PYLSPSettings;
}

interface PYLSPSettings {
    configurationSources?: ['pycodestyle' | 'flake8'];
    rope?: AnySettings;
    plugins?: AnySettings;
}

type AnySettings = { [key: string]: any };

type NovaSettingsTypes = {
    string: string;
    number: number;
    boolean: boolean;
    array: string[];
};

export type SettingsTypes = NovaSettingsTypes & {
    path: string;
};

interface RegisteringOptions {
    restartsLanguageServer?: boolean;
    reloadsLanguageServerConfig?: boolean;
    reloadsSidebar?: boolean;
}

export class Settings {
    private static _instance: Settings;

    // FIXME: The onDidChange callback for settings will be called 7 times each
    // time a setting changes because of a bug in Nova.
    // https://devforum.nova.app/t/nova-config-ondidchange-callback-invokes-7-times/2020/5
    // To prevent this we're always waiting a bit (a couple of ms) before running
    // the callback for a setting again, and storing the keys of the settings in
    // timeout here.
    private _onDidChangeTimeoutKeys: Set<string> = new Set();

    // https://stackoverflow.com/a/36978360/404321
    static get shared() {
        return this._instance || (this._instance = new this());
    }

    virtualenvPath: string | null = null;

    autopep8Enabled: boolean = false;
    flake8Enabled: boolean = false;
    mccabeEnabled: boolean = false;
    pycodestyleEnabled: boolean = false;
    pydocstyleEnabled: boolean = false;
    pyflakesEnabled: boolean = false;
    pylintEnabled: boolean = false;
    ropeEnabled: boolean = false;
    yapfEnabled: boolean = false;

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

    // LSP configuration

    languageServerConfiguration(): LanguageServerConfigurationArgs {
        return {
            settings: {
                pylsp: {
                    plugins: {
                        autopep8: {
                            enabled: this.autopep8Enabled
                        },
                        flake8: {
                            enabled: this.flake8Enabled
                        },
                        mccabe: {
                            enabled: this.mccabeEnabled
                        },
                        pycodestyle: {
                            enabled: this.pycodestyleEnabled
                        },
                        pydocstyle: {
                            enabled: this.pydocstyleEnabled
                        },
                        pyflakes: {
                            enabled: this.pyflakesEnabled
                        },
                        pylint: {
                            enabled: this.pylintEnabled
                        },
                        rope_autoimport: {
                            enabled: this.ropeEnabled
                        },
                        rope_completion: {
                            enabled: this.ropeEnabled
                        },
                        yapf: {
                            enabled: this.yapfEnabled
                        }
                    }
                }
            }
        };
    }

    // Internals

    private constructor() {
        this.migrateSettings();
        this.registerSettings();
    }

    private registerSettings() {
        this.registerSetting('virtualenvPath', 'path', null, { restartsLanguageServer: true });

        const reloadsConfigAndSidebar = { reloadsLanguageServerConfig: true, reloadsSidebar: true };
        this.registerSetting('autopep8Enabled', 'boolean', 'plugins.autopep8.enabled', reloadsConfigAndSidebar);
        this.registerSetting('flake8Enabled', 'boolean', 'plugins.flake8.enabled', reloadsConfigAndSidebar);
        this.registerSetting('mccabeEnabled', 'boolean', 'plugins.mccabe.enabled', reloadsConfigAndSidebar);
        this.registerSetting('pycodestyleEnabled', 'boolean', 'plugins.pycodestyle.enabled', reloadsConfigAndSidebar);
        this.registerSetting('pydocstyleEnabled', 'boolean', 'plugins.pydocstyle.enabled', reloadsConfigAndSidebar);
        this.registerSetting('pyflakesEnabled', 'boolean', 'plugins.pyflakes.enabled', reloadsConfigAndSidebar);
        this.registerSetting('pylintEnabled', 'boolean', 'plugins.pylint.enabled', reloadsConfigAndSidebar);
        this.registerSetting('ropeEnabled', 'boolean', 'plugins.rope.enabled', reloadsConfigAndSidebar);
        this.registerSetting('yapfEnabled', 'boolean', 'plugins.yapf.enabled', reloadsConfigAndSidebar);
    }

    private registerSetting<K extends keyof this>(
        settingsPropName: K,
        settingType: keyof SettingsTypes,
        configKeyOrNull: string | null = null,
        options: RegisteringOptions,
        onDidChange?: (newValue: this[K], oldValue: this[K]) => void
    ) {
        let configKey = configKeyOrNull ?? settingsPropName.toString();
        configKey = EXTENSION_ROOT_IDENTIFIER + '.' + configKey;

        const value = this.getSetting(configKey, settingType) as this[K];
        this[settingsPropName] = value;

        const onDidChangeWrapper = (_: this[K], oldValue: this[K]) => {
            // Begin fix for Nova bug (see _onDidChangeTimeoutKeys).
            if (this._onDidChangeTimeoutKeys.has(configKey)) {
                return;
            }

            this._onDidChangeTimeoutKeys.add(configKey);
            setTimeout(() => {
                this._onDidChangeTimeoutKeys.delete(configKey);
            }, 10);
            // End fix

            const newValue = this.getSetting(configKey, settingType) as this[K];
            this[settingsPropName] = newValue;

            if (options.restartsLanguageServer) {
                nova.commands.invoke('restartLanguageClient');
            }
            if (options.reloadsLanguageServerConfig) {
                nova.commands.invoke('reloadLanguageServerConfiguration', configKey, newValue as any);
            }
            if (options.reloadsSidebar) {
                nova.commands.invoke('sidebar.reload');
            }

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

        // Get the workspace-level preference.
        const workspacePref = nova.workspace.config.get(key);
        if (coercionType === 'boolean' && typeof workspacePref === 'string') {
            // If we're expecting a boolean value, the workspace may return a string
            // instead, as part of a 3-value enum : "inherited", "true", and "false".
            if (workspacePref === 'inherited') {
                pref = null;
            } else {
                pref = toBoolean(workspacePref);
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            pref = nova.workspace.config.get(key, coercionType);
        }

        // Get the global-level preference.
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

    private migrateSettings() {
        this.migrateSetting('pyls.executable', 'virtualenvPath', this.convertPylsBinPathToVirtualenvPath);
        this.migrateSetting('pyls.plugins.mccabe.enabled', 'plugins.mccabe.enabled');
        this.migrateSetting('pyls.plugins.pycodestyle.enabled', 'plugins.pycodestyle.enabled');
        this.migrateSetting('pyls.plugins.pydocstyle.enabled', 'plugins.pydocstyle.enabled');
        this.migrateSetting('pyls.plugins.pyflakes.enabled', 'plugins.pyflakes.enabled');
        this.migrateSetting('pyls.plugins.pylint.enabled', 'plugins.pylint.enabled');
        this.migrateSetting('pyls.plugins.yapf.enabled', 'plugins.yapf.enabled');
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
    }

    // Utils

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

function toBoolean(value: string | boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (value.toLowerCase() === 'true') {
        return true;
    } else {
        return false;
    }
}
