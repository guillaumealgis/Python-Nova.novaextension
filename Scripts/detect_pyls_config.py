from __future__ import annotations

import json
import re
import sys
from importlib.metadata import PackageNotFoundError, requires
from importlib.metadata import version as installed_version
from typing import Any

PYLSP_PACKAGE_NAME = "python-lsp-server"

# https://github.com/python-lsp/python-lsp-server/blob/develop/pyproject.toml
KNOWN_PLUGINS = [
    "autopep8",
    "flake8",
    "mccabe",
    "pycodestyle",
    "pydocstyle",
    "pyflakes",
    "pylint",
    "rope",
    "yapf",
]


class ArgumentError(Exception):
    pass


class UnexpectedVirtualenvStructure(Exception):
    pass


class PythonBinNotFound(Exception):
    pass


class RequirementParserError(Exception):
    pass


def main():
    try:
        pylsp_package = Package.pylsp_package()
        plugin_packages = []
        for requirement_str in requires(pylsp_package.name):
            child_package = Package.from_requirement_str(requirement_str)
            if child_package.is_plugin:
                plugin_packages.append(child_package)

        packages = [pylsp_package] + plugin_packages
        packages_dict = [pkg.to_dict() for pkg in packages]

        python_version = sys.version_info

        sys.stdout.write(
            json.dumps(
                {
                    "python": f"{python_version.major}.{python_version.minor}.{python_version.micro}",
                    "packages": packages_dict,
                }
            )
        )

    except Exception as exc:  # pylint: disable=broad-exception-caught
        sys.stdout.write(json.dumps({"error": str(exc)}))
        sys.exit(1)


class Package:
    def __init__(self, name: str, version: str | None = None, extra: str | None = None):
        self.name = name
        self.version = version
        self.extra = extra

    @classmethod
    def pylsp_package(cls) -> Package:
        try:
            return cls(PYLSP_PACKAGE_NAME, installed_version(PYLSP_PACKAGE_NAME))
        except PackageNotFoundError as exc:
            raise PackageNotFoundError(
                f'Package "{PYLSP_PACKAGE_NAME}" is not installed'
            ) from exc

    @classmethod
    def from_requirement_str(cls, requirement: str) -> Package:
        match = re.match(
            r"(?P<name>[\w-]+)\s*?"
            r"(\s\(?(?P<version>[<>=,.0-9]+)\)?)?\s*"
            r"(;\s*extra\s*==\s*['\"](?P<extra>\w+)['\"])?",
            requirement,
        )
        if not match:
            raise RequirementParserError(
                f'Failed to parse package requirement "{requirement}"'
            )

        package_name = match["name"]
        try:
            package_version = installed_version(package_name)
        except PackageNotFoundError:
            package_version = None

        return cls(package_name, package_version, match["extra"])

    @property
    def type(self) -> str:
        if self.name == PYLSP_PACKAGE_NAME:
            return "main"
        return "plugin"

    @property
    def installed(self) -> bool:
        return self.version is not None

    @property
    def is_plugin(self) -> bool:
        return self.name in KNOWN_PLUGINS and self.extra == "all"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "type": self.type,
            "installed": self.installed,
        }


if __name__ == "__main__":
    main()
