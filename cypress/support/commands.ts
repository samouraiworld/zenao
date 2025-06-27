/// <reference types="cypress" />

import { addClerkCommands } from "@clerk/testing/cypress";

addClerkCommands({ Cypress, cy });

Cypress.Commands.add("generateValidQRVideo", (imgSrc) => {
  const command = `ffmpeg -y -framerate 1/10 -i ${imgSrc} -vf "scale=444:250" -r 30 -pix_fmt yuv420p cypress/fixtures/output.mjpeg`;
  cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
    if (result.code !== 0) {
      throw new Error(result.stderr, {
        cause: result.stderr,
      });
    }
    cy.log(result.stdout);
    cy.log(result.stderr);

    console.log(`QRCode video saved as: cypress/fixtures/output.mjpeg`);
  });
});

Cypress.Commands.overwrite("log", function (log, ...args) {
  if (Cypress.browser.isHeadless) {
    return cy.task("log", args, { log: false }).then(() => {
      return log(...args);
    });
  } else {
    console.log(...args);
    return log(...args);
  }
});
