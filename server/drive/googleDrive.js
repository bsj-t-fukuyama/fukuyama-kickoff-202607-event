// Google Drive provider (service account).
//
// Setup:
//   1. Create a service account in Google Cloud and download its JSON key.
//   2. Share the target Drive folder with the service account's email (Viewer).
//   3. Run with:
//        DRIVE_PROVIDER=google \
//        GOOGLE_APPLICATION_CREDENTIALS=/abs/path/key.json \
//        DRIVE_FOLDER_ID=<folder id> \
//        npm run dev
//
// Images are NOT exposed by public URL — the frontend requests
// /api/image/:id and this provider streams the bytes through the backend.

import { google } from "googleapis";
import { config } from "../config.js";

const IMAGE_MIME_PREFIX = "image/";

export function createGoogleProvider() {
  const { folderId, credentialsPath } = config.google;
  if (!credentialsPath) {
    throw new Error(
      "DRIVE_PROVIDER=google requires GOOGLE_APPLICATION_CREDENTIALS to point at a service-account JSON key.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });

  return {
    name: "google",
    async list() {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains '${IMAGE_MIME_PREFIX}' and trashed = false`,
        fields: "files(id, name, mimeType, createdTime)",
        orderBy: "createdTime",
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      return (res.data.files ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        createdTime: f.createdTime,
        // Served through our own proxy so credentials stay on the backend.
        imageUrl: `/api/image/${f.id}`,
      }));
    },
    // Streams the raw image bytes for a given file id.
    async stream(fileId) {
      const meta = await drive.files.get({
        fileId,
        fields: "mimeType",
        supportsAllDrives: true,
      });
      const res = await drive.files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "stream" },
      );
      return { mimeType: meta.data.mimeType ?? "application/octet-stream", stream: res.data };
    },
  };
}
