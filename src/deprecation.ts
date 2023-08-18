import { Settings } from './settings';

// Display a notification to the user if we found the 'python-language-server' binary in the virtualenv.
export function alertDeprecatedServerIfNeeded(): void {
    if (Settings.shared.virtualenvPath === null) {
        return;
    }

    const ignoreConfigName = nova.extension.identifier + '.alerted-deprecated-server';
    const isIgnoringAlert = nova.config.get(ignoreConfigName) === Settings.shared.virtualenvPath;
    if (isIgnoringAlert) {
        return;
    }

    const deprecatedBinPath = nova.path.join(Settings.shared.virtualenvPath, 'bin', 'pyls');
    if (!nova.fs.access(deprecatedBinPath, nova.fs.X_OK)) {
        return;
    }

    const notification = new NotificationRequest('python-nova-deprecated-server');

    notification.title = nova.localize('Deprecated Language Server');
    notification.body = nova.localize(
        '"python-language-server" is no longer supported. You should install "python-lsp-server" instead.'
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
                nova.config.set(ignoreConfigName, deprecatedBinPath);
            }
        },
        (error) => {
            console.error(error);
        }
    );
}
