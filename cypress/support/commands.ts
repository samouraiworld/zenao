/// <reference types="cypress" />

import { addClerkCommands } from "@clerk/testing/cypress";
// import { createSlideshow } from "slideshow-video";

addClerkCommands({ Cypress, cy });

Cypress.Commands.add("generateValidQRVideo", (imgSrc) => {
  const command = `ffmpeg -y -framerate 1/10 -i ${imgSrc} -vf "scale=444:250" -r 30 -pix_fmt yuv420p cypress/fixtures/output.mjpeg`;
  cy.exec(command).then((result) => {
    if (result.code !== 0) {
      throw new Error("Could not generate error", {
        cause: result.stderr,
      });
    }

    console.log(`QRCode video saved as: cypress/fixtures/output.mjpeg`);
  });
});
