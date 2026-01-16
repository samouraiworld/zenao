import {
  testTeamName,
  testEventName,
  testCommunityName,
} from "../support/constants";
import { login, reset, toastShouldContain } from "../support/helpers";

describe("team", () => {
  it("prepare state", () => {
    reset();
  });

  it("create a team", () => {
    // Start from dashboard
    cy.visit("/dashboard");

    login();

    // Wait for dashboard to fully load
    cy.get("h1").contains("Events").should("be.visible", { timeout: 15000 });

    // Click on avatar dropdown to open account switcher
    cy.get('img[alt="Avatar"]', { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    // Wait for dropdown to open
    cy.get('[role="menu"]').should("be.visible");

    // Click on "Create a team" option
    cy.get('[role="menuitem"]').contains("Create a team").click();

    // Wait for dialog to appear and input to be ready
    cy.get("#team-name", { timeout: 10000 }).should("be.visible");

    // Wait for dialog animation to complete
    cy.wait(500);

    // Click to focus, clear, then type team name with slower delay
    cy.get("#team-name").click().clear().type(testTeamName, { delay: 50 });

    // Click create button
    cy.get("button").contains("Create team").click();

    // Verify toast shows success
    toastShouldContain("Team created successfully");

    // Wait for the dialog to close and team to be created
    cy.wait(1000);

    // Verify team appears in account switcher
    cy.get('img[alt="Avatar"]', { timeout: 10000 })
      .first()
      .should("be.visible")
      .click();

    // Wait for dropdown to open
    cy.get('[role="menu"]').should("be.visible");

    // Verify the team is in the dropdown and is active (has checkmark)
    cy.get('[role="menuitem"]')
      .contains(testTeamName)
      .should("be.visible")
      .parents('[role="menuitem"]')
      .find(".lucide-check")
      .should("exist");

    // Close the dropdown by pressing Escape
    cy.get("body").type("{esc}");
  });

  it("switch to personal account", () => {
    // Start from dashboard
    cy.visit("/dashboard");

    login();

    // Wait for dashboard to fully load
    cy.get("h1").contains("Events").should("be.visible", { timeout: 15000 });

    // Open account switcher
    cy.get('img[alt="Avatar"]', { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Click on personal account (contains "Personal account" text)
    cy.get('[role="menuitem"]').contains("Personal account").click();

    // Wait for switch to complete
    cy.wait(500);

    // Open account switcher again to verify
    cy.get('img[alt="Avatar"]', { timeout: 10000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Personal account should have checkmark now
    cy.get('[role="menuitem"]')
      .contains("Personal account")
      .parents('[role="menuitem"]')
      .find(".lucide-check")
      .should("exist");
  });

  it("switch to team account", () => {
    // Start from dashboard
    cy.visit("/dashboard");

    login();

    // Wait for dashboard to fully load
    cy.get("h1").contains("Events").should("be.visible", { timeout: 15000 });

    // Open account switcher
    cy.get('img[alt="Avatar"]', { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Click on the team
    cy.get('[role="menuitem"]').contains(testTeamName).click();

    // Wait for switch to complete
    cy.wait(500);

    // Open account switcher again to verify
    cy.get('img[alt="Avatar"]', { timeout: 10000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Team should have checkmark now
    cy.get('[role="menuitem"]')
      .contains(testTeamName)
      .parents('[role="menuitem"]')
      .find(".lucide-check")
      .should("exist");
  });

  it("create event as team", () => {
    // Start from dashboard
    cy.visit("/dashboard");

    login();

    // Wait for dashboard to fully load
    cy.get("h1").contains("Events").should("be.visible", { timeout: 15000 });

    // Ensure we're logged in as team
    cy.get('img[alt="Avatar"]', { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Switch to team account
    cy.get('[role="menuitem"]').contains(testTeamName).click();

    // Wait for switch to complete
    cy.wait(500);

    // Access event creation page from dashboard
    cy.get(
      'button[aria-label="quick menu create"][data-sidebar="menu-button"]',
    ).click();

    cy.get('[role="menu"]').should("be.visible");

    // Click on create event from sidebar
    cy.get('a[href="/dashboard/event/create"] > div[role="menuitem"]').click();

    // Create the event using the existing command
    cy.createEvent({ exclusive: false });

    // Verify event was created
    cy.url().should("include", "/event/");
    cy.url().should("not.include", "/create");

    // Verify the event shows expected name
    cy.get("textarea").should("be.visible").should("have.value", testEventName);

    // Navigate to the public event page
    cy.url().then((url) => {
      cy.visit(url.replace("/dashboard", ""));
    });

    // Verify the event shows team name
    cy.get("h1").contains(testEventName).should("be.visible");
  });

  it("create community as team", () => {
    // Start from dashboard
    cy.visit("/dashboard");

    login();

    // Wait for dashboard to fully load
    cy.get("h1").contains("Events").should("be.visible", { timeout: 15000 });

    // Switch to team account
    cy.get('img[alt="Avatar"]', { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    cy.get('[role="menuitem"]').contains(testTeamName).click();

    // Wait for switch to complete
    cy.wait(500);

    // Navigate to community creation via sidebar
    cy.get(
      'button[aria-label="quick menu create"][data-sidebar="menu-button"]',
    ).click();

    cy.get('[role="menu"]').should("be.visible");

    // Click on create community from sidebar
    cy.get(
      'a[href="/dashboard/community/create"] > div[role="menuitem"]',
    ).click();

    // Fill community info directly (similar to createCommunity command but without login)
    // Avatar
    cy.get("input[name=avatarUri]").selectFile(
      "cypress/fixtures/alice-tester.webp",
      { force: true },
    );
    // Banner
    cy.get("input[name=bannerUri]").selectFile(
      "cypress/fixtures/bug-bash-bonanza.webp",
      { force: true },
    );
    // Name
    cy.get('textarea[name="displayName"]').type(testCommunityName, {
      delay: 10,
    });
    // Short desc
    cy.get('input[name="shortDescription"]').type(
      "A community for QA enthusiasts to share knowledge.",
      {
        delay: 10,
      },
    );
    // Description
    cy.get('textarea[name="description"]').type(
      "Welcome to **Testers United**!\nA community for QA enthusiasts to share knowledge.",
      {
        delay: 10,
      },
    );

    // Create community
    cy.get("button").contains("Create Community").click();

    cy.wait(1000);

    toastShouldContain("Community created!");

    cy.url().should("include", "/community/");
    cy.url().should("not.include", "/create");
  });

  it("team cannot create another team", () => {
    // Start from dashboard
    cy.visit("/dashboard");

    login();

    // Wait for dashboard to fully load
    cy.get("h1").contains("Events").should("be.visible", { timeout: 15000 });

    // Ensure we're logged in as team
    cy.get('img[alt="Avatar"]', { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Switch to team account
    cy.get('[role="menuitem"]').contains(testTeamName).click();

    // Wait for switch to complete
    cy.wait(500);

    // Open account switcher again
    cy.get('img[alt="Avatar"]', { timeout: 10000 })
      .first()
      .should("be.visible")
      .click();

    cy.get('[role="menu"]').should("be.visible");

    // Click on "Create a team" option while in team mode
    cy.get('[role="menuitem"]').contains("Create a team").click();

    // Wait for dialog to appear
    cy.get("#team-name", { timeout: 10000 }).should("be.visible");

    // Wait for dialog animation to complete
    cy.wait(500);

    // Fill in a new team name
    cy.get("#team-name").click().clear().type("Another Team", { delay: 50 });

    // Click create button
    cy.get("button").contains("Create team").click();

    // Wait a moment for the error response
    cy.wait(500);

    // Verify error toast appears with longer timeout
    cy.get("li", { timeout: 10000 })
      .contains("Failed to create team")
      .should("be.visible");
  });
});
