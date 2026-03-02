import { login, logout } from "../support/helpers";

describe("discover page", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("loads the discover page and shows events", () => {
    cy.visit("/discover");

    // Page should render without crashing (the SSR bug that caused the outage)
    cy.get("body").should("be.visible");

    // Should contain event cards
    cy.get('a[href^="/event/"]', { timeout: 15000 }).should(
      "have.length.greaterThan",
      0,
    );
  });

  it("navigates from discover to event detail", () => {
    cy.visit("/discover");

    // Click on first event
    cy.get('a.group[href^="/event/"]', { timeout: 15000 }).first().click();

    // Should be on event detail page
    cy.url().should("match", /\/event\/\d+/);

    // Event page should show title
    cy.get("h1").should("be.visible");
  });

  it("discover page works when logged in", () => {
    cy.visit("/");
    login();

    cy.visit("/discover");

    // Should render event cards (suspense query was crashing when logged in)
    cy.get('a[href^="/event/"]', { timeout: 15000 }).should(
      "have.length.greaterThan",
      0,
    );
  });

  it("discover page works when logged out", () => {
    cy.visit("/");
    logout();

    cy.visit("/discover");

    // Should render event cards without login
    cy.get('a[href^="/event/"]', { timeout: 15000 }).should(
      "have.length.greaterThan",
      0,
    );
  });
});
