/// <reference types="cypress" />

import { addClerkCommands } from "@clerk/testing/cypress";
import {
  testEventName,
  testEventDesc,
  testEventLocation,
  testEventCapacity,
  testEventPassword,
} from "./constants";
import { toastShouldContain } from "./helpers";

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

// Must be called when already logged in and on Events creation page
Cypress.Commands.add(
  "createEvent",
  ({
    exclusive = false,
    gatekeepers = [],
  }: {
    exclusive: boolean;
    gatekeepers?: string[];
  }) => {
    // fill event info
    cy.get("input[name=imageUri]").selectFile(
      "cypress/fixtures/bug-bash-bonanza.webp",
      { force: true }, // XXX: we could maybe use a label with a "for" param to avoid forcing here
    );
    cy.get('textarea[placeholder="Event name..."]').type(testEventName);
    cy.get('textarea[placeholder="Description..."]').type(testEventDesc, {
      delay: 1,
    });

    // custom location
    cy.get('input[placeholder="Add an address..."]').type(testEventLocation);
    cy.get("p").contains(`Use ${testEventLocation}`).trigger("click");

    cy.get('input[placeholder="Capacity..."]').type(testEventCapacity);

    // choose dates in the start of next month
    cy.get("button").contains("Pick a start date...").click();
    cy.get('button[aria-label="Choose the Month"').click();

    cy.get('div[role="option"]').contains("April").click();

    const year = new Date().getFullYear() + 1;

    cy.get('button[aria-label="Choose the Year"').click();
    cy.get('div[role="option"]').contains(`${year}`).click();
    cy.get('table[role="grid"]').find("button").contains("13").click();

    cy.wait(1000);

    cy.get('button[aria-label="Pick date"]').eq(1).click();
    cy.get('button[aria-label="Choose the Month"').click();
    cy.get('div[role="option"]').contains("April").click();

    cy.get('button[aria-label="Choose the Year"').click();
    cy.get('div[role="option"]').contains(`${year}`).click();
    cy.wait(500); // wait for start date calendar to disapear so there is only one "Choose the Month" button present
    cy.get('table[role="grid"]').find("button").contains("14").click();

    if (exclusive) {
      cy.get("button[data-name=exclusive]").click();
      cy.get("input[name=password]").type(testEventPassword);
    }

    cy.get("button").contains("Create event").click();

    cy.wait(1000);

    toastShouldContain("Event created!");

    cy.url().should("include", "/event/");
    cy.url().should("not.include", "/create");

    if (gatekeepers.length > 0) {
      cy.get("p").contains("Manage gatekeepers (1)").click();
      gatekeepers.forEach((gatekeeper) => {
        cy.get('input[placeholder="Email..."]').type(gatekeeper);
        cy.get('button[aria-label="add gatekeeper"]').click();
      });

      cy.get("button").contains("Done").click();
      cy.wait(5000);
    }
  },
);
