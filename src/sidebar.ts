import { PythonPackage, PythonSetup } from './pypackage';
import { Settings } from './settings';

const SIDEBAR_SECTION = 'serpens-pyls';

type SidebarNode = 'PythonInstall' | 'PyLSPythonPackage' | PythonPackage | 'Plugins' | TreeItem | Error;

class VersionTreeItem extends TreeItem {
    constructor(version?: string | null) {
        super('Version');
        this.descriptiveText = version ?? '?';
        this.image = 'tag';
    }
}

class EmptySidebarDataProvider implements TreeDataProvider<SidebarNode> {
    getChildren(_: SidebarNode | null): SidebarNode[] {
        return [];
    }

    getTreeItem(_: SidebarNode): TreeItem {
        throw new Error('Empty sidebar should never call getTreeItem()');
    }
}

class ErrorSidebarDataProvider implements TreeDataProvider<SidebarNode> {
    constructor(private error: Error) {}
    getChildren(element: SidebarNode | null): SidebarNode[] {
        if (element === null) {
            return [this.error, 'PythonInstall', 'PyLSPythonPackage'];
        } else if (element === 'PythonInstall') {
            return childrenTreeItemsForPythonInstall();
        } else {
            return childrenTreeItemsForPylsPackage();
        }
    }

    getTreeItem(element: SidebarNode): TreeItem {
        return treeItemForSidebarNode(element);
    }
}

class SidebarDataProvider implements TreeDataProvider<SidebarNode> {
    constructor(private pythonSetup: PythonSetup) {}

    getChildren(element: SidebarNode | null): SidebarNode[] {
        if (element === null) {
            return ['PythonInstall', 'PyLSPythonPackage'];
        } else if (element === 'PythonInstall') {
            return childrenTreeItemsForPythonInstall(this.pythonSetup);
        } else if (element === 'PyLSPythonPackage') {
            let nodes: SidebarNode[] = childrenTreeItemsForPylsPackage(this.pythonSetup);
            if (this.pythonSetup.pylsPackage) {
                nodes = nodes.concat('Plugins');
            }
            return nodes;
        } else if (element instanceof PythonPackage) {
            return childrenTreeItemsForPythonPackage(element);
        } else if (element === 'Plugins') {
            return this.pythonSetup.pluginsPackages;
        } else {
            return [];
        }
    }

    getTreeItem(element: SidebarNode): TreeItem {
        return treeItemForSidebarNode(element);
    }
}

function treeItemForSidebarNode(node: SidebarNode): TreeItem {
    if (node === 'PythonInstall') {
        let item = new TreeItem('Python', TreeItemCollapsibleState.Expanded);
        item.descriptiveText = '';
        item.image = 'python';
        return item;
    } else if (node === 'PyLSPythonPackage') {
        let item = new TreeItem('Python Language Server', TreeItemCollapsibleState.Expanded);
        item.descriptiveText = '';
        item.image = 'python';
        return item;
    } else if (node instanceof PythonPackage) {
        let item = new TreeItem(node.name, TreeItemCollapsibleState.Expanded);
        item.image = 'puzzlepiece';
        return item;
    } else if (node === 'Plugins') {
        return new TreeItem('Plugins', TreeItemCollapsibleState.Expanded);
    } else if (node instanceof TreeItem) {
        let item = new TreeItem(node.name);
        item.descriptiveText = node.descriptiveText;
        item.image = node.image;
        return item;
    } else {
        let item = new TreeItem(node.toString());
        item.descriptiveText = '';
        item.image = 'warn';
        return item;
    }
}

function childrenTreeItemsForPythonInstall(pythonSetup?: PythonSetup): TreeItem[] {
    let items: TreeItem[] = [];
    let pythonVersionItem = new VersionTreeItem(pythonSetup?.pythonVersion);
    items.push(pythonVersionItem);

    let venvPathItem = new TreeItem('Virtualenv Path');
    venvPathItem.descriptiveText = Settings.shared.humanReadableVirtualenvPath;
    venvPathItem.image = '__builtin.path';
    items.push(venvPathItem);
    return items;
}

function childrenTreeItemsForPylsPackage(pythonSetup?: PythonSetup): TreeItem[] {
    let items: TreeItem[] = [];

    items.push(new VersionTreeItem(pythonSetup?.pylsPackage.version));

    let pylsBinPathItem = new TreeItem('PyLS Binary Path');
    pylsBinPathItem.descriptiveText = Settings.shared.humanReadableLanguageServerBinPath;
    pylsBinPathItem.image = '__builtin.path';
    items.push(pylsBinPathItem);

    return items;
}

function childrenTreeItemsForPythonPackage(pyPackage: PythonPackage): TreeItem[] {
    let items: TreeItem[] = [];

    if (pyPackage.isInstalled) {
        const configProp = `${pyPackage.name}Enabled` as keyof Settings;
        const isEnabled = Settings.shared[configProp];
        if (isEnabled) {
            let pylsItem = new TreeItem('Enabled');
            pylsItem.descriptiveText = '';
            pylsItem.image = 'checkmark';
            items.push(pylsItem);
        } else {
            let pylsItem = new TreeItem('Disabled');
            pylsItem.descriptiveText = '';
            pylsItem.image = 'xmark';
            items.push(pylsItem);
        }

        items.push(new VersionTreeItem(pyPackage.version));
    } else {
        let pylsItem = new TreeItem('Not Installed');
        pylsItem.descriptiveText = '';
        pylsItem.image = 'xmark.diamond';
        items.push(pylsItem);
    }

    return items;
}

export function sidebarRefreshAsLoading() {
    new TreeView(SIDEBAR_SECTION, {
        dataProvider: new EmptySidebarDataProvider()
    });
}

export function sidebarRefreshContent(pythonSetup: PythonSetup) {
    new TreeView(SIDEBAR_SECTION, {
        dataProvider: new SidebarDataProvider(pythonSetup)
    });
}

export function sidebarRefreshWithError(error: Error) {
    new TreeView(SIDEBAR_SECTION, {
        dataProvider: new ErrorSidebarDataProvider(error)
    });
}
