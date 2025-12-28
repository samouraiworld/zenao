"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useQRCode } from "next-qrcode";
import { format, fromUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { cn } from "@/lib/tailwind";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/widgets/images/web3-image";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { makeLocationFromEvent } from "@/lib/location";
import { locationTimezone } from "@/lib/event-location";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";

type TicketCardProps = {
  eventId: string;
  event: EventInfo;
  ticketInfo: {
    ticketSecret: string;
    userEmail: string;
  };
};

export function TicketCard({ eventId, event, ticketInfo }: TicketCardProps) {
  const t = useTranslations("tickets");
  const { Canvas: QRCode } = useQRCode();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-80, 80], [25, -25]);
  const rotateY = useTransform(x, [-80, 80], [-25, 25]);

  const location = makeLocationFromEvent(event.location);
  const eventTimezone = locationTimezone(location);
  const timezone = useLayoutTimezone(eventTimezone);

  return (
    <div className="card-3d">
      <motion.div
        style={{ x, y, rotateX, rotateY }}
        className={cn(
          "max-w-[550px] flex flex-col gap-4 w-full mx-auto bg-white rounded shadow-lg",
          "max-sm:rounded-tl rounded-tl max-sm:rounded-tr rounded-tr",
        )}
        whileHover={{ rotateX: -5, rotateY: 5 }}
      >
        <div className="w-full max-md:flex justify-center">
          <div className="w-full">
            <AspectRatio ratio={16 / 9}>
              <Web3Image
                src={event.imageUri}
                sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
                fill
                alt="Event"
                priority
                className="flex w-full max-sm:rounded-tl rounded-tl max-md:rounded-tr md:rounded-bl self-center object-cover pointer-events-none"
              />
            </AspectRatio>
          </div>
        </div>
        <div className="flex grow flex-col gap-4 px-4 py-4 max-sm:items-center">
          <Heading level={2} size="xl" className="text-black">
            {event.title}
          </Heading>
          <Text className="text-black font-semibold">
            {ticketInfo.userEmail}
          </Text>
          <div className="flex flex-row gap-2 max-sm:items-center">
            <div className="flex flex-col max-sm:items-center">
              <Heading level={3} variant="secondary" suppressHydrationWarning>
                {format(fromUnixTime(Number(event.startDate)), "PPP")}
              </Heading>
              <div className="flex flex-row text-sm gap-1">
                <Text variant="secondary" suppressHydrationWarning>
                  {format(fromUnixTime(Number(event.startDate)), "p")}
                </Text>
                <Text variant="secondary">-</Text>
                <Text variant="secondary" suppressHydrationWarning>
                  {formatTZ(fromUnixTime(Number(event.endDate)), "PPp O", {
                    timeZone: timezone,
                  })}
                </Text>
              </div>
            </div>
          </div>
          <Link href={`/event/${eventId}`} className="text-main underline">
            {t("see-event-details")}
          </Link>

          <div className="flex flex-col grow items-center justify-center">
            <div className="aspect-video flex flex-col items-center justify-center qrcode">
              <QRCode
                text={ticketInfo.ticketSecret}
                options={{
                  errorCorrectionLevel: "M",
                  margin: 2,
                  scale: 5,
                  width: 125,
                  color: {
                    dark: "#000005",
                    light: "#ffffff",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
