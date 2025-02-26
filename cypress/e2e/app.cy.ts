describe("Navigation", () => {
  it("should be able to navigate to first event and participate", () => {
    // Start from the index page
    cy.visit("http://localhost:3000/");

    cy.get("a").contains("Discover").click();

    cy.get('a[href^="/event/"]').first().click();

    const mail = "alice+clerk_test@example.com"; // this account exists in our clerk dev env

    cy.get('input[placeholder="Email..."]').type(mail);

    cy.get("button").contains("Participate").click();

    cy.get("p").contains("You're in!").should("exist");
  });
});
