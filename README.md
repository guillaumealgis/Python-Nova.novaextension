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

- Real time Linting (Pyflakes):

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/realtimeLinting.png)

- Hover actions on Functions and Modules:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/hover.png)

- PyCodeStyle and PyDocStyle hints:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/doccode.gif)

- Autocomplete using Jedi:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/autoComplete.gif)

## License

Serpens is released under the MIT license. See LICENSE.md for details.

## Why "Serpens"?

It's the name of the [Constellation of the Snake](https://en.wikipedia.org/wiki/Serpens).
It's a play on words with Python (a snake) and Nova (an astronomical object).

## Contact

Guillaume Algis ([@guillaumealgis@fosstodon.org](https://fosstodon.org/@guillaumealgis))
