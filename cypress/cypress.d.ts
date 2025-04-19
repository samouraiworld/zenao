declare namespace Cypress {
  interface Chainable {
    createEvent(): Chainable<void>; // or whatever type it returns
  }
}
