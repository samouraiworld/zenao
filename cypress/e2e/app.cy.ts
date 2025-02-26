describe("Navigation", () => {
  it("should prepare state", () => {
    cy.request({
      url: "http://localhost:4243/reset",
      timeout: 120000,
    });
  });

  it("should be able to navigate to first event and participate", () => {
    // start from the index page
    cy.visit("http://localhost:3000/");

    // go to discover page
    cy.get("a").contains("Discover").click();

    // click on first event
    cy.get('a[href^="/event/"]').first().click();

    // type email in participate form
    const mail = "alice+clerk_test@example.com"; // this account exists in our clerk dev env
    cy.get('input[placeholder="Email..."]').type(mail);

    // submit participate form
    cy.get("button").contains("Participate").click();

    // check the participation confirmation
    cy.get("p").contains("You're in!", { timeout: 8000 }).should("exist");
  });
});
