# PastPins

An offline travel atlas for iPhone. Keep track of where you’ve been, where you’ve lived, and where you want to go.

**Status:** v1 is in development and has not been released.

[Website](https://kkd16.github.io/past-pins/) · [Privacy policy](https://kkd16.github.io/past-pins/privacy/) · [Support](https://kkd16.github.io/past-pins/support/)

## Features

- Explore an interactive globe, world map, and regional maps with offline search.
- Mark countries and regions as Visited, Lived, or Wishlist; set your current home.
- Organize places into custom lists and follow your travel statistics and stamp collection.
- Share map, list, and stamp images through the iOS share sheet.
- Enable optional country arrival reminders, with confirmation before changing your travel record.
- Export and restore backups, recover saved data, or reset the app from Settings.

PastPins is designed exclusively for iPhone, with native controls, Dynamic Type, VoiceOver support, and Reduce Motion. iPad is not supported.

## Your data

Travel data is stored locally. There are no accounts or app-managed cloud sync. Browsing and editing work offline; location and arrival reminders are optional. Export a backup outside the app to protect against device loss or uninstalling.

Diagnostics stay local and are shared only when you choose to export them. They contain technical error codes, not travel records or coordinates. Backup files contain your travel data.

## Development

Built with Expo, React Native, TypeScript, and Bun. See [development.md](development.md) for setup, project structure, migrations, testing, and the TestFlight → App Store workflow.

## License and contributions

PastPins is licensed under the **GNU GPL version 3 or any later version**, with
the **Apple App Store permission** in [COPYING.iOS](COPYING.iOS).

**Earlier work is included.** This grant covers Kyle Deliyannides's original,
owned work in earlier commits and tags, including revisions made before the
license files were added. See [NOTICE](NOTICE) for the explicit grant; include
these license files when distributing an earlier revision.

| You can… | What to keep in mind |
| --- | --- |
| Use, modify, and redistribute the app, including commercially | Distributed versions must meet the GPL's source-code and license obligations. |
| Distribute through the App Store | The exception preserves those source-code obligations. |
| Make private changes | You do not have to publish them. The GPL requires source access for recipients, not necessarily a public GitHub repository. |
| Contribute improvements | Follow [CONTRIBUTING.md](CONTRIBUTING.md). |

Read the full [LICENSE](LICENSE) and project [NOTICE](NOTICE). Third-party
materials keep their own licenses. PastPins is provided without warranty as
described in the GPL. The exception follows
[Nextcloud iOS's wording](https://github.com/nextcloud/ios/blob/b8a008690b443493f4a31d2f4e243b65d74737c2/COPYING.iOS).

## Credits

Map data © Alex Rembish, [iso-topojson](https://github.com/rembish/iso-topojson), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), based on [Natural Earth](https://www.naturalearthdata.com/) public-domain data. PastPins transforms geometry, projection, labeling, and styling. Regional boundaries come from Natural Earth Admin 1; country facts come from [Countries by Annexare](https://github.com/annexare/Countries).

The catalog includes countries and territories. Regional coverage, administrative levels, and source dates vary; these maps are a cartographic reference, not a current government registry. Third-party notices are available in the app and in [licenses/](licenses/).
