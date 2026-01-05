import { testEmail } from "./constants";

export const login = (email = testEmail) => {
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

// Returns a Cypress chainable (not a value) for the first row cell under the given header
export const getFirstRowCellByHeader = (header: string) => {
  return cy.get("table thead th").then(($ths) => {
    const index = [...$ths].findIndex((th) => th.innerText.trim() === header);

    return cy.get("table tbody tr").first().find("td").eq(index);
  });
};
