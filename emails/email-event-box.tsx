import { Column, Img, Row, Section, Text } from "@react-email/components";
import React from "react";

export const EmailEventBox: React.FC<{
  title: string;
  icon: string;
  iconAlt: string;
  content: string;
}> = ({ title, icon, iconAlt, content }) => {
  return (
    <Section style={box}>
      <Row>
        <Column>
          <Text style={boxTitle}>{title}</Text>
        </Column>
      </Row>
      <Row>
        <Column>
          <Img alt={iconAlt} src={icon} width={32} height={32} />
        </Column>
      </Row>
      <Row>
        <Column>
          <Text style={boxContent}>{content}</Text>
        </Column>
      </Row>
    </Section>
  );
};

const box = {
  marginTop: 8,
  marginBottom: 8,
  backgroundColor: "#F5F5F5",
  borderRadius: 4,
  padding: 12,
  height: "100%",
} as const;

const boxTitle = {
  margin: 0,
  color: "#666666",
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.5,
  paddingBottom: 40,
  lineHeight: 1.3,
} as const;

const boxContent = {
  margin: 0,
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.3,
  letterSpacing: -0.2,
  paddingTop: 10,
} as const;
