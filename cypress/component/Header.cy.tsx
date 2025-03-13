import { Header } from "@/app/Header";

describe("Desktop Header.cy.tsx", () => {
  beforeEach(() => {
    cy.mount(<Header />);
  });
  it("mobile mount", () => {
    cy.viewport(320, 568);
    cy.get("[data-cy-root]").should("exist");
  });
  it("desktop mount", () => {
    cy.viewport(1280, 720);
    cy.get("[data-cy-root]").should("exist");
  });
});
