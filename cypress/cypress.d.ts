declare namespace Cypress {
  interface Chainable {
    createEvent(params: {
      exclusive: boolean;
      gatekeepers?: string[];
    }): Chainable<void>; // or whatever type it returns
  }
}
