# Contributing

Small, focused improvements are welcome.

## Make a change

1. Read the [project rules](AGENTS.md) and follow the [development setup](development.md#run-locally).
2. Keep the change focused on iPhone. Preserve released data and backups; follow the [data format guide](development.md#data-format) when needed.
3. Add regression coverage for data or asynchronous failures where practical.
4. Run `bun run verify` after your final edit. Fix failures before pushing.

## Open a pull request

- Explain the problem, the resulting behavior, and how you checked it.
- Report iPhone checks you could not run.
- Exclude credentials and personal travel data.
- Credit borrowed code, assets, and data. Include their licenses and preserve original notices.

## Contribution terms

Original contributions use **GNU GPL version 3 or later** with the **[Apple App Store permission](COPYING.iOS)**. By submitting work for inclusion, you agree to these terms. You keep your copyright.

Contribute only work you can license on these terms, with employer permission where needed. Third-party licenses must allow distribution; our permission does not extend to third-party GPL-only code.

## App Store permission

The [GPL](LICENSE) is unchanged. The permission follows [Nextcloud iOS’s wording](https://github.com/nextcloud/ios/blob/b8a008690b443493f4a31d2f4e243b65d74737c2/COPYING.iOS), with the project name changed. Follow the [source release checklist](development.md#source-and-license-obligations) for source access and notices.
