describe("i18n — locale switching", () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it("default locale loads English content", () => {
    cy.visit("/");

    // Home page should show English heading
    cy.get("h1").contains("Organize event(s) in seconds").should("be.visible");
  });

  it("locale switcher is visible", () => {
    cy.visit("/");

    // Globe icon / locale switcher should exist
    cy.get('button[aria-label*="locale"], button[aria-label*="language"]', {
      timeout: 10000,
    }).should("exist");
  });

  it("no raw translation keys are visible on home page", () => {
    cy.visit("/");

    // Translation keys follow patterns like "home.title" or "common.button"
    // Check that the body text doesn't contain obvious raw keys
    cy.get("body").then(($body) => {
      const text = $body.text();

      // Common namespace patterns that would indicate missing translations
      const rawKeyPatterns = [
        /\bhome\.\w+\.\w+/,
        /\bcommon\.\w+\.\w+/,
        /\bnavigation\.\w+\.\w+/,
        /\bevent\.\w+\.\w+/,
      ];

      rawKeyPatterns.forEach((pattern) => {
        expect(text).not.to.match(pattern);
      });
    });
  });

  it("no raw translation keys on discover page", () => {
    cy.visit("/discover");

    cy.get("body").then(($body) => {
      const text = $body.text();
      const rawKeyPatterns = [
        /\bdiscover\.\w+\.\w+/,
        /\bcommon\.\w+\.\w+/,
        /\bnavigation\.\w+\.\w+/,
      ];

      rawKeyPatterns.forEach((pattern) => {
        expect(text).not.to.match(pattern);
      });
    });
  });
});
