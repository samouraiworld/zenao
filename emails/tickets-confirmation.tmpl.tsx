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

// To generate an example, run `make generate && go run ./backend mail > tickets-confirmation.html`

export const TicketsConfirmationEmail = () => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>Tickets for {"{{.EventName}}"}</Preview>
      <Container style={container}>
        <EmailEventImg src="{{.ImageURL}}" />
        <Section style={welcome.section}>
          <Text style={welcome.text}>{"{{.WelcomeText}}"}</Text>
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
                content={`{{.TimeText}}`}
              />
            </Column>
          </Row>
          <Row>
            <Column>
              <EmailEventBox
                title="ADDRESS"
                icon={`{{.PinIconURL}}`}
                iconAlt="Pin icon"
                content={`{{.LocationText}}`}
              />
            </Column>
          </Row>
          {"{{if .Tickets}}"}
          <Row>
            <Column>
              <Heading style={tickets.headingText}>Your tickets:</Heading>
              <Text style={tickets.hint}>
                Show the QR code at the entrance. A printable PDF version is
                also attached to this email.
              </Text>
            </Column>
          </Row>
          {"{{range .Tickets}}"}
          <Row>
            <Column>
              <Section style={tickets.box}>
                {/* Plain <img> (not react-email <Img>) so the build does not
                    hoist a top-level preload <link href="{{.Src}}">, which
                    would reference a field that only exists inside the range. */}
                <img
                  src="{{.Src}}"
                  width={200}
                  height={200}
                  alt="Ticket QR code"
                  style={tickets.qr}
                />
                <Text style={tickets.label}>{"{{.Label}}"}</Text>
              </Section>
            </Column>
          </Row>
          {"{{end}}{{end}}"}
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

export default TicketsConfirmationEmail;

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

const tickets = {
  headingText: {
    fontSize: 22,
    lineHeight: 1.3,
    fontWeight: 500,
    letterSpacing: -0.6,
    margin: 0,
    marginTop: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 1.4,
    color: "#666666",
    margin: 0,
    marginBottom: 16,
  },
  box: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    padding: 16,
  },
  qr: {
    display: "block",
    margin: "0 auto",
  },
  label: {
    fontSize: 14,
    lineHeight: 1.3,
    fontWeight: 500,
    letterSpacing: -0.2,
    margin: 0,
    marginTop: 12,
    textAlign: "center",
    wordBreak: "break-word",
  },
} as const;
