import {
  Body,
  Button,
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

// To generate an example, run `make generate && go run ./backend mail > event-announcement.html`

export const EventAnnouncementEmail = () => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>
        New Event Sponsored by the Community - {"{{.EventName}}"}
      </Preview>
      <Container style={container}>
        <EmailEventImg src="{{.EventImage}}" />
        <Section style={welcome.section}>
          <Text style={welcome.text}>
            Join us for the upcoming event sponsored by {"{{.CommunityName}}"}!
          </Text>
        </Section>
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
                title="DATE AND TIME"
                icon={`{{.CalendarIconURL}}`}
                iconAlt="Calendar icon"
                content={`From: {{.EventDate}} To: {{.EventEndDate}}`}
              />
            </Column>
          </Row>
          <Row>
            <Column>
              <EmailEventBox
                title="SPONSORED BY"
                icon={`{{.CommunityImage}}`}
                iconAlt="Community logo"
                content={`{{.CommunityName}}`}
              />
            </Column>
          </Row>
          <Row>
            <Column>
              <Button href="{{.EventURL}}" style={details.seeEventButton}>
                See the event
              </Button>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default EventAnnouncementEmail;

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
    textAlign: "center",
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
    fontSize: 28,
    fontWeight: 500,
    lineHeight: 1.3,
    letterSpacing: -0.6,
    margin: 0,
    marginBottom: 20,
  },
  seeEventButton: {
    backgroundColor: "#000000",
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 1.3,
    width: "100%",
    borderRadius: 4,
    marginTop: 16,
    textAlign: "center",
    paddingTop: 14,
    paddingBottom: 14,
    fontWeight: 500,
  },
} as const;
