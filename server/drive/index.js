import { config } from "../config.js";
import { createMockProvider } from "./mockDrive.js";
import { createGoogleProvider } from "./googleDrive.js";
import { createPublicDriveProvider } from "./publicDrive.js";

// A DriveProvider is: { name, list() -> item[], stream(id) -> { mimeType, stream } }
export function createDriveProvider() {
  switch (config.driveProvider) {
    case "google":
      return createGoogleProvider();
    case "google-public":
      return createPublicDriveProvider();
    case "mock":
    default:
      return createMockProvider();
  }
}
