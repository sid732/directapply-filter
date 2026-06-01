# Publishing

Create the upload package locally:

```sh
bash scripts/package-extension.sh
```

The generated ZIP is written to `dist/` and can be uploaded in the Chrome Web Store Developer Dashboard.

First-time publishing is best done manually:

1. Open the Chrome Web Store Developer Dashboard.
2. Choose Add new item.
3. Upload the ZIP from `dist/`.
4. Complete the Store Listing, Privacy, Distribution, and Test instructions tabs.
5. Submit the item for review.

After the first listing exists, GitHub Actions can package every push and optionally upload an update through the Chrome Web Store API. Add these repository secrets before using the manual publish workflow:

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_PUBLISHER_ID`
- `CHROME_EXTENSION_ID`

To publish an update, increment `version` in `manifest.json`, run the `Chrome Web Store` workflow manually, and set `publish` to `true`.
