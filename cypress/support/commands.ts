/// <reference types="cypress" />

import { addClerkCommands } from "@clerk/testing/cypress";

addClerkCommands({ Cypress, cy });

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
