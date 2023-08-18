import { PythonSetup, PythonPackage } from './pypackage';
import { Settings } from './settings';

const SIDEBAR_SECTION = 'serpens-pyls';

type SidebarNode = PythonPackage | 'plugins' | TreeItem | Error;

class VersionTreeItem extends TreeItem {
    constructor(version: string) {
        super('Version');
        this.descriptiveText = version;
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
    getChildren(_: Error): SidebarNode[] {
        let nodes: SidebarNode[] = sidebarItemsForPylsPackage();
        nodes = nodes.concat(this.error);
        return nodes;
    }

    getTreeItem(error: Error): TreeItem {
        return treeItemForSidebarNode(error);
    }
}

class SidebarDataProvider implements TreeDataProvider<SidebarNode> {
    constructor(private pythonSetup: PythonSetup) {}

    getChildren(element: SidebarNode | null): SidebarNode[] {
        if (element === null) {
            let nodes: SidebarNode[] = sidebarItemsForPylsPackage(
                this.pythonSetup.pylsPackage,
                this.pythonSetup.pythonVersion
            );
            if (this.pythonSetup.pylsPackage) {
                nodes = nodes.concat('plugins');
            }
            return nodes;
        } else if (element instanceof PythonPackage) {
            return sidebarItemsForPackage(element);
        } else if (element === 'plugins') {
            return this.pythonSetup.pluginsPackages;
        } else {
            return [];
        }
    }

    getTreeItem(element: SidebarNode): TreeItem {
        return treeItemForSidebarNode(element);
    }
}

function sidebarItemsForPackage(pyPackage?: PythonPackage): TreeItem[] {
    let items: TreeItem[] = [];

    if (pyPackage == null) {
        return [];
    }

    if (pyPackage.isInstalled) {
        items.push(new VersionTreeItem(pyPackage.version ?? ''));
    } else {
        let pylsItem = new TreeItem('Not Installed');
        pylsItem.descriptiveText = '';
        pylsItem.image = 'xmark.octagon';
        items.push(pylsItem);
    }

    return items;
}

function sidebarItemsForPylsPackage(pylsPackage?: PythonPackage, pythonVersion?: string): TreeItem[] {
    let items: TreeItem[] = [];

    let pylsItem = new TreeItem('Python Language Server');
    pylsItem.descriptiveText = '';
    pylsItem.image = 'python';
    items.push(pylsItem);

    items = items.concat(sidebarItemsForPackage(pylsPackage));

    let venvPathItem = new TreeItem('Virtualenv Path');
    venvPathItem.descriptiveText = Settings.shared.humanReadableVirtualenvPath;
    venvPathItem.image = '__builtin.path';
    items.push(venvPathItem);

    let pylsBinPathItem = new TreeItem('PyLS Binary Path');
    pylsBinPathItem.descriptiveText = Settings.shared.humanReadableLanguageServerBinPath;
    pylsBinPathItem.image = '__builtin.path';
    items.push(pylsBinPathItem);

    let pythonVersionItem = new TreeItem('Python Version');
    pythonVersionItem.descriptiveText = pythonVersion ?? '?';
    pythonVersionItem.image = 'tag';
    items.push(pythonVersionItem);

    return items;
}

function treeItemForSidebarNode(node: SidebarNode): TreeItem {
    if (node instanceof PythonPackage) {
        let item = new TreeItem(node.name, TreeItemCollapsibleState.Expanded);
        item.image = 'puzzlepiece';
        return item;
    } else if (node === 'plugins') {
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
