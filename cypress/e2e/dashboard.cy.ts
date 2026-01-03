import { login, reset } from "../support/helpers";

describe("dashboard", () => {
  // NOTE: this test requires a valid pinata upload setup in the nextjs server

  it("prepare state", () => {
    reset();
  });

  beforeEach(() => {
    cy.session("user-dashboard", () => {
      // start from home page
      cy.visit("/");
      // login via clerk
      login();
      // go to dashboard page
      cy.visit("/dashboard");
    });
  });

  // navigate to home from dashboard (click on logo and via user menu)
  // naviagte to profile from dashboard
  // navigate to events
  // access an event
  // edit an event
  // create an event

  it("toggle sidebar", () => {
    // start from the dashboard page
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

  // createEvent
  // editEvent
});
