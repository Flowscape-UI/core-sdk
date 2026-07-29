# Security Policy

Security reports are taken seriously. Please report potential vulnerabilities privately so they can be investigated and fixed before public disclosure.

## Supported Versions

Security fixes are provided for the latest stable release of `@flowscape-ui/core-sdk`.

Older releases may not receive security updates. When a fix is published, users should upgrade to the latest stable version as soon as practical.

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for a suspected security vulnerability.

Use GitHub Private Vulnerability Reporting for this repository:

1. Open the repository on GitHub.
2. Go to **Security**.
3. Open **Advisories**.
4. Select **Report a vulnerability**.
5. Provide enough information for the issue to be reproduced and evaluated.

A useful report should include, when applicable:

- affected Flowscape version;
- affected package or subsystem;
- vulnerability type and potential impact;
- reproduction steps or a minimal proof of concept;
- browser, runtime, and operating system details;
- known mitigations or suggested fixes;
- whether the vulnerability has been disclosed elsewhere.

If private vulnerability reporting is unavailable, open a public issue that contains **no vulnerability details** and ask the maintainers for a private contact method.

## Disclosure Process

After receiving a report, maintainers will aim to:

1. acknowledge the report;
2. reproduce and assess the issue;
3. determine affected versions and severity;
4. prepare and validate a fix;
5. coordinate disclosure with the reporter when appropriate;
6. publish the fix and release notes or a security advisory when necessary.

Please avoid public disclosure until maintainers have had a reasonable opportunity to investigate and release a fix.

## Scope

Security reports may include issues in:

- `@flowscape-ui/core-sdk`;
- rendering and input systems;
- serialization and parsing;
- browser-facing code;
- build or distribution artifacts;
- dependencies when they create a practical vulnerability in Flowscape;
- official Flowscape applications or documentation when the issue can affect users.

General bugs, rendering artifacts, performance regressions, feature requests, and documentation problems should be reported through normal GitHub issues instead.

## Security Advisories

When appropriate, confirmed vulnerabilities may be documented through GitHub Security Advisories and included in the project changelog or release notes.

Thank you for helping keep Flowscape and its users secure.
