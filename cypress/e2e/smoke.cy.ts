describe("smoke tests", () => {
  // Lightweight smoke tests for all critical pages
  // These catch rendering crashes, missing routes, and CSP issues

  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  const criticalPages = [
    { path: "/", name: "Home" },
    { path: "/discover", name: "Discover" },
    { path: "/communities", name: "Communities" },
    { path: "/manifesto", name: "Manifesto" },
    { path: "/blog", name: "Blog" },
  ];

  criticalPages.forEach(({ path, name }) => {
    it(`${name} page (${path}) loads without errors`, () => {
      cy.visit(path, { failOnStatusCode: false });

      // Page should render (not 500 or crash)
      cy.get("body").should("be.visible");

      // Should not show a generic error page
      cy.get("body").should("not.contain.text", "Application error");
      cy.get("body").should("not.contain.text", "Internal Server Error");
    });
  });

  it("home page has correct heading", () => {
    cy.visit("/");
    cy.get("h1").contains("Organize event(s) in seconds").should("be.visible");
  });

  it("manifesto page has expected content", () => {
    cy.visit("/manifesto");
    cy.get("p")
      .contains(
        "commit ourselves to building sustainable tools that help people",
      )
      .should("be.visible");
  });

  it("blog page has expected header", () => {
    cy.visit("/blog");
    cy.get("p")
      .contains("Explore the exciting updates and innovations of Zenao")
      .should("be.visible");
  });

  it("communities page loads and shows communities", () => {
    cy.visit("/communities");
    cy.get("body").should("be.visible");
    // Should contain community links
    cy.get('a[href^="/community/"]', { timeout: 15000 }).should(
      "have.length.greaterThan",
      0,
    );
  });

  it("404 page works for non-existent routes", () => {
    cy.visit("/this-page-does-not-exist-12345", { failOnStatusCode: false });
    cy.get("body").should("contain.text", "not found");
  });

  it("security headers are present", () => {
    cy.request("/").then((response) => {
      const headers = response.headers;

      // Check critical security headers
      expect(headers).to.have.property("x-content-type-options", "nosniff");
      expect(headers).to.have.property("x-frame-options", "DENY");
      expect(headers).to.have.property("referrer-policy");

      // CSP should exist and include critical directives
      const csp = headers["content-security-policy"] as string;
      expect(csp).to.include("default-src");
      expect(csp).to.include("script-src");
      expect(csp).to.include("connect-src");

      // HSTS
      const hsts = headers["strict-transport-security"] as string;
      if (hsts) {
        expect(hsts).to.include("max-age=");
      }
    });
  });
});
