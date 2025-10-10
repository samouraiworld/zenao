"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { createContext, useContext, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { EventRegistrationForm } from "../event-registration";
import { EventUserRole } from "@/lib/queries/event-users";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { GuestRegistrationSuccessDialog } from "@/components/dialogs/guest-registration-success-dialog";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { CancelRegistrationConfirmationDialog } from "@/components/dialogs/cancel-registration-confirmation-dialog";

type EventParticipationContextType = {
  password: string;
  roles: EventUserRole[];
  eventId: string;
  eventData: EventInfo;
  isParticipant: boolean;
  isStarted: boolean;
  isSoldOut: boolean;
};

const defaultValue: EventParticipationContextType = {
  password: "",
  roles: [],
  eventId: "",
  eventData: {} as EventInfo,
  isParticipant: false, // Default to false
  isStarted: false, // Default to false
  isSoldOut: false, // Default to false
};

const EventParticipationContext =
  createContext<EventParticipationContextType>(defaultValue);

const useEventParticipation = () => {
  return useContext(EventParticipationContext);
};
export const EventParticipation = ({
  children,
  eventId,
  eventData,
  roles,
  password,
}: {
  eventId: string;
  children: React.ReactNode;
  eventData: EventInfo;
  roles: EventUserRole[];
  password: string;
}) => {
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isStarted = Date.now() > Number(eventData.startDate) * 1000;
  const isSoldOut = eventData.capacity - eventData.participants <= 0;

  return (
    <EventParticipationContext.Provider
      value={{
        password,
        roles,
        eventId,
        eventData,
        isParticipant,
        isStarted,
        isSoldOut,
      }}
    >
      {children}
    </EventParticipationContext.Provider>
  );
};

EventParticipation.Registration = function EventParticipationRegistration() {
  const { eventId, eventData, isParticipant, isStarted, password } =
    useEventParticipation();
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  const t = useTranslations("event");

  if (isParticipant || isStarted) {
    return null;
  }

  return (
    <>
      <GuestRegistrationSuccessDialog
        title={eventData.title}
        email={guestEmail}
        open={guestDialogOpen}
        onOpenChange={(o) => setGuestDialogOpen(o)}
      />

      {/* Registration logic will go here */}
      <div>
        <Heading level={2} size="xl">
          {t("registration")}
        </Heading>
        <Text className="my-4">{t("join-desc")}</Text>
        <EventRegistrationForm
          eventId={eventId}
          eventPassword={password}
          onGuestRegistrationSuccess={(email) => {
            setGuestEmail(email);
            setGuestDialogOpen(true);
          }}
        />
      </div>
    </>
  );
};

EventParticipation.TooLate = function EventParticipationTooLate() {
  const { isParticipant, isStarted } = useEventParticipation();
  const t = useTranslations("event");

  if (isParticipant || !isStarted) {
    return null;
  }

  return (
    <div>
      <Heading level={2} size="xl">
        {t("already-begun")}
      </Heading>
      <Text className="my-4">{t("too-late")}</Text>
    </div>
  );
};

EventParticipation.SoldOut = function EventParticipationSoldOut() {
  const { isParticipant, isSoldOut } = useEventParticipation();
  const t = useTranslations("event");

  if (isParticipant || !isSoldOut) {
    return null;
  }

  return (
    <div>
      <Heading level={2} size="xl">
        {t("sold-out-msg")}
      </Heading>
    </div>
  );
};

EventParticipation.Participant = function EventParticipationParticipant() {
  const { eventId, isParticipant, isStarted } = useEventParticipation();
  const [confirmCancelDialogOpen, setConfirmCancelDialogOpen] = useState(false);
  const t = useTranslations("event");

  if (!isParticipant) {
    return null;
  }

  return (
    <>
      <CancelRegistrationConfirmationDialog
        open={confirmCancelDialogOpen}
        onOpenChange={setConfirmCancelDialogOpen}
        eventId={eventId}
      />

      <div>
        <div className="flex flex-row justify-between">
          <div className="flex flex-col gap-2">
            <Heading level={2} size="xl">
              {t("in")}
            </Heading>
            {!isStarted && (
              <SignedIn>
                <>
                  <Text variant="secondary">
                    {"Not going to the event anymore ?"}
                  </Text>
                  <Button
                    variant="link"
                    className="justify-normal px-0"
                    onClick={() => setConfirmCancelDialogOpen(true)}
                  >
                    {t("cancel-my-participation")}
                  </Button>
                </>
              </SignedIn>
            )}
          </div>
          <SignedIn>
            <Link href={`/ticket/${eventId}`} className="text-main underline">
              {t("see-ticket")}
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Text className="text-main underline">
                {t("login-to-see-tickets")}
              </Text>
            </SignInButton>
          </SignedOut>
          {/* TODO: create a clean decount timer */}
          {/* <SmallText>{t("start", { count: 2 })}</SmallText> */}
        </div>
      </div>
    </>
  );
};
