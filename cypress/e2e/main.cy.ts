const testEmail = "alice+clerk_test@example.com"; // this account exists in our clerk dev env
const testEmail2 = "bob+clerk_test@example.com";
const testName = "Alice Tester";
const testBio =
  "Hi, I’m Alice Tester! I’m a fictional persona created to help test web applications from start to finish.";

const testEventName = "Bug Bash Bonanza: A Testing Extravaganza";
const testEventDesc = `Join **Alice Tester** for a fun and interactive event where developers, 
Don’t miss out—RSVP now and bring your testing A-game! 🐞🎉`;
const testEventLocation = "123 Test Lane, Suite 404, Bugville, QA 98765";
const testEventCapacity = "42";
const testEventPassword = "zenao_everyday";

const testStandardPost = "Post to test";
const testComment = "A comment to test";

const testSocialLink = {
  url: "https://twitter.com/alice_tester",
};

const login = (email = testEmail) => {
  cy.clerkSignIn({ strategy: "email_code", identifier: email });
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
    cy.task("resetVideoSource");
    cy.request({
      url: "http://localhost:4243/reset",
      timeout: 120000,
    });
  });

  it("participate without login", () => {
    // start from the index page
    cy.visit("/");

    logout();

    // go to discover page
    cy.get("a").contains("Discover").click();

    // click on first event
    cy.get('a[href^="/event/"]').first().click();

    // type email in participate form
    cy.get('input[placeholder="Email..."]').type(testEmail2);

    // submit participate form
    cy.get("button").contains("Register").click();

    // check the participation confirmation
    cy.get("h2").contains("You're in!", { timeout: 8000 }).should("be.visible");
  });

  it("participate while signed in", () => {
    // check that we have no tickets
    cy.visit("/tickets");
    cy.get('a[href^="/event/"]').should("not.exist");

    // start from the index page
    cy.visit("/");

    login();

    // go to discover page
    cy.get("a").contains("Discover").click();

    // click on last event since we already participate in first
    cy.get('a[href^="/event/"]').first().click();

    // make sure there is no email field
    cy.get('input[placeholder="Email..."]').should("not.exist");

    // submit participate form
    cy.get("button").contains("Register").click();

    // check the participation confirmation
    cy.get("h2")
      .contains("You're in!", { timeout: 16000 })
      .should("be.visible");

    // check that we have a ticket
    cy.visit("/tickets");
    cy.get('a[href^="/ticket/"]').should("be.visible");
  });

  it("navigate to manifesto from home", () => {
    // start from the index page
    cy.visit("/");

    logout();

    // go to manifesto page
    cy.get("a").contains("Manifesto").click();

    // check that manifesto text is present
    cy.get("p")
      .contains(
        "commit ourselves to building sustainable tools that help people",
      )
      .should("be.visible");
  });

  it("navigate to home from manifesto", () => {
    // start from the index page
    cy.visit("/manifesto");

    logout();

    // go to home page
    cy.get("a").contains("ZENAO").click();

    // check that home text is present
    cy.get("h1").contains("Organize event(s) in seconds").should("be.visible");
  });

  it("navigate to blog from home", () => {
    // start from the index page
    cy.visit("/");

    logout();

    // go to manifesto page
    cy.get("a").contains("Blog").click();

    // check that blog page's header text is present
    cy.get("p")
      .contains("Explore the exciting updates and innovations of Zenao")
      .should("be.visible");
  });

  it("edit it's profile", () => {
    // start from the home
    cy.visit("/");

    login();

    // navigate to settings
    cy.visit("/settings");

    // check initial values
    cy.get('input[placeholder="Name..."]').should(
      "have.value",
      "Zenao user #1",
    );
    cy.get('textarea[placeholder="Bio..."]').should(
      "have.value",
      "Zenao managed user",
    );

    // change values
    cy.get('input[name="avatarUri"]').selectFile(
      "cypress/fixtures/alice-tester.webp",
      { force: true }, // XXX: we could maybe use a label with a "for" param to avoid forcing here
    );
    cy.get('input[placeholder="Name..."]').clear().type(testName);
    cy.get('textarea[placeholder="Bio..."]')
      .clear()
      .type(testBio, { delay: 1 });

    // add social links
    cy.get("button").contains("Add link").click();
    cy.get('input[placeholder="Enter URL"]').type(testSocialLink.url, {
      delay: 1,
    });

    // save changes
    cy.get("button").contains("Save changes").click();

    // check that the toast did show up
    toastShouldContain("User correctly edited!");

    // check that the values on profile page are correct
    cy.get("h1").contains(testName).should("be.visible");
    cy.get("p").contains(testBio).should("be.visible");

    // navigate to edit page
    cy.get("button").contains("Edit my profile").click();

    // check that the values are still correct
    cy.get('input[placeholder="Name..."]').should("have.value", testName);
    cy.get('textarea[placeholder="Bio..."]').should("have.value", testBio);
  });

  it("create an event", () => {
    cy.createEvent({ exclusive: false });

    cy.get("h1").contains(testEventName).should("be.visible");
    cy.get("h2").contains(testEventLocation).should("be.visible");

    // Go Description tab
    cy.get("button").contains("About event").click();
    cy.get("p")
      .contains("Don’t miss out—RSVP now and bring your testing A-game!")
      .should("be.visible"); // desc
    cy.get("h2").contains(" 13th, ").should("be.visible"); // start date
    cy.get("p").contains(" 14, ").should("be.visible"); // end date

    cy.get("button").contains("Register").should("be.visible");

    cy.get("p").contains("Manage event").should("be.visible");
    cy.get("a").contains("Edit event").should("be.visible");

    // participate
    cy.get("button").contains("Register").click();

    // wait for participation confirmation
    cy.get("h2").contains("You're in!", { timeout: 8000 }).should("be.visible");

    // check that we have a ticket with the event name visible
    cy.visit("/tickets");
    cy.get('a[href^="/ticket/"]').contains(testEventName).should("be.visible");
  });

  it("send event feed standard post", () => {
    // start from the event we just created
    cy.visit("/event/11");

    // Explore an event
    cy.get("a").contains("Discover").click();
    cy.get('a[href^="/event/"]').last().click();

    logout();

    // Go Description tab
    cy.get("button").contains("Discussions").click();

    // SocialFeedForm should not exist
    cy.get('textarea[placeholder="Dont\'t be shy, say something!"]').should(
      "not.exist",
    );

    login();

    // Go to feed tab
    cy.get("button").contains("Discussions").click();

    // SocialFeedForm should exist
    cy.get(`textarea[placeholder="Don't be shy, say something!"]`)
      .should("exist")
      .should("be.enabled")
      .type(testStandardPost, { delay: 1 });

    // Submit post
    cy.get('button[aria-label="submit post"]').click();

    // Check post exists
    cy.get("p").contains(testStandardPost).should("be.visible");
  });

  it("send event feed poll post", () => {
    // start from the event we just created
    cy.visit("/event/11");

    // Explore an event
    cy.get("a").contains("Discover").click();
    cy.get('a[href^="/event/"]').last().click();

    cy.url().should("contain", "/event/");

    // EventFeedForm should not exist
    cy.get('textarea[placeholder="Dont\'t be shy, say something!"]').should(
      "not.exist",
    );

    cy.url().then((url) => {
      login();
      cy.visit(url);
    });

    // Go to feed tab
    cy.get("button").contains("Discussions").click();

    cy.url().should("contain", "/feed");

    // Channge type of post
    cy.get('button[aria-label="set type post"]').click();

    // Enter question
    cy.get(`textarea[placeholder="What do you wanna ask to the community ?"]`)
      .should("be.enabled")
      .type(testStandardPost, { delay: 1 });

    // Enter answers
    cy.get('input[name="options.0.text"]').type("Answer 1", { delay: 1 });
    cy.get('input[name="options.1.text"]').type("Answer 2", { delay: 1 });

    // Add another answer
    cy.get("p").contains("Add another answer").click();

    // Check if delete answer button is displayed
    cy.get(".lucide-trash2").should("have.length", 3);

    // Add last answer
    cy.get('input[name="options.2.text"]').type("Answer 3", { delay: 1 });

    // Submit poll
    cy.get('button[aria-label="submit post"]').click();

    // Views polls
    cy.get("button").contains("Votes").click();

    cy.get("p").contains(testStandardPost).should("be.visible");
    cy.get("p").contains("Answer 1").should("be.visible");
    cy.get("p").contains("Answer 2").should("be.visible");
    cy.get("p").contains("Answer 3").should("be.visible");

    // Select one answer
    cy.get("p").contains("Answer 3").click();

    toastShouldContain("Vote submitted !");

    // Add reaction to post
    cy.get(".reaction-btn").first().click();
    // Select emoji
    cy.get('img[alt="grinning"]').first().click();
  });

  it("send a comment on an event post", () => {
    // start from the event we just created
    cy.visit("/event/11");

    // Explore an event
    cy.get("a").contains("Discover").click();
    cy.get('a[href^="/event/"]').last().click();

    cy.url().should("contain", "/event/");

    login();

    // Go Description tab
    cy.get("button").contains("Discussions").click();

    cy.url().should("contain", "/feed");

    // SocialFeedForm should exist
    cy.get(`textarea[placeholder="Don't be shy, say something!"]`)
      .should("exist")
      .should("be.enabled")
      .type(testStandardPost, { delay: 1 });

    // Submit post
    cy.get('button[aria-label="submit post"]').click();

    // Check post exists
    cy.get("p").contains(testStandardPost).should("be.visible");

    // check that no comment exists
    cy.get('button[title="Show replies"]')
      .contains("0")
      .should("be.visible")
      .parent()
      .click();

    cy.url().should("include", "/post/");

    // Type comment
    cy.get(`textarea[placeholder="Don't be shy, say something!"]`)
      .should("exist")
      .should("be.enabled")
      .type(testComment, { delay: 1 });

    // Submit comment
    cy.get('button[aria-label="submit post"]').should("be.enabled").click();

    // Assert comment exists
    cy.get("p").contains(testComment).should("be.visible");
  });

  it("event not found", () => {
    // Visit a non existing event page
    cy.visit("/event/50", { failOnStatusCode: false });

    cy.get("p").contains("Page not found.").should("be.visible");
  });

  it("unable to scan a ticket", () => {
    // start from the home
    cy.visit("/");

    // Explore an event
    cy.get("a").contains("Discover").click();
    cy.get('a[href^="/event/"]').last().click();

    cy.url().should("contain", "/event/");

    cy.url().then((url) => {
      login();
      cy.visit(url);
    });

    cy.get("a").contains("Open ticket scanner").click();

    cy.wait(5000);

    cy.get("h2").should("contain", "Invalid ticket");

    cy.visit("/");
  });

  it("add a gatekeeper", () => {
    // start from the first fake event
    cy.visit("/event/1");

    cy.url().then((url) => {
      login();
      cy.visit(url);
    });

    cy.get("p").contains("Manage gatekeepers (1)").click();

    cy.get('input[placeholder="Email..."]').type(testEmail2);

    cy.get('button[aria-label="add gatekeeper"]').click();

    cy.get("button").contains("Done").click();

    cy.get("p")
      .contains("Manage gatekeepers (2)", { timeout: 10000 })
      .should("be.visible");

    cy.url().then((url) => {
      // Connect with other account
      logout();
      login(testEmail2);
      cy.visit(url);

      cy.get("a").contains("Open ticket scanner").should("exist");
    });
  });

  it("remove a gatekeeper", () => {
    // start from the first fake event
    cy.visit("/event/1");

    cy.url().then((url) => {
      logout();
      login();
      cy.visit(url);
    });

    cy.get("p").contains("Manage gatekeepers (2)").click();

    cy.get('button[aria-label="delete gatekeeper"]').click();

    cy.get("button").contains("Done").click();

    cy.wait(5000);

    cy.get("p").contains("Manage gatekeepers (1)").should("be.visible");

    cy.url().should("include", "/event/");
    cy.url().should("not.include", "/edit");

    cy.url().then((url) => {
      // Connect with other account
      logout();
      login(testEmail2);
      cy.visit(url);

      cy.get("a").contains("Open ticket scanner").should("not.exist");
    });
  });

  it("cancel participation", () => {
    cy.createEvent({ exclusive: false });

    cy.url().then((url) => {
      cy.visit(url);
    });

    // Participate to an event
    cy.get("button").contains("Register").click();
    cy.get("h2")
      .contains("You're in!", { timeout: 16000 })
      .should("be.visible");

    cy.get("button").contains("Cancel my participation").click();
    cy.get('button[aria-label="cancel participation"').click();
    cy.wait(2000);

    toastShouldContain("Your participation has been cancelled");

    // Participate again to an event (potential regression)
    cy.get("button").contains("Register").click();
    cy.get("h2")
      .contains("You're in!", { timeout: 16000 })
      .should("be.visible");
  });

  it("access an exclusive event", () => {
    cy.createEvent({ exclusive: true });
    cy.url().then((url) => {
      logout();
      cy.visit(url);
    });

    // Guard
    cy.get("input[type=password]").type(testEventPassword);
    cy.get("button").contains("Access event").click();

    // Assertions
    cy.get("h1").contains(testEventName).should("be.visible");
    cy.get("h2").contains(testEventLocation).should("be.visible");
  });

  it("access a community", () => {
    cy.visit("/");

    // Explore communities
    cy.get("a").contains("Communities").click();
    cy.get('a[href^="/community/"]').last().click();

    cy.url().should("contain", "/community/");

    // Check sections
    cy.get("button")
      .contains("Chat")
      .should("have.attr", "aria-selected", "true");

    cy.get("button").contains("Votes").click();
    cy.get("button").contains("Events").click();
    cy.get("button").contains("Members").click();
  });

  it("send community feed standard post", () => {
    // start from the home
    cy.visit("/");

    // Explore a community
    cy.get("a").contains("Communities").click();
    cy.get('a[href^="/community/"]').last().click();

    cy.url().should("contain", "/community/");

    // SocialFeedForm should not exist
    cy.get('textarea[placeholder="Dont\'t be shy, say something!"]').should(
      "not.exist",
    );

    cy.url().then((url) => {
      login();
      cy.visit(url);
    });

    // Go to chat tab
    cy.get("button").contains("Chat").click();

    // SocialFeedForm should exist
    cy.get(`textarea[placeholder="Don't be shy, say something!"]`)
      .should("exist")
      .type(testStandardPost, { delay: 1 });

    // Submit post
    cy.get('button[aria-label="submit post"]').click();

    // Check post exists
    cy.get("p").contains(testStandardPost).should("be.visible");
  });

  it("send community feed poll post", () => {
    // start from the home
    cy.visit("/");

    // Explore a community
    cy.get("a").contains("Communities").click();
    cy.get('a[href^="/community/"]').last().click();

    cy.url().should("contain", "/community/");

    // SocialFeedForm should not exist
    cy.get('textarea[placeholder="Dont\'t be shy, say something!"]').should(
      "not.exist",
    );

    cy.url().then((url) => {
      login();
      cy.visit(url);
    });

    // Go to chat tab
    cy.get("button").contains("Chat").click();

    // Channge type of post
    cy.get('button[aria-label="set type post"]').click();

    // Enter question
    cy.get(
      `textarea[placeholder="What do you wanna ask to the community ?"]`,
    ).type(testStandardPost, { delay: 1 });

    // Enter answers
    cy.get('input[name="options.0.text"]').type("Answer 1", { delay: 1 });
    cy.get('input[name="options.1.text"]').type("Answer 2", { delay: 1 });

    // Add another answer
    cy.get("p").contains("Add another answer").click();

    // Check if delete answer button is displayed
    cy.get(".lucide-trash2").should("have.length", 3);

    // Add last answer
    cy.get('input[name="options.2.text"]').type("Answer 3", { delay: 1 });

    // Submit poll
    cy.get('button[aria-label="submit post"]').click();

    // Views polls
    cy.get("button").contains("Votes").click();

    cy.get("p").contains(testStandardPost).should("be.visible");
    cy.get("p").contains("Answer 1").should("be.visible");
    cy.get("p").contains("Answer 2").should("be.visible");
    cy.get("p").contains("Answer 3").should("be.visible");

    // Select one answer
    cy.get("p").contains("Answer 3").click();

    toastShouldContain("Vote submitted !");

    // Add reaction to post
    cy.get(".reaction-btn").first().click();
    // Select emoji
    cy.get('img[alt="grinning"]').first().click();
  });

  it("send a comment on a community post", () => {
    // start from the community we just created
    cy.visit("/");

    // Explore a community
    cy.get("a").contains("Communities").click();
    cy.get('a[href^="/community/"]').last().click();

    cy.url().should("contain", "/community/");

    cy.url().then((url) => {
      login();
      cy.visit(url);
    });

    // cy.get("a").contains("Edit community").should("be.visible");
    // cy.get("a").contains("Leave community").should("be.visible");

    // Go to chat tab
    cy.get("button").contains("Chat").click();

    // SocialFeedForm should exist
    cy.get(`textarea[placeholder="Don't be shy, say something!"]`)
      .should("exist")
      .type(testStandardPost, { delay: 1 });

    // Submit post
    cy.get('button[aria-label="submit post"]').click();

    // Check post exists
    cy.get("p").contains(testStandardPost).should("be.visible");

    // check that no comment exists
    cy.get('button[title="Show replies"]')
      .contains("0")
      .should("be.visible")
      .parent()
      .click();

    cy.url().should("include", "/post/");

    // Type comment
    cy.get(`textarea[placeholder="Don't be shy, say something!"]`)
      .should("exist")
      .type(testComment, { delay: 1 });

    // Submit comment
    cy.get('button[aria-label="submit post"]').click();

    // Assert comment exists
    cy.get("p").contains(testComment).should("be.visible");
  });
});

Cypress.Commands.add(
  "createEvent",
  ({
    exclusive = false,
    gatekeepers = [],
  }: {
    exclusive: boolean;
    gatekeepers?: string[];
  }) => {
    // start from the home
    cy.visit("/");

    // click on home create button
    cy.get("button").contains("Create").click();

    login();

    // fill event info
    cy.get("input[name=imageUri]").selectFile(
      "cypress/fixtures/bug-bash-bonanza.webp",
      { force: true }, // XXX: we could maybe use a label with a "for" param to avoid forcing here
    );
    cy.get('textarea[placeholder="Event name..."]').type(testEventName);
    cy.get('textarea[placeholder="Description..."]').type(testEventDesc, {
      delay: 1,
    });

    // custom location
    cy.get('input[placeholder="Add an address..."]').type(testEventLocation);
    cy.get("p").contains(`Use ${testEventLocation}`).trigger("click");

    cy.get('input[placeholder="Capacity..."]').type(testEventCapacity);

    // choose dates in the start of next month
    cy.get("button").contains("Pick a start date...").click();
    cy.get('button[aria-label="Choose the Month"').click();

    cy.get('div[role="option"]').contains("April").click();

    const year = new Date().getFullYear() + 1;

    cy.get('button[aria-label="Choose the Year"').click();
    cy.get('div[role="option"]').contains(`${year}`).click();
    cy.get('table[role="grid"]').find("button").contains("13").click();

    cy.wait(1000);

    cy.get('button[aria-label="Pick date"]').eq(1).click();
    cy.get('button[aria-label="Choose the Month"').click();
    cy.get('div[role="option"]').contains("April").click();

    cy.get('button[aria-label="Choose the Year"').click();
    cy.get('div[role="option"]').contains(`${year}`).click();
    cy.wait(500); // wait for start date calendar to disapear so there is only one "Choose the Month" button present
    cy.get('table[role="grid"]').find("button").contains("14").click();

    if (exclusive) {
      cy.get("button[data-name=exclusive]").click();
      cy.get("input[name=password]").type(testEventPassword);
    }

    cy.get("button").contains("Create event").click();

    cy.wait(1000);

    toastShouldContain("Event created!");

    cy.url().should("include", "/event/");
    cy.url().should("not.include", "/create");

    if (gatekeepers.length > 0) {
      cy.get("p").contains("Manage gatekeepers (1)").click();
      gatekeepers.forEach((gatekeeper) => {
        cy.get('input[placeholder="Email..."]').type(gatekeeper);
        cy.get('button[aria-label="add gatekeeper"]').click();
      });

      cy.get("button").contains("Done").click();
      cy.wait(5000);
    }
  },
);
