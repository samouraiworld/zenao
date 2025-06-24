import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import React from "react";

// To generate an example: make generate && go run ./backend mail > event-edited.html

export const EventBroadcastMessageEmail = () => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>Message from organizer of {"{{.EventName}}"}</Preview>
      <Container style={container}>
        <Img
          alt="Event image"
          src="{{.ImageURL}}"
          width={960}
          height={540}
          style={eventImage}
        />
        <Section style={welcome.section}>
          <Text style={welcome.text}>Message from {"{{.EventName}}"}</Text>
        </Section>
        <Section style={details.section}>
          <Row>
            <Column>
              <Section style={messageBox}>
                <Text style={messageText}>{"{{.Message}}"}</Text>
              </Section>
            </Column>
          </Row>
          <Row>
            <Column>
              <Button href="{{.EventURL}}" style={details.seeEventButton}>
                View event details
              </Button>
            </Column>
          </Row>
        </Section>
        <Section style={footer}>
          <Text style={footerText}>
            You're receiving this email because you're a participant of{" "}
            {"{{.EventName}}"}.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default EventBroadcastMessageEmail;

// Styles

const main = {
  backgroundColor: "#ffffff",
  color: "#000000",
  fontFamily:
    '"Helvetica Neue",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,sans-serif',
};

const container = {
  margin: "10px auto",
  width: "600px",
  maxWidth: "100%",
  border: "1px solid #F5F5F5",
};

const welcome = {
  section: {
    padding: "48px 20px",
    height: 220,
    backgroundColor: "#000000",
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

const eventImage = {
  width: "100%",
  objectFit: "cover",
  borderTopLeftRadius: 4,
  borderTopRightRadius: 4,
} as const;

const messageBox = {
  backgroundColor: "#F5F5F5",
  borderRadius: 8,
  padding: "20px 20px 20px 20px",
  marginBottom: 24,
  borderLeft: "4px solid #000000",
} as const;

const messageText = {
  fontSize: 16,
  lineHeight: 1.6,
  margin: 0,
  color: "#333333",
  whiteSpace: "pre-line",
} as const;

const footer = {
  padding: "20px",
  backgroundColor: "#F5F5F5",
  borderBottomLeftRadius: 4,
  borderBottomRightRadius: 4,
} as const;

const footerText = {
  fontSize: 12,
  color: "#666666",
  textAlign: "center",
  margin: 0,
} as const;
