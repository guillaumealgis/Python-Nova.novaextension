'use strict';

import { conditionalAppendArgumentsToArray, parseJSON, parseList } from './utils';

let languageServer: PythonLanguageServer | null = null;

export function activate(): void {
    languageServer = new PythonLanguageServer();
}

export function deactivate(): void {
    if (languageServer) {
        languageServer.stop();
        languageServer = null;
    }
}

// Show a notification with the given title and body when in dev mode.
function showNotification(title: string, body?: string): void {
    if (nova.inDevMode()) {
        const request = new NotificationRequest();
        request.title = nova.localize(title);
        if (body !== undefined) {
            request.body = nova.localize(body);
        }
        nova.notifications.add(request);
    }
}

// Convenience function to parse preferences with workspace override and optionally return a default value.
function getPreference<T extends ConfigurationValue>(
    prefName: string,
    defaultValue?: T | null,
    workspace = false
): T | null {
    let pref: ConfigurationValue | null;
    if (workspace) {
        pref = nova.workspace.config.get(prefName);
    } else {
        pref = nova.config.get(prefName);
    }

    if (pref != null) {
        return pref as T;
    }
    if (defaultValue !== undefined) {
        return defaultValue;
    }
    return null;
}

// Convenience function to get the 'pyls.executable' preference, or default to an appropriate bin in the user's $PATH.
function getPyLSExecutablePreference(): string | null {
    return getPreference('pyls.executable', searchUsablePyLSExecutable());
}

// Try to find an appropriate bin for the PyLSP server in the user's $PATH.
function searchUsablePyLSExecutable(): string | null {
    const envPath = nova.environment['PATH'];
    if (envPath === undefined) {
        return null;
    }

    const possibleBins = ['pylsp', 'pyls'];
    const possiblePaths = envPath.split(':');
    for (const bin of possibleBins) {
        for (const path of possiblePaths) {
            const binPath = path + '/' + bin;
            if (nova.fs.access(binPath, nova.fs.F_OK | nova.fs.X_OK)) {
                return binPath;
            }
        }
    }

    return null;
}

// Return the appropriate settings namespace for the configured Python LSP implementation.
function getSettingsPyLSNamespace() {
    if (getPyLSExecutablePreference() === 'pyls') {
        return 'pyls';
    } else {
        // If the selected binary is not explicitly pyls, default to the fork
        // pylsp as it is more up to date and maintained.
        return 'pylsp';
    }
}

// Display a notification to the user if the plugin is configured to use 'python-language-server' as a server.
function alertDeprecatedServerIfNeeded(serverBinPath: string): void {
    const ignoreConfigName = nova.extension.identifier + '.alerted-deprecated-server';
    const isIgnoringAlert = nova.config.get(ignoreConfigName) === serverBinPath;

    if (isIgnoringAlert || nova.path.basename(serverBinPath) !== 'pyls') {
        return;
    }

    const notification = new NotificationRequest('python-nova-deprecated-server');

    notification.title = nova.localize('python-language-server is deprecated');
    notification.body = nova.localize(
        'You should install python-lsp-server instead, and update your "language server executable" path accordingly in the preferences.'
    );

    notification.actions = [nova.localize('OK'), nova.localize('More info'), nova.localize('Ignore')];

    const promise = nova.notifications.add(notification);
    promise.then(
        (reply) => {
            if (reply.actionIdx == 1) {
                nova.openURL(
                    'https://github.com/guillaumealgis/Serpens.novaextension#im-getting-an-alert-python-language-server-is-deprecated-what-is-this-about'
                );
            } else if (reply.actionIdx == 2) {
                nova.config.set(ignoreConfigName, serverBinPath);
            }
        },
        (error) => {
            console.error(error);
        }
    );
}

function resetDeprecatedServerAlert() {
    const ignoreConfigName = nova.extension.identifier + '.alerted-deprecated-server';
    nova.config.remove(ignoreConfigName);
}

// Get and return the preferences dictionary
function getSettings() {
    const pylsNamespace = getSettingsPyLSNamespace();
    const allSettings = {
        settings: {
            [pylsNamespace]: {
                env: {},
                configurationSources: [getPreference('pyls.configurationSources')],
                rope: {
                    extensionModules: getPreference('pyls.rope.extensionModules'),
                    ropeFolder: parseList(getPreference('pyls.rope.ropeFolder') ?? '')
                },
                plugins: {
                    jedi: {
                        enabled: getPreference('pyls.plugins.jedi.enabled'),
                        extra_paths: parseList(getPreference('pyls.plugins.jedi.extra_paths') ?? ''),
                        env_vars: parseJSON(getPreference('pyls.plugins.jedi.env_vars') ?? '{}'),
                        environment: (() => {
                            const workspaceValue = getPreference('pyls.plugins.jedi.workspace.environment', null, true);
                            if (workspaceValue) {
                                return workspaceValue;
                            } else {
                                return getPreference('pyls.plugins.jedi.environment');
                            }
                        })()
                    },
                    jedi_completion: {
                        enabled: getPreference('pyls.plugins.jedi_completion.enabled'),
                        fuzzy: getPreference('pyls.plugins.jedi_completion.fuzzy'),
                        include_params: getPreference('pyls.plugins.jedi_completion.include_params'),
                        include_class_objects: getPreference('pyls.plugins.jedi_completion.include_class_objects')
                    },
                    jedi_definition: {
                        enabled: getPreference('pyls.plugins.jedi_definition.enabled'),
                        follow_imports: getPreference('pyls.plugins.jedi_definition.follow_imports'),
                        follow_builtin_imports: getPreference('pyls.plugins.jedi_definition.follow_builtin_imports')
                    },
                    jedi_hover: {
                        enabled: getPreference('pyls.plugins.jedi_hover.enabled')
                    },
                    jedi_references: {
                        enabled: getPreference('pyls.plugins.jedi_references.enabled')
                    },
                    jedi_signature_help: {
                        enabled: getPreference('pyls.plugins.jedi_signature_help.enabled')
                    },
                    jedi_symbols: {
                        enabled: getPreference('pyls.plugins.jedi_symbols.enabled'),
                        all_scopes: getPreference('pyls.plugins.jedi_symbols.all_scopes')
                    },
                    mccabe: {
                        enabled: getPreference('pyls.plugins.mccabe.enabled'),
                        threshold: getPreference('pyls.plugins.mccabe.threshold')
                    },
                    preload: {
                        enabled: getPreference('pyls.plugins.preload.enabled'),
                        modules: parseList(getPreference('pyls.plugins.preload.modules') ?? '')
                    },
                    pycodestyle: {
                        enabled: getPreference('pyls.plugins.pycodestyle.enabled'),
                        exclude: parseList(getPreference('pyls.plugins.pycodestyle.exclude') ?? ''),
                        filename: parseList(getPreference('pyls.plugins.pycodestyle.filename') ?? ''),
                        select: parseList(getPreference('pyls.plugins.pycodestyle.select') ?? ''),
                        ignore: conditionalAppendArgumentsToArray(
                            getPreference('pyls.plugins.pycodestyle.disableLineLength') ?? false,
                            parseList(getPreference('pyls.plugins.pycodestyle.ignore') ?? ''),
                            'E501'
                        ),
                        hangClosing: getPreference('pyls.plugins.pycodestyle.hangClosing'),
                        maxLineLength: getPreference('pyls.plugins.pycodestyle.maxLineLength')
                    },
                    pydocstyle: {
                        enabled: getPreference('pyls.plugins.pydocstyle.enabled'),
                        convention: parseList(getPreference('pyls.plugins.pydocstyle.convention') ?? ''),
                        addIgnore: parseList(getPreference('pyls.plugins.pydocstyle.addIgnore') ?? ''),
                        addSelect: parseList(getPreference('pyls.plugins.pydocstyle.addSelect') ?? ''),
                        ignore: parseList(getPreference('pyls.plugins.pydocstyle.ignore') ?? ''),
                        select: parseList(getPreference('pyls.plugins.pydocstyle.select') ?? ''),
                        match: parseList(getPreference('pyls.plugins.pydocstyle.match') ?? ''),
                        matchDir: parseList(getPreference('pyls.plugins.pydocstyle.matchDir') ?? '')
                    },
                    pylint: {
                        enabled: getPreference('pyls.plugins.pylint.enabled'),
                        args: parseList(getPreference('pyls.plugins.pylint.args') ?? ''),
                        executable: getPreference('pyls.plugins.pylint.executable')
                    },
                    rope_completion: {
                        enabled: getPreference('pyls.plugins.rope_completion.enabled')
                    },
                    pyflakes: {
                        enabled: getPreference('pyls.plugins.pyflakes.enabled')
                    },
                    yapf: {
                        enabled: getPreference('pyls.plugins.yapf.enabled')
                    },

                    // Additional Plugin Preferences
                    pyls_mypy: {
                        enabled: getPreference('pyls.plugins.pyls_mypy.enabled'),
                        live_mode: getPreference('pyls.plugins.pyls_mypy.live_mode')
                    }
                }
            }
        }
    };
    return allSettings;
}

class PythonLanguageServer {
    languageClient: LanguageClient;

    constructor() {
        showNotification('Starting extension.');
        this.languageClient = this.initLanguageClient();
        this.start();

        this.addPreferenceObservers();
    }

    addPreferenceObservers() {
        const keys = [
            'pyls.configurationSources',
            'pyls.plugins.jedi.enabled',
            'pyls.plugins.jedi_completion.enabled',
            'pyls.plugins.jedi_definition.enabled',
            'pyls.plugins.jedi_hover.enabled',
            'pyls.plugins.jedi_references.enabled',
            'pyls.plugins.jedi_signature_help.enabled',
            'pyls.plugins.jedi_symbols.enabled',
            'pyls.plugins.preload.enabled',
            'pyls.plugins.rope_completion.enabled',
            'pyls.plugins.yapf.enabled',
            'pyls.plugins.mccabe.enabled',
            'pyls.plugins.pydocstyle.enabled',
            'pyls.plugins.pycodestyle.enabled',
            'pyls.plugins.pyflakes.enabled',
            'pyls.plugins.pylint.enabled',
            'pyls.plugins.jedi.extra_paths',
            'pyls.plugins.jedi.env_vars',
            'pyls.plugins.jedi.environment',
            'pyls.plugins.jedi_completion.include_params',
            'pyls.plugins.jedi_completion.include_class_objects',
            'pyls.plugins.jedi_completion.fuzzy',
            'pyls.plugins.jedi_definition.follow_imports',
            'pyls.plugins.jedi_definition.follow_builtin_imports',
            'pyls.plugins.jedi_symbols.all_scopes',
            'pyls.plugins.mccabe.threshold',
            'pyls.plugins.preload.modules',
            'pyls.plugins.pycodestyle.exclude',
            'pyls.plugins.pycodestyle.filename',
            'pyls.plugins.pycodestyle.select',
            'pyls.plugins.pycodestyle.ignore',
            'pyls.plugins.pycodestyle.hangClosing',
            'pyls.plugins.pycodestyle.disableLineLength',
            'pyls.plugins.pycodestyle.maxLineLength',
            'pyls.plugins.pydocstyle.convention',
            'pyls.plugins.pydocstyle.addIgnore',
            'pyls.plugins.pydocstyle.addSelect',
            'pyls.plugins.pydocstyle.ignore',
            'pyls.plugins.pydocstyle.select',
            'pyls.plugins.pydocstyle.match',
            'pyls.plugins.pydocstyle.matchDir',
            'pyls.plugins.pylint.args',
            'pyls.plugins.pylint.executable',
            'pyls.rope.ropeFolder',
            'pyls.rope.extensionModules',
            'pyls.plugins.pyls_mypy.enabled',
            'pyls.plugins.pyls_mypy.live_mode'
        ];
        for (const key of keys) {
            nova.config.onDidChange(key, async () => {
                console.log('Syncing preferences.');
                this.languageClient.sendNotification('workspace/didChangeConfiguration', getSettings());
            });
        }

        const reloadKeys = ['pyls.executable', 'pyls.enableLogging', 'pyls.logPath'];
        for (const key of reloadKeys) {
            nova.config.onDidChange(key, async () => {
                this.restart();
            });
        }

        nova.config.onDidChange('pyls.executable', async () => {
            resetDeprecatedServerAlert();
        });

        const workspaceKeys = ['pyls.plugins.jedi.workspace.environment'];
        for (const key of workspaceKeys) {
            nova.workspace.config.onDidChange(key, async () => {
                console.log('Syncing Workspace Preferences.');

                this.languageClient.sendNotification('workspace/didChangeConfiguration', getSettings());
            });
        }
    }

    initLanguageClient(): LanguageClient {
        interface ServerOptions {
            path: string;
            args?: string[];
        }

        const pylsExecutablePath = getPyLSExecutablePreference();
        if (pylsExecutablePath === null) {
            throw new Error('Unable to start Serpens: could not find a suitable PyLS executable');
        }

        const serverOptions: ServerOptions = {
            path: pylsExecutablePath
        };

        if (getPreference('pyls.enableLogging', false)) {
            serverOptions.args = ['-vv', '--log-file', getPreference('pyls.logPath') ?? '/tmp/pyls.log'];
        }

        const clientOptions = {
            syntaxes: ['python']
        };

        const client = new LanguageClient('PyLS', 'Python Language Server', serverOptions, clientOptions);
        return client;
    }

    start() {
        try {
            this.languageClient.start();
            this.languageClient.sendNotification('workspace/didChangeConfiguration', getSettings());
        } catch (err) {
            console.error(err);
        }
    }

    restart() {
        this.stop();
        this.start();
    }

    stop() {
        this.languageClient.stop();
    }
}
