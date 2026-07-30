# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Automated Code Scanning

This repository uses GitHub CodeQL code scanning (default setup) on pull
requests and on `main`.

Scanning is scoped to **JavaScript/TypeScript** only. Swift is intentionally
excluded: the iOS target is a thin Capacitor wrapper whose only Swift is
generated boilerplate (`ios/App/App/AppDelegate.swift` and the Capacitor SPM
scaffolding), which carries no application logic to analyze. Leaving Swift in
the default setup caused the umbrella CodeQL check to report a
"configuration not found" neutral status on every PR — including changes that
touch no Swift — so it was removed. If hand-written native Swift is added
later, re-enable Swift in Settings → Code security → Code scanning.

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

<!-- codeql js/ts scoping verification -->
