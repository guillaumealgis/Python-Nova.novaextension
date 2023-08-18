'use strict';

import { alertDeprecatedServerIfNeeded } from './deprecation';
import { pythonPackagesFromJSON } from './pypackage';
import { Settings } from './settings';
import { sidebarRefreshContent, sidebarRefreshAsLoading, sidebarRefreshWithError } from './sidebar';

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

        this.reloadLanguageClient();

        nova.commands.register('sidebar.reload', this.detectPylsSetup, this);
        nova.commands.register('reloadLanguageClient', this.reloadLanguageClient, this);
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

    reloadLanguageClient() {
        this.stopLanguageClient();

        this.languageClient = this.initializeLanguageClient();
        if (this.languageClient) {
            this.languageClient.start();
        }

        this.detectPylsSetup();
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
