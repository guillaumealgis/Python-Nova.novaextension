'use strict';

import { alertDeprecatedServerIfNeeded } from './deprecation';
import { pythonPackagesFromJSON } from './pypackage';
import { LanguageServerConfigurationArgs, Settings } from './settings';
import { sidebarRefreshAsLoading, sidebarRefreshContent, sidebarRefreshWithError } from './sidebar';

export let serpens: Serpens | null;

export function activate(): void {
    serpens = new Serpens();
}

export function deactivate(): void {
    if (serpens) {
        serpens.deactivate();
        serpens = null;
    }
}

class Serpens extends Disposable {
    private languageClient: LanguageClient | null = null;

    constructor() {
        super();

        nova.subscriptions.add(this);

        this.restartLanguageClient(() => {
            console.log('Python Language Server started.');
        });

        nova.commands.register('sidebar.reload', this.detectPylsSetup, this);
        nova.commands.register('restartLanguageClient', this.restartLanguageClientFromCommand, this);
        nova.commands.register('reloadLanguageServerConfiguration', this.reloadLanguageServerConfiguration, this);
    }

    deactivate() {
        this.stopLanguageClient();
    }

    stopLanguageClient() {
        if (this.languageClient) {
            this.languageClient.stop();
            this.languageClient = null;
        }
    }

    restartLanguageClientFromCommand(_: Workspace, onDidStart?: () => void) {
        this.restartLanguageClient(onDidStart);
    }

    restartLanguageClient(onDidStart?: () => void) {
        this.stopLanguageClient();

        this.languageClient = this.initializeLanguageClient();
        if (this.languageClient) {
            this.languageClient.start();

            // .start() is asynchronous, and Nova gives us no way of knowing
            // when the `initialized` notification has been issued.
            // So instead, we wait a bit before starting to send notifications.
            setTimeout(() => {
                this.reloadLanguageServerConfiguration();
                onDidStart?.();
            }, 500);
        }

        this.detectPylsSetup();
    }

    // Note: This may be called 7 times when a setting changes because of a bug
    // in Nova. This doesn't seems to be problematic as of today (we're just
    // spamming the LSP Server needlessly).
    // https://devforum.nova.app/t/nova-config-ondidchange-callback-invokes-7-times/2020/5
    reloadLanguageServerConfiguration(workspace?: Workspace, configKey?: string, value?: any) {
        if (this.languageClient == null) {
            return;
        }

        let config: LanguageServerConfigurationArgs;
        if (configKey != null && value != null) {
            config = Settings.shared.languageServerConfigurationForKey(configKey, value);
        } else {
            config = Settings.shared.languageServerConfiguration();
        }
        this.languageClient.sendNotification('workspace/didChangeConfiguration', config);
    }

    private initializeLanguageClient(): LanguageClient | null {
        const pylsBinPath = Settings.shared.languageServerBinPath;
        if (pylsBinPath == null) {
            if (Settings.shared.virtualenvPath != null) {
                alertDeprecatedServerIfNeeded();
            }
            return null;
        }

        const serverOptions: ServerOptions = {
            path: pylsBinPath
        };
        const clientOptions = {
            syntaxes: ['python']
        };
        const client = new LanguageClient('python', 'Python Language Server', serverOptions, clientOptions);
        client.onDidStop(this.onLanguageServerError, this);

        return client;
    }

    private onLanguageServerError(this: Serpens, error?: Error) {
        console.error('Python Language Server error:', error);
    }

    private detectPylsSetup() {
        sidebarRefreshAsLoading();

        if (Settings.shared.virtualenvPath === null) {
            const error = new Error('Expected a valid virtualenv path to be set');
            this.displayPylsSetupError(error);
            return;
        }

        const detectionScriptPath = nova.path.join(nova.extension.path, 'Scripts', 'detect_pyls_config.py');
        const options = {
            args: [detectionScriptPath, Settings.shared.virtualenvPath]
        };

        const pythonBinPath = Settings.shared.pythonBinPath;
        if (pythonBinPath == null) {
            const error = new Error('Unable to find a python binary in the provided virtualenv');
            this.displayPylsSetupError(error);
            return;
        }

        const process = new Process(pythonBinPath, options);
        process.onStdout((stdout: string) => {
            try {
                const pythonSetup = pythonPackagesFromJSON(stdout);
                sidebarRefreshContent(pythonSetup);
            } catch (error) {
                this.displayPylsSetupError(error as Error);
            }
        });
        process.start();
    }

    private displayPylsSetupError(error: Error) {
        console.error(error);
        sidebarRefreshWithError(error);
    }
}
