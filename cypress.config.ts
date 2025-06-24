import path from "path";
import fs from "fs";
import { clerkSetup } from "@clerk/testing/cypress";
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "chromium" && browser.name !== "electron") {
          // Mac/Linux
          launchOptions.args.push(
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--use-file-for-fake-video-capture=cypress/fixtures/fake_qr.mjpeg",
          );

          // Windows
          // launchOptions.args.push('--use-file-for-fake-video-capture=c:\\path\\to\\video\\my-video.y4m')
        }

        return launchOptions;
      });

      on("task", {
        changeVideoSource(videoSource) {
          console.log("TASK - Changing video source to", videoSource);

          const webcamPath = path.join("cypress", "fixtures", "fake_qr.mjpeg");
          const sourceVideoPath = path.join("cypress", "fixtures", videoSource);

          const video = fs.readFileSync(sourceVideoPath);

          fs.writeFileSync(webcamPath, video);

          return null;
        },
      });

      return clerkSetup({ config });
    },
  },
});
