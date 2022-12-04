# Contributing

If you wish to contribute to Serpens please fork the repository and send a pull request. Contributions and feature requests are always welcome, please do not hesitate to raise an issue!

Contributors and any people interacting on this project are expected to adhere to its code of conduct. See CODE_OF_CONDUCT.md for details.

## Getting Started

Serpens uses [Typescript](https://www.typescriptlang.org). You need to install Typescript before you can work on the extension.

The easiest way to install Typescript is using [Homebrew](https://brew.sh/) and npm:

```bash
# Assuming that you have homebrew installed
brew install npm
```

```bash
# This will install all required tools / dependencies to work on the extension
npm install
```

## Compiling the `.ts` files

While working, run the following command to have the Typescript compiler automatically re-compile the `.ts` files in `src/` into Javascript `.js` files in `Scripts/`:

```bash
npx tsc --watch
```

## Linting

Ensure your code is well formatted using Prettier:

```bash
# Warning! This will overwrite your code!
npx prettier --write src
```

And that no warnings nor errors are raised by ESLint:

```bash
npx eslint src
```
