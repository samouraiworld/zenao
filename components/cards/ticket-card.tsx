"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useQRCode } from "next-qrcode";
import { format, fromUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AspectRatio } from "../shadcn/aspect-ratio";
import { Web3Image } from "../images/web3-image";
import Heading from "../texts/heading";
import Text from "../texts/text";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { cn } from "@/lib/tailwind";

type TicketCardProps = {
  eventId: string;
  event: EventInfo;
  timezone: string;
  ticketSecret: string;
};

export function TicketCard({
  eventId,
  event,
  timezone,
  ticketSecret,
}: TicketCardProps) {
  const t = useTranslations("tickets");
  const { Canvas: QRCode } = useQRCode();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(x, [-100, 100], [25, -25]);
  const rotateY = useTransform(y, [-100, 100], [25, -25]);

  return (
    <div className="card-3d">
      <motion.div
        style={{ x, y, rotateX, rotateY, z: 100 }}
        drag
        dragElastic={0.18}
        dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
        className={cn(
          "md:max-w-full flex flex-col gap-4 w-full mx-auto md:flex-row bg-white rounded-xl shadow-lg",
        )}
      >
        <div className="w-full md:max-w-[350px]">
          <AspectRatio ratio={1 / 1}>
            <Web3Image
              src={event.imageUri}
              sizes="(max-width: 768px) 100vw,
            (max-width: 1200px) 50vw,
            33vw"
              fill
              alt="Event"
              priority
              className="flex w-full rounded-xl self-center object-cover pointer-events-none"
            />
          </AspectRatio>
        </div>
        <div className="flex grow flex-col gap-4 px-4 py-4 max-sm:items-center">
          <Heading level={2} size="xl" className="text-black">
            {event.title}
          </Heading>
          <div className="flex flex-row gap-2 max-sm:items-center">
            <div className="flex flex-col max-sm:items-center">
              <Heading level={3} variant="secondary">
                {format(fromUnixTime(Number(event.startDate)), "PPP")}
              </Heading>
              <div className="flex flex-row text-sm gap-1">
                <Text variant="secondary">
                  {format(fromUnixTime(Number(event.startDate)), "p")}
                </Text>
                <Text variant="secondary">-</Text>
                <Text variant="secondary">
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
            <QRCode
              text={ticketSecret}
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
      </motion.div>
    </div>
  );
}
