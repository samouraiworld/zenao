import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import React from "react";
import { EmailEventImg } from "./email-event-img";
import { EmailEventBox } from "./email-event-box";

// To generate an example: make generate && go run ./backend mail > event-cancellation.html

export const EventCancellationEmail = () => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>Cancellation notice for {"{{.EventName}}"}</Preview>
      <Container style={container}>
        {/* Event Banner */}
        <EmailEventImg src="{{.ImageURL}}" />

        {/* Black cancellation banner */}
        <Section style={welcome.section}>
          <Text style={welcome.text}>Event Cancelled</Text>
        </Section>

        {/* Event details */}
        <Section style={details.section}>
          <Row>
            <Column>
              <Heading style={details.headingText}>Event details:</Heading>
            </Column>
          </Row>
          <Row>
            <Column>
              <Text style={details.eventNameText}>{"{{.EventName}}"}</Text>
            </Column>
          </Row>
          <Row>
            <Column>
              <EmailEventBox
                title="PLANNED DATES"
                icon={"{{.CalendarIconURL}}"}
                iconAlt="Calendar icon"
                content={`{{.EventStartDate}} → {{.EventEndDate}}`}
              />
            </Column>
          </Row>
          <Row>
            <Column>
              <EmailEventBox
                title="ADDRESS"
                icon={"{{.PinIconURL}}"}
                iconAlt="Pin icon"
                content={"{{.LocationText}}"}
              />
            </Column>
          </Row>
        </Section>

        {/* Footer with cancellation note */}
        <Section style={footer.section}>
          <Text style={footer.text}>
            This event has been cancelled. We apologize for the inconvenience.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default EventCancellationEmail;

// Styles

const main = {
  backgroundColor: "#ffffff",
  color: "#000000",
  fontFamily:
    '"Helvetica Neue",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,sans-serif',
};

const container = {
  margin: "10px auto",
  maxWidth: 800,
  border: "1px solid #F5F5F5",
};

const welcome = {
  section: {
    padding: "48px 20px",
    height: 220,
    backgroundColor: "#000000",
    wordBreak: "break-word",
  },
  text: {
    color: "#FFFFFF",
    textAlign: "center" as const,
    fontWeight: 500,
    margin: 0,
    fontSize: 48,
    lineHeight: 1.1,
    letterSpacing: -1.2,
  },
} as const;

const details = {
  section: {
    padding: "48px 20px",
  },
  headingText: {
    fontSize: 22,
    lineHeight: 1.3,
    fontWeight: 500,
    letterSpacing: -0.6,
    margin: 0,
    marginBottom: 8,
  },
  eventNameText: {
    fontSize: 24,
    fontWeight: 500,
    lineHeight: 1.3,
    letterSpacing: -0.6,
    margin: 0,
    marginBottom: 20,
  },
} as const;

const footer = {
  section: {
    padding: "20px",
    backgroundColor: "#F5F5F5",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: 24,
    textAlign: "center" as const,
  },
  text: {
    fontSize: 14,
    color: "#666666",
    margin: 0,
  },
};
