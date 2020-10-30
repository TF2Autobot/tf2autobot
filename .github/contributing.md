<!--
Inspiration from https://github.com/atom/atom/blob/master/CONTRIBUTING.md
-->

# Contributing to TF2Autobot

The following is a set of guidelines for contributing to TF2Autobot. These are guidelines and not rules, use your own judgement and feel free to propose changes to this in a pull request.

## Table of Contents

[How can I contribute?](#how-to-contribute)

* [Reporting bugs](#reporting-bugs)
* [Suggesting changes](#suggesting-changes)
* [Pull requests](#pull-requests)

[Styleguides](#styleguides)

* [Git commit messages](#git-commit-messages)
* [Typescript Styleguide](#typescript-styleguide)
* [Documentation Styleguide](#documentation-styleguide)

## How to contribute

### Reporting bugs

Please don't use GitHub issues for questions, we have a [TF2Autobot Discord server](https://discord.gg/ZrVT7mc) for that.

Before creating bug reports, please check [this list](#before-submitting-a-bug-report) as you might find that you don't need to create one. When creating a bug report please include as many details as possible.

* **Make sure that it an actual problem.** You might be able to find the cause of the problem and fix it yourself. Most importantly, check if you can reproduce the problem.
* **Check perviously made issues** to see if the problem has already been reported. If it has **and the issue is still open**, add a comment to the existing issue instead of opening a new one.
* **Ask for help in the [TF2Autobot Discord server](https://discord.gg/ZrVT7mc).** Someone might know the issue and tell you what to do to fix it.

#### How to submit a bug report

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). After you have determined that it is a bug, create an issue and provide following information by filling in [the template](https://github.com/idinium96/tf2autobot/blob/master/.github/ISSUE_TEMPLATE/bug_report.md).

#### Before submitting a bug report

Explain the problem and include additional details to help reproduce the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem.**
* **Describe the behavior you observed following the steps** and point out what the problem is with the behavior.
* **Describe what you expected to see instead and why.**
* **Include screenshots and GIFs** which show you following the described steps and clearly demonstrate the problem.
* **If you're reporting that TF2Autobot crashed** then include the crash report with a stack trace. Crash reports are saved in `~/tf2autobot/logs/<STEAM_ACCOUNT_NAME>.error.log`.

Provide more context by answering these questions:

* **What version are you running?**

### Suggesting changes

This section guides you through submitting a feature request including new features or improvements. Following the guidelines helps people to understand your suggestion.

Before suggesting changes, please check [this list](#before-submitting-a-feature-request) as you might find that you don't need to create one. When creating a feature request please include as many details as possible.

#### How to suggest changes

Just like [bug reports](#reporting-bugs), feature requests are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue and fill in the [the template](https://github.com/idinium96/tf2autobot/blob/master/.github/ISSUE_TEMPLATE/feature_request.md).

#### Before submitting a feature request

* **Check if the feature already exists.**
* **Check perviously made issues** to see if the feature was already requested. If it was **and the issue is still open**, add a comment to the existing issue instead of opening a new one.

### Pull requests

When contributing to this repository, please first discuss the change you wish to make via issue, or any other method with the owners or contributors of this repository before making a change.

All pull requests should be made to [the development branch](https://github.com/idinium96/tf2autobot/tree/development). When a new release is made the development branch will be merged with the master branch.

Please make sure that you follow the [style guides](#styleguides).

## Styleguides

### Git commit messages

* Use the present tense ("add feature" not "added feature")
* Keep the messages short and simple
* First line should:
  * contain a short description of the change (preferably 50 characters or less, and no more than 72 characters)
  * be entirely in lowercase with the exception of proper nouns, acronyms, and the words that refer to code, like function/variable names
  * be prefixed with the name of the changed
  * use present tense ("add feature" not "added feature")
* Keep the second line blank
* Wrap all other lines at 72 characters (except for long URLs)
* If your patch fixes an open issue, you can add a reference to it at the end of the log. Use the `Fixes:` prefix and the full issue URL. For other references use `Refs:`

Example of a complete commit message:

```txt
src: explain the commit on one line

The body of the commit message should be one or more paragraphs, explaining
things in more detail. Please word-wrap to keep columns to 72 characters or
less.

Fixes: https://github.com/Nicklason/tf2autobot/issues/1337
Refs: https://eslint.org/docs/rules/space-in-parens.html
```

### Typescript Styleguide

All Typescript must follow the eslint rules made.

To enable eslint, install it globally using `npm install -g eslint`. It can be used either using the command `npm run lint`, or by installing [an extention](https://eslint.org/docs/6.0.0/user-guide/integrations) to your editor.

### Documentation Styleguide

* Use [TSDoc](https://github.com/microsoft/tsdoc)
* Use [Markdown](https://guides.github.com/features/mastering-markdown/)

#### Example

```ts
/**
 * Signs in to Steam and catches login error
 * @param loginKey
 */
function login (loginKey?: string|null): Promise<void> {
    // ...
}
```
