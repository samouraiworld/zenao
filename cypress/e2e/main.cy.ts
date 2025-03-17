const testEmail = "alice+clerk_test@example.com"; // this account exists in our clerk dev env
const testEmail2 = "bob+clerk_test@example.com";
const testName = "Alice Tester";
const testBio =
  "Hi, I’m Alice Tester! I’m a fictional persona created to help test web applications from start to finish. My job is to simulate real user interactions, ensuring everything works smoothly and efficiently. I love tackling complex workflows, spotting bugs, and making sure every feature is ready for real users. Let’s build something amazing—one test at a time!";

const testEventName = "Bug Bash Bonanza: A Testing Extravaganza";
const testEventDesc = `Join **Alice Tester** for a fun and interactive event where developers, QA engineers, and tech enthusiasts come together to squash bugs, test workflows, and celebrate the art of quality assurance!  

- **What to expect:**   
  - Hands-on testing of a brand-new web application  
  - Prizes for finding the most creative bugs  
  - Live debugging sessions with Alice  
  - Networking with fellow testing enthusiasts  

Whether you're a seasoned tester or just curious about QA, this event is for you! Let’s make the web a better place, one bug at a time.

Don’t miss out—RSVP now and bring your testing A-game! 🐞🎉`;
const testEventLocation = "123 Test Lane, Suite 404, Bugville, QA 98765";
const testEventCapacity = "42";

const login = () => {
  cy.clerkSignIn({ strategy: "email_code", identifier: testEmail });
  cy.wait(1000);
};
const logout = () => {
  cy.clerkSignOut();
  cy.wait(1000);
};
const toastShouldContain = (contains: string) => {
  // XXX: this should ensure the element is the toast and not just "li"
  cy.get("li").contains(contains).should("be.visible");
};

// XXX: find a way to check for images

describe("main", () => {
  // NOTE: this test requires a valid pinata upload setup in the nextjs server

  it("prepare state", () => {
    cy.request({
      url: "http://localhost:4243/reset",
      timeout: 120000,
    });
  });

  // it("participate without login", () => {
  //   // start from the index page
  //   cy.visit("/");

  //   logout();

  //   // go to discover page
  //   cy.get("a").contains("Discover").click();

  //   // click on first event
  //   cy.get('a[href^="/event/"]').first().click();

  //   // type email in participate form
  //   cy.get('input[placeholder="Email..."]').type(testEmail2);

  //   // submit participate form
  //   cy.get("button").contains("Participate").click();

  //   // check the participation confirmation
  //   cy.get("p").contains("You're in!", { timeout: 8000 }).should("be.visible");
  // });

  // it("participate while signed in", () => {
  //   // check that we have no tickets
  //   cy.visit("/tickets");
  //   cy.get('a[href^="/event/"]').should("not.exist");

  //   // start from the index page
  //   cy.visit("/");

  //   login();

  //   // go to discover page
  //   cy.get("a").contains("Discover").click();

  //   // click on last event since we already participate in first
  //   cy.get('a[href^="/event/"]').first().click();

  //   // make sure there is no email field
  //   cy.get('input[placeholder="Email..."]').should("not.exist");

  //   // submit participate form
  //   cy.get("button").contains("Participate").click();

  //   // check the participation confirmation
  //   cy.get("p").contains("You're in!", { timeout: 16000 }).should("be.visible");

  //   // check that we have a ticket
  //   cy.visit("/tickets");
  //   cy.get('a[href^="/event/"]').should("be.visible");
  // });

  // it("navigate to manifesto from home", () => {
  //   // start from the index page
  //   cy.visit("/");

  //   logout();

  //   // go to manifesto page
  //   cy.get("a").contains("Manifesto").click();

  //   // check that manifesto text is present
  //   cy.get("p")
  //     .contains(
  //       "commit ourself to build sustainable tools which are made to help people",
  //     )
  //     .should("be.visible");
  // });

  // it("navigate to home from manifesto", () => {
  //   // start from the index page
  //   cy.visit("/manifesto");

  //   logout();

  //   // go to home page
  //   cy.get("a").contains("ZENAO").click();

  //   // check that home text is present
  //   cy.get("p").contains("Organize event(s) in seconds").should("be.visible");
  // });

  // it("edit it's profile", () => {
  //   // start from the home
  //   cy.visit("/");

  //   login();

  //   // navigate to settings
  //   cy.visit("/settings");

  //   // check initial values
  //   cy.get('input[placeholder="Name..."]').should(
  //     "have.value",
  //     "Zenao user #1",
  //   );
  //   cy.get('textarea[placeholder="Bio..."]').should(
  //     "have.value",
  //     "Zenao managed user",
  //   );

  //   // change values
  //   cy.get("input[type=file]").selectFile(
  //     "cypress/fixtures/alice-tester.webp",
  //     { force: true }, // XXX: we could maybe use a label with a "for" param to avoid forcing here
  //   );
  //   cy.get('input[placeholder="Name..."]').clear().type(testName);
  //   cy.get('textarea[placeholder="Bio..."]')
  //     .clear()
  //     .type(testBio, { delay: 1 });

  //   // save changes
  //   cy.get("button").contains("Save changes").click();

  //   // check that the toast did show up
  //   toastShouldContain("User correctly edited!");

  //   // check that the values are still correct
  //   cy.get('input[placeholder="Name..."]').should("have.value", testName);
  //   cy.get('textarea[placeholder="Bio..."]').should("have.value", testBio);

  //   // refresh
  //   cy.reload();

  //   // check that the values are still correct
  //   cy.get('input[placeholder="Name..."]').should("have.value", testName);
  //   cy.get('textarea[placeholder="Bio..."]').should("have.value", testBio);
  // });

  it("create an event", () => {
    // start from the home
    cy.visit("/");

    // click on home create button
    cy.get("button").contains("Create").click();

    login();

    // fill event info
    cy.get("input[type=file]").selectFile(
      "cypress/fixtures/bug-bash-bonanza.webp",
      { force: true }, // XXX: we could maybe use a label with a "for" param to avoid forcing here
    );
    cy.get('textarea[placeholder="Event name..."]').type(testEventName);
    cy.get('textarea[placeholder="Description..."]').type(testEventDesc, {
      delay: 1,
    });

    // custom location
    cy.get("button").contains("Add an address...").click();
    cy.get('input[placeholder="Location..."]').type(testEventLocation);
    cy.get("p").contains(`Use ${testEventLocation}`).trigger("click");

    cy.get('input[placeholder="Capacity..."]').type(testEventCapacity);

    // choose dates in the start of next month
    cy.get("button").contains("Pick a start date...").click();
    cy.get('button[aria-label="Choose the Month"').click();

    cy.get('div[role="option"]').contains("April").click();

    cy.get('button[aria-label="Choose the Year"').click();
    cy.get('div[role="option"]')
      .contains(`${new Date().getFullYear() + 1}`)
      .click();
    cy.get('table[role="grid"]').find("button").contains("13").click();

    cy.get("button").contains("Pick a end date...").click();
    cy.get('button[aria-label="Choose the Month"').click();
    cy.get('div[role="option"]').contains("April").click();

    cy.get('button[aria-label="Choose the Year"').click();
    cy.get('div[role="option"]')
      .contains(`${new Date().getFullYear() + 1}`)
      .click();
    cy.wait(500); // wait for start date calendar to disapear so there is only one "Choose the Month" button present

    cy.get('table[role="grid"]').find("button").contains("14").click();

    cy.get("button").contains("Create event").click();

    cy.url().should("include", "/event/");
    cy.url().should("not.include", "/create");

    toastShouldContain("Event created!");

    cy.get("p").contains(testEventName).should("be.visible");
    cy.get("p").contains(testEventLocation).should("be.visible");
    cy.get("p")
      .contains(
        "Join Alice Tester for a fun and interactive event where developers, QA engineers, and tech enthusiasts come together to squash bugs, test workflows, and celebrate the art of quality assurance!",
      )
      .should("be.visible"); // desc
    cy.get("p").contains(" 13th, ").should("be.visible"); // start date
    cy.get("p").contains(" 14, ").should("be.visible"); // end date

    cy.get("button").contains("Participate").should("be.visible");

    cy.get("p")
      .contains("You have organizer role for this event")
      .should("be.visible");
    cy.get("button").contains("Edit").should("be.visible");

    // participate
    cy.get("button").contains("Participate").click();

    // wait for participation confirmation
    cy.get("p").contains("You're in!", { timeout: 8000 }).should("be.visible");

    // check that we have a ticket with the event name visible
    cy.visit("/tickets");
    cy.get('a[href^="/event/"]').contains(testEventName).should("be.visible");
  });
});
