const testEmail = "alice+clerk_test@example.com"; // this account exists in our clerk dev env

describe("Basics", () => {
  it("should prepare state", () => {
    cy.request({
      url: "http://localhost:4243/reset",
      timeout: 120000,
    });
  });

  it("should be able to navigate to manifesto from home", () => {
    // start from the index page
    cy.visit("http://localhost:3000/");

    // go to manifesto page
    cy.get("a").contains("Manifesto").click();

    // check that manifesto text is present
    cy.get("p")
      .contains(
        "commit ourself to build sustainable tools which are made to help people",
      )
      .should("exist");
  });

  it("should be able to navigate to home from manifesto", () => {
    // start from the index page
    cy.visit("http://localhost:3000/manifesto");

    // go to home page
    cy.get("a").contains("ZENAO").click();

    // check that home text is present
    cy.get("p").contains("Organize event(s) in seconds").should("exist");
  });

  it("should be able to participate without login", () => {
    // start from the index page
    cy.visit("http://localhost:3000/");

    // go to discover page
    cy.get("a").contains("Discover").click();

    // click on first event
    cy.get('a[href^="/event/"]').first().click();

    // type email in participate form
    cy.get('input[placeholder="Email..."]').type(testEmail);

    // submit participate form
    cy.get("button").contains("Participate").click();

    // check the participation confirmation
    cy.get("p").contains("You're in!", { timeout: 8000 }).should("exist");
  });

  it("should be able to participate while signed in", () => {
    // start from the index page
    cy.visit("http://localhost:3000/");

    // go to discover page
    cy.get("a").contains("Discover").click();

    // click on last event since we already participate in first
    cy.get('a[href^="/event/"]').last().click();

    // login
    cy.clerkSignIn({ strategy: "email_code", identifier: testEmail });

    // wait for email field to disapear
    cy.get('input[placeholder="Email..."]').should("not.exist");

    // submit participate form
    cy.get("button").contains("Participate").click();

    // check the participation confirmation
    cy.get("p").contains("You're in!", { timeout: 16000 }).should("exist");
  });
});
