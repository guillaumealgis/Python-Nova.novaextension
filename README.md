# ⚠️ Development paused

**I sadly don't have the time and energy to maintain this extension right now.**
**I don't know if I'll ever come back to it.**

-----------------------

# Serpens for Nova

<p align="center">
  <img alt="Serpens Logo"
    src="https://raw.githubusercontent.com/guillaumealgis/Serpens.novaextension/assets/serpens.png"
    srcset="
      https://raw.githubusercontent.com/guillaumealgis/Serpens.novaextension/assets/serpens.png 1x,
      https://raw.githubusercontent.com/guillaumealgis/Serpens.novaextension/assets/serpens@2x.png 2x
    " />
</p>

Full featured Python Language Server plugin (implements [PyLS](https://github.com/python-lsp/python-lsp-server)) for Nova, supports Jedi Autocomplete, PyFlakes, PyLint, and more.

## Installation

1. Install the LSP server and its dependencies using:

(Preferably in a [virtual environment](https://docs.python.org/3/tutorial/venv.html) if you want to keep things clean on your machine)

```bash
pip install 'python-lsp-server[all]'
```

2. (Optional) Install Python Language Server plugins and enable them from settings:

```bash
pip install pyls-pluginname
```

For example:

```bash
pip install pyls-flake8
```

3. Enable the plugins you want to use in the Preferences of the Serpens extension.

## Features

-   Real time Linting (Pyflakes):

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/realtimeLinting.png)

-   Hover actions on Functions and Modules:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/hover.png)

-   PyCodeStyle and PyDocStyle hints:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/doccode.gif)

-   Autocomplete using Jedi:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/autoComplete.gif)

## Troubleshooting

### I'm getting an alert "python-language-server is deprecated", what is this about?

<img alt="A Nova alert, titled 'python-language-server is deprecated'"
    src="https://raw.githubusercontent.com/guillaumealgis/Serpens.novaextension/assets/python-lsp-server-alert.png" />

If you are seeing this alert, the language server executable path currently set in the Serpens preferences is pointing to a deprecated `python-language-server` binary. We advise you to update (or remake) your Python virtual environment with the `python-lsp-server` package instead, and update the extension preferences accordingly.

See [Installation](https://github.com/guillaumealgis/Serpens.novaextension#installation) up top for more info on how to setup a virtual environment for this extension.

#### Why is `python-language-server` deprecated?

The original Palantir `python-language-server` [project](https://github.com/palantir/python-language-server) [is abandoned](https://github.com/palantir/python-language-server/issues/935), and several LSP plugins have been moving to its [community fork](https://github.com/python-lsp/python-lsp-server) : `python-lsp-server`.

So in December of 2021, [it was decided](https://github.com/mmshivesh/Python-Nova.novaextension/pull/18) that this extension would encourage users to install the `python-lsp-server` package.

If you wish to continue using `python-language-server` and don't want to see this warning each time the extension is started, click the "Ignore" button, and the alert will never be shown again.

## License

Serpens is released under the MIT license. See LICENSE.md for details.

## Why "Serpens"?

It's the name of the [Constellation of the Snake](https://en.wikipedia.org/wiki/Serpens).
It's a play on words with Python (a snake) and Nova (an astronomical object).

## Contact

Guillaume Algis ([@guillaumealgis@fosstodon.org](https://fosstodon.org/@guillaumealgis))
