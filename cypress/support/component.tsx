// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import { ClerkProvider } from "@clerk/nextjs";
import "./commands";
import "@/app/globals.css";

import { mount } from "cypress/react";
import { NextIntlClientProvider } from "next-intl";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add("mount", (component, options) => {
  const messages = {
    header: {
      zenao: "ZENAO",
      discover: "Discover",
      features: "Features",
      manifesto: "Manifesto",
      "your-events": "Your events",
      "your-tickets": "Your tickets",
      "sign-in": "Sign in",
    },
  };
  const router = {
    route: "/",
    pathname: "/",
    query: {},
    asPath: "/",
    basePath: "",
    back: cy.stub().as("router:back"),
    forward: cy.stub().as("router:forward"),
    push: cy.stub().as("router:push"),
    reload: cy.stub().as("router:reload"),
    replace: cy.stub().as("router:replace"),
    isReady: true,
    ...(options?.router || {}),
  };
  const queryClient = getQueryClient();

  return mount(
    <RouterContext.Provider value={router}>
      <ClerkProvider>
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider messages={messages} locale="en">
            {component}
          </NextIntlClientProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </RouterContext.Provider>,
    options,
  );
});

// Example use:
// cy.mount(<MyComponent />)
