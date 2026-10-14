# Mail and CV webhook (Google Apps Script)

`Code.gs` emails the 6-digit login codes and stores participants' PDF CVs in
Google Drive. The site calls it (`src/lib/gas.server.ts`) whenever both
`GAS_URL` and `GAS_SECRET` are set; otherwise login codes are only printed to
the server console and CV upload fails.

Mail goes out **from the Google account that deploys the script**, and the CVs
are owned by it. A Google Workspace account (e.g. a university account) can send
about 1,500 emails a day; a personal Gmail about 100. Check what is left by
opening the `/exec` URL.

## Deploy

1. Go to <https://script.google.com> → **New project**, and paste `Code.gs` in.
2. **Project Settings → Script Properties → Add property**:
   `GAS_SECRET` = a long random string (`openssl rand -base64 32`).
3. In the editor, choose `testSendToMe` and click **Run**. Approve the
   permissions (Gmail and Drive); you should receive a test code (`123456`),
   and the log shows the link to the new **Women's Hack Day CVs** folder.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Copy the URL ending in `/exec`.

5. Open that URL in a browser — it should show `{"ok":true,...}`.

## Connect the site

Local (`.dev.vars`), then restart `vp dev`:

```
GAS_URL=https://script.google.com/macros/s/.../exec
GAS_SECRET=<the same value as the script property>
```

Production:

```
pnpm exec wrangler secret put GAS_URL
pnpm exec wrangler secret put GAS_SECRET
```

After editing `Code.gs`, use **Deploy → Manage deployments → Edit → New
version**; the `/exec` URL stays the same. If the new code needs a new
permission (CV upload added Drive), run `testSendToMe` once first to approve it.

## CVs

Participants upload a PDF (up to 5 MB) from their dashboard. It is saved to the
**Women's Hack Day CVs** folder in the script owner's Drive, and `/admin` links
to it in the **CV** column (also in the CSV export). Replacing or deleting a CV
moves the old file to the Drive trash.

The folder is **private**. Organisers who should open CVs from `/admin` need the
folder shared with their Google account: in Drive, right-click the folder →
**Share** → add them as **Viewer**. To use an existing folder instead, set the
`CV_FOLDER_ID` script property to its id (the last part of its URL).
