import { testEventName } from "../support/constants";
import {
  getFirstRowCellByHeader,
  login,
  reset,
  toastShouldContain,
} from "../support/helpers";

describe("dashboard", () => {
  // NOTE: this test requires a valid pinata upload setup in the nextjs server

  it("prepare state", () => {
    reset();
  });

  it("access dashboard while not signed in", () => {
    // go to dashboard page
    cy.visit("/dashboard");
    cy.get("p")
      .contains("Log in to access your dashboard")
      .should("be.visible");
  });

  describe("when signed in", () => {
    beforeEach(() => {
      cy.session("user-dashboard", () => {
        // start from home page
        cy.visit("/");
        // login via clerk
        login();
      });
    });

    it("toggle sidebar", () => {
      // start from dashboard page
      cy.visit("/dashboard");

      // check that sidebar is collapsed by default
      cy.get("div[data-state=collapsed]").should("be.visible");
      // click the toggle button
      cy.get("button[data-sidebar=trigger]").click();
      // check that sidebar is now expanded
      cy.get("div[data-state=expanded]").should("be.visible");
      // click the toggle button
      cy.get("button[data-sidebar=trigger]").click();
      // check that sidebar is now collapsed
      cy.get("div[data-state=collapsed]").should("be.visible");
    });

    it("navigate to home from dashboard", () => {
      // start from dashboard page
      cy.visit("/dashboard");

      // click on logo to go to home
      cy.get('img[alt="zenao logo"]').click();

      // check we are on home page
      cy.location("pathname", { timeout: 10000 }).should("eq", "/");

      // come back to dashboard
      cy.visit("/dashboard");

      // click on Avatar menu to go to home
      cy.get('img[alt="Avatar"]', { timeout: 15000 })
        .first()
        .should("be.visible")
        .click();

      // click on home link
      cy.get("a").contains("Switch to regular user mode").click();

      // check we are on home page
      cy.location("pathname").should("eq", "/");
    });

    it("navigate to profile from dashboard", () => {
      // start from dashboard page
      cy.visit("/dashboard");

      // click on Avatar menu to go to home
      cy.get('img[alt="Avatar"]', { timeout: 15000 })
        .first()
        .should("be.visible")
        .click();

      // click on profile link
      cy.get("a").contains("Profile").click();

      // check we are on home page
      cy.location("pathname").should("contain", "profile");
    });

    it("create an event", () => {
      cy.accessCreateEventPage();
      cy.createEvent({ exclusive: false });

      // check we are on event page with correct name
      cy.get("textarea")
        .should("be.visible")
        .should("have.value", testEventName);
    });

    it("edit an event", () => {
      // start from dashboard page (Events list)
      cy.visit("/dashboard");

      // check we are on events list page
      cy.get("h1").contains("Events").should("be.visible");

      const newEventName = "New event name";

      // get name of first event from table
      getFirstRowCellByHeader("Name")
        .invoke("text")
        .then((name) => {
          // click on first event row
          cy.get("table tbody tr").first().click();

          // check we are on event page with correct event name
          cy.get('textarea[placeholder="Event name..."]').should(
            "have.value",
            name,
          );

          // change event name
          cy.get('textarea[placeholder="Event name..."]')
            .clear()
            .type(newEventName, {
              delay: 10,
            });
        });

      // save changes
      cy.get("button").contains("Save changes").click();

      // check that the toast did show up
      toastShouldContain("Event edited!");

      // go back to dashboard
      cy.visit("/dashboard");

      // get name of first event from table (again)
      getFirstRowCellByHeader("Name")
        .invoke("text")
        .then((name) => {
          // check that the event new name is changed on events list
          expect(name).to.eq(newEventName);

          // click on first event row (again)
          cy.get("table tbody tr").first().click();

          // check we are on event page with correct event new name
          cy.get('textarea[placeholder="Event name..."]').should(
            "have.value",
            newEventName,
          );
        });
    });
  });
});

Cypress.Commands.add("accessCreateEventPage", () => {
  // start from dashboard page
  cy.visit("/dashboard");

  // click on home create button
  cy.get(
    'button[aria-label="quick menu create"][data-sidebar="menu-button"]',
  ).click();

  cy.get('[role="menu"]').should("be.visible");

  // click on create button from sidebar
  cy.get('a[href="/dashboard/event/create"] > div[role="menuitem"]').click();
});
