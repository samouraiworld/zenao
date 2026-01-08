export const login = (email = "alice+clerk_test@example.com") => {
  cy.clerkSignIn({ strategy: "email_code", identifier: email });
  cy.wait(1000);
};

export const logout = () => {
  cy.clerkSignOut();
  cy.wait(1000);
};

export const reset = () => {
  cy.task("resetVideoSource");
  cy.request({
    url: "http://localhost:4243/reset",
    timeout: 120000,
  });
};

export const toastShouldContain = (contains: string) => {
  // XXX: this should ensure the element is the toast and not just "li"
  cy.get("li").contains(contains).should("be.visible");
};
