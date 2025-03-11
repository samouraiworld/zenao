"use client";

import { ReactNode, useCallback, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { format, fromUnixTime } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { eventOptions } from "@/lib/queries/event";
import { Card } from "@/components/cards/Card";
import { Text } from "@/components/texts/DefaultText";
import { SmallText } from "@/components/texts/SmallText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { LargeText } from "@/components/texts/LargeText";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { eventUserRoles } from "@/lib/queries/event-users";
import { Separator } from "@/components/shadcn/separator";
import { GnowebButton } from "@/components/buttons/GnowebButton";
import { web3ImgLoader } from "@/lib/web3-img-loader";
import { userAddressOptions } from "@/lib/queries/user";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { EventFeed } from "@/app/event/[id]/event-feed";
import { ParticipateForm } from "@/app/event/[id]/ParticipateForm";
import { cn } from "@/lib/tailwind";
import { screenContainerMaxWidth } from "@/components/layout/ScreenContainer";

function EventSection({
  title,
  children,
  className,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Text className="font-semibold">{title}</Text>
      <Separator className="mt-2 mb-3" />
      {children && children}
    </div>
  );
}

const eventTabs = ["global-feed", "polls-feed"] as const;
export type EventTab = (typeof eventTabs)[number];

export function EventContent({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string | null;
}) {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data: event } = useSuspenseQuery(eventOptions(eventId));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));
  const isOrganizer = roles.includes("organizer");
  const isParticipate = roles.includes("participant");
  const isStarted = Date.now() > Number(event.startDate) * 1000;
  const queryClient = useQueryClient();

  const t = useTranslations("event");
  const [loading, setLoading] = useState<boolean>(false);

  const handleParticipateSuccess = useCallback(async () => {
    const opts = eventUserRoles(eventId, address);
    await queryClient.cancelQueries(opts);
    queryClient.setQueryData(opts.queryKey, (roles) => {
      if (!roles) {
        return ["participant" as const];
      }
      if (!roles.includes("participant")) {
        return [...roles, "participant" as const];
      }
      return roles;
    });
  }, [queryClient, eventId, address]);

  const location =
    event.location?.address.case == "custom"
      ? event.location.address.value.address
      : "";
  const fakeImageUri =
    "https://maroon-horizontal-bobolink-562.mypinata.cloud/ipfs/QmVxDaUBtkkT2AHKsW6wcX44AegLzfzCFkr4KMAbckFfMU";

  const iconSize = 22;

  const [tab, setTab] = useState<EventTab>("global-feed");

  if (!event) {
    return <p>{`Event doesn't exist`}</p>;
  }
  return (
    <div
      className={cn(
        "flex flex-col w-full sm:h-full gap-10",
        fakeImageUri && "pt-[140px]",
      )}
    >
      {/* ---- Event hero image */}
      {!!fakeImageUri && (
        <Image
          src={fakeImageUri}
          width={screenContainerMaxWidth}
          height={200}
          alt="Event hero"
          priority
          className="object-cover w-full h-[200px] rounded-xl self-center absolute top-0 self-center -z-10"
          style={{ maxWidth: screenContainerMaxWidth }}
          loader={web3ImgLoader}
        />
      )}

      <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10 max-h-[920px]">
        <div className="flex flex-col gap-4 w-full sm:w-2/5">
          {/* ---- Event image */}
          <Image
            src={event.imageUri}
            width={330}
            height={330}
            alt="Event image"
            priority
            className="flex w-full rounded-xl self-center"
            loader={web3ImgLoader}
          />

          {/* ---- Edit button */}
          {isOrganizer && (
            <Card className="flex flex-row items-center">
              <SmallText className="w-3/5">
                {t("is-organisator-role")}
              </SmallText>
              <div className="w-2/5 flex justify-end">
                <Link href={`/edit/${eventId}`}>
                  <ButtonWithLabel
                    label={t("edit-button")}
                    onClick={() => setLoading(true)}
                    loading={loading}
                  />
                </Link>
              </div>
            </Card>
          )}

          {/* ---- Button See on Gnoweb */}
          <EventSection title={t("going", { count: event.participants })}>
            <GnowebButton
              href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/events/e${eventId}`}
            />
          </EventSection>
          {/* TODO: Uncomment that when we can see the name of the addr */}
          {/* <EventSection title={t("hosted-by")}> */}
          {/*   <SmallText>User</SmallText> */}
          {/* </EventSection> */}
        </div>

        <div className="flex flex-col gap-4 w-full sm:w-3/5">
          {/* ---- Event title, dates */}
          <VeryLargeText className="mb-7">{event.title}</VeryLargeText>
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <LargeText>
                {format(fromUnixTime(Number(event.startDate)), "PPP")}
              </LargeText>
              <div className="flex flex-row text-sm gap-1">
                <SmallText variant="secondary">
                  {format(fromUnixTime(Number(event.startDate)), "p")}
                </SmallText>
                <SmallText variant="secondary">-</SmallText>
                <SmallText variant="secondary">
                  {format(fromUnixTime(Number(event.endDate)), "PPp")}
                </SmallText>
              </div>
            </div>
          </div>

          {/* ---- Event location */}
          <div className="flex flex-row gap-4 items-center">
            <MapPin width={iconSize} height={iconSize} />
            {/* TODO: Add location */}
            <LargeText>{location}</LargeText>
          </div>

          {/* ---- Event user's participation */}
          <Card className="mt-2">
            {isParticipate ? (
              <div>
                <div className="flex flex-row justify-between">
                  <LargeText>{t("in")}</LargeText>
                  {/* TODO: create a clean decount timer */}
                  {/* <SmallText>{t("start", { count: 2 })}</SmallText> */}
                </div>
                {/* add back when we can cancel
                <Text className="my-4">{t("cancel-desc")}</Text>
              */}
              </div>
            ) : isStarted ? (
              <div>
                <LargeText>{t("already-begun")}</LargeText>
                <Text className="my-4">{t("too-late")}</Text>
              </div>
            ) : (
              <div>
                <LargeText>{t("registration")}</LargeText>
                <Text className="my-4">{t("join-desc")}</Text>
                <ParticipateForm
                  onSuccess={handleParticipateSuccess}
                  eventId={eventId}
                />
              </div>
            )}
          </Card>

          {/* ---- Event description */}
          <EventSection title={t("about-event")} className="min-h-0">
            <div className="overflow-y-auto">
              <MarkdownPreview
                markdownString={
                  "Il était une fois, dans une contrée lointaine, un petit village paisible où les habitants vivaient en harmonie avec la nature. Les champs verdoyants s'étendaient à perte de vue, et les rivières serpentaient entre les collines douces. Le ciel bleu était souvent décoré de nuages blancs flottant lentement, comme si le temps lui-même s'était arrêté pour admirer la beauté de ce lieu idyllique. Chaque matin, le chant des oiseaux résonnait dans les arbres, apportant avec lui une sensation de sérénité. Les enfants jouaient dans les ruelles pavées, leurs rires résonnant comme une mélodie joyeuse. Le marché du village était animé, avec des étals regorgeant de fruits frais, de légumes colorés et de produits faits maison. Les habitants échangeaient des histoires, des nouvelles et des sourires, tout en travaillant ensemble pour maintenir la prospérité de leur communauté.\n" +
                  "\n" +
                  "Cependant, ce village n'était pas seulement un lieu de tranquillité et de beauté. Il abritait aussi des mystères, des secrets enfouis depuis des siècles. Dans les forêts environnantes, les anciens racontaient des légendes de créatures magiques, de trésors cachés et de voyages aventureux. Les jeunes du village étaient fascinés par ces récits, bien qu'ils ne puissent s'empêcher de se demander si ces histoires étaient vraiment vraies. Mais la vie continuait, et les générations se succédaient dans la même routine quotidienne.\n" +
                  "\n" +
                  "Un jour, un étranger arriva au village. Il portait une cape sombre et un sac en cuir usé, et ses yeux brillaient d'une lueur étrange. Il n'avait pas l'air menaçant, mais quelque chose en lui inspirait à la fois curiosité et prudence. Les habitants du village l'accueillirent chaleureusement, comme ils le faisaient pour tout visiteur, mais ils ne purent ignorer l'aura mystérieuse qui entourait cet homme. Il s'installa dans une petite maison à l'écart, loin du centre du village. Le temps passa, mais l'étranger resta discret, n'intervenant que rarement dans la vie quotidienne des villageois.\n" +
                  "\n" +
                  "Au fil des semaines, des événements étranges commencèrent à se produire. Des objets disparaissaient sans explication, des bruits étranges étaient entendus la nuit, et plusieurs villageois rapportèrent avoir vu une silhouette sombre se déplacer dans les bois, juste après le coucher du soleil. La rumeur se répandit rapidement : l'étranger était responsable de ces phénomènes inexpliqués. Mais personne n'osa l'affronter directement. Ils se contentaient de chuchoter entre eux, évitant de croiser son regard.\n" +
                  "\n" +
                  "Un soir, alors que la lune était pleine et que le vent soufflait fort, un groupe d'aventuriers décida de percer le mystère de l'étranger. Ils se glissèrent silencieusement dans la forêt, armés de torches et de couteaux. Ils suivaient la silhouette sombre qu'ils avaient aperçue plusieurs fois. Leurs pas étaient discrets, mais leurs cœurs battaient la chamade. Après plusieurs heures de marche, ils arrivèrent à une clairière où se trouvait un ancien temple en ruine. C'était un endroit qu'ils connaissaient bien, mais ils n'avaient jamais vu de trace d'activité là-bas auparavant.\n" +
                  "\n" +
                  "À l'intérieur du temple, l'étranger se tenait seul, observant les ruines avec une intensité étrange. Lorsqu'il tourna son regard vers les aventuriers, ils furent frappés par la puissance de ses yeux. Il n'était pas un simple homme ; quelque chose en lui était bien plus ancien, plus mystérieux. Il les invita à s'approcher, et sans un mot, il leur révéla un secret ancien : le village avait été fondé sur un ancien site sacré, un lieu où le temps et l'espace se tordaient et où des forces magiques puissantes étaient scellées depuis des siècles.\n" +
                  "\n" +
                  "L'étranger expliqua que ses ancêtres étaient les gardiens de ce secret, veillant à ce que personne ne découvre la vérité. Cependant, les forces magiques scellées dans le temple commençaient à se réveiller, et seul un être spécial pouvait empêcher leur libération. C'était à lui, l'étranger, qu'il revenait de remplir cette mission. Il avait passé sa vie à chercher le bon moment pour agir, et ce moment était enfin arrivé. Les aventuriers, bien que sceptiques, ne pouvaient ignorer l'angoisse qui montait en eux. Ils savaient que quelque chose de bien plus grand se préparait, et ils étaient maintenant impliqués dans cette aventure.\n" +
                  "\n" +
                  "Les jours suivants furent remplis de préparatifs. L'étranger leur donna des instructions précises sur la manière de contenir les forces magiques du temple. Ils devaient travailler ensemble pour déjouer les pièges anciens, trouver les artefacts cachés et utiliser leurs compétences pour fermer les portails vers d'autres dimensions. Les aventuriers, désormais unis par un but commun, se lancèrent dans cette quête périlleuse.\n" +
                  "\n" +
                  "Mais plus ils avançaient, plus ils comprenaient que cette mission serait loin d'être facile. Chaque épreuve semblait plus difficile que la précédente, et les mystères du temple se dévoilaient lentement, mais sûrement. Les pièges étaient redoutables, et les créatures magiques qui les gardaient étaient aussi dangereuses que l'étranger les avait avertis. Le groupe perdit plusieurs membres dans les premières épreuves, mais ceux qui restaient étaient déterminés à poursuivre leur mission.\n" +
                  "\n" +
                  "Le mystère du village et de l'étranger commença à se dissiper, mais de nouvelles questions prenaient leur place. Qu'était-ce que cet étrange pouvoir magique ? Pourquoi avait-il été scellé si longtemps, et qui étaient les véritables ennemis du groupe ? L'aventure n'était qu'à ses débuts, mais les réponses étaient encore loin."
                }
              />
            </div>
          </EventSection>
        </div>
      </div>

      {/* ---- Tabs */}
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as EventTab)}>
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${eventTabs.length}, minmax(0, 1fr))`,
            }}
          >
            {Object.values(eventTabs).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(tab)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* ---- Social Feed */}
        <EventFeed />
      </div>
    </div>
  );
}
