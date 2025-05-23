declare namespace Cypress {
  interface Chainable {
    createEvent(params: { exclusive: boolean }): Chainable<void>; // or whatever type it returns
  }
}
