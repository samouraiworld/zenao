"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { format, fromUnixTime } from "date-fns";
import { Calendar, ChevronDownIcon, ChevronUpIcon, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Event, WithContext } from "schema-dts";
import { ParticipateForm } from "./ParticipateForm";
import { ParticipantsSection } from "./participants-section";
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
import { web3ImgLoader } from "@/lib/web3-img-loader";
import { EventFormSchemaType } from "@/components/form/types";
import MapCaller from "@/components/common/map/MapLazyComponents";
import { userAddressOptions } from "@/lib/queries/user";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { EventFeed } from "@/app/event/[id]/event-feed";
import { cn } from "@/lib/tailwind";
import { screenContainerMaxWidth } from "@/components/layout/ScreenContainer";
import { useIsLinesTruncated } from "@/app/hooks/use-is-lines-truncated";
import { UserAvatarWithName } from "@/components/common/user";
import { web2URL } from "@/lib/uris";
import { feedPosts } from "@/lib/queries/social-feed";

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

export function EventInfo({ id }: { id: string }) {
  const { getToken, userId } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(id, address));

  // TODO: Fix this call

  const { data: posts } = useSuspenseQuery(
    feedPosts(id, 0, 100, "", address || ""),
  );

  const isOrganizer = roles.includes("organizer");
  const isParticipate = roles.includes("participant");
  const isStarted = Date.now() > Number(data.startDate) * 1000;
  const queryClient = useQueryClient();

  // Correctly reconstruct location object
  let location: EventFormSchemaType["location"] = {
    kind: "custom",
    address: "",
    timeZone: "",
  };
  switch (data.location?.address.case) {
    case "custom":
      location = {
        kind: "custom",
        address: data.location?.address.value.address,
        timeZone: data.location?.address.value.timezone,
      };
      break;
    case "geo":
      location = {
        kind: "geo",
        address: data.location?.address.value.address,
        lat: data.location?.address.value.lat,
        lng: data.location?.address.value.lng,
        size: data.location?.address.value.size,
      };
      break;
    case "virtual":
      location = {
        kind: "virtual",
        location: data.location?.address.value.uri,
      };
  }

  const t = useTranslations("event");
  const [loading, setLoading] = useState<boolean>(false);
  const [isDescExpanded, setDescExpanded] = useState(false);
  const [tab, setTab] = useState<EventTab>("global-feed");

  const handleParticipateSuccess = useCallback(async () => {
    const opts = eventUserRoles(id, address);
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
  }, [queryClient, id, address]);

  const jsonLd: WithContext<Event> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.title,
    description: data.description,
    startDate: new Date(Number(data.startDate) * 1000).toISOString(),
    endDate: new Date(Number(data.endDate) * 1000).toISOString(),
    location:
      location.kind === "virtual" ? location.location : location.address,
    maximumAttendeeCapacity: data.capacity,
    image: web2URL(data.imageUri),
  };

  const descLineClamp = 8;
  const descLineClampClassName = "line-clamp-[8]"; // Dynamic "8" value doesn't work here and inline style with WebkitLineClamp neither
  const descContainerRef = useRef<HTMLDivElement>(null);
  const isDescTruncated = useIsLinesTruncated(descContainerRef, descLineClamp);

  const fakeImageUri =
    "https://maroon-horizontal-bobolink-562.mypinata.cloud/ipfs/bafybeibl3cw6zmdcb3mgkjbyrxzpziyynkt4u2z3mijkxutxtvhvbgirr4";
  const fakeMarkdownString =
    "L’ère numérique a transformé notre quotidien à une vitesse fulgurante. " +
    "Internet, qui était initialement un simple outil de communication, est devenu un espace" +
    " incontournable où se mêlent informations, divertissements et interactions sociales. Les " +
    "réseaux sociaux ont bouleversé notre manière de nous exprimer et de partager nos expériences, co" +
    "nnectant les individus à travers le monde en un instant. Cependant, cette interconnexion massi" +
    "ve soulève aussi des questions essentielles sur la protection des données personnelles, la cybersécu" +
    "rité et l’impact des nouvelles technologies sur nos vies.\n\nL’intelligence artificielle jo" +
    "ue aujourd’hui un rôle central dans cette transformation numérique. Elle est présente dans pr" +
    "esque tous les domaines : médecine, finance, industrie, éducation, et même l’art. Grâce aux " +
    "algorithmes de machine learning, les diagnostics médicaux deviennent plus précis, les prévi" +
    "sions économiques plus fiables et les services personnalisés plus efficaces. Pourtant, cet" +
    "te omniprésence de l’IA soulève des interrogations. Comment s’assurer que ces systèmes rest" +
    "ent éthiques ? Quels mécanismes de régulation mettre en place pour éviter les biais et garan" +
    "tir une utilisation responsable ?\n\nParallèlement, la blockchain et les cryptomonnaies redéfinis" +
    "sent les transactions numériques. Elles apportent une transparence et une sécurité accrues, n" +
    "otamment grâce aux contrats intelligents qui automatisent des processus sans intermédiaire. Cet" +
    "te technologie a un potentiel immense, mais elle reste encore méconnue du grand public et su" +
    "scite parfois de la méfiance. Sa démocratisation passera par une meilleure éducation sur son fo" +
    "nctionnement et ses avantages réels.\n\nUn autre défi majeur du numérique est la gestion des" +
    " données personnelles. À une époque où chaque action en ligne laisse une empreinte, la question d" +
    "e la confidentialité devient primordiale. De nombreuses entreprises collectent et analysen" +
    "t nos comportements pour proposer des services plus adaptés, mais cela pose un problème de contrô" +
    "le et de consentement. Des régulations comme le RGPD tentent d’encadrer ces pratiques, mai" +
    "s la sensibilisation du public reste essentielle. Les utilisateurs doivent être conscients des in" +
    "formations qu’ils partagent et des outils à leur disposition pour protéger leur vie privée.\n\nEn" +
    " parallèle, les nouvelles formes de travail émergent grâce à la technologie. Le télétravail, au" +
    "trefois marginal, s’est généralisé, offrant flexibilité et autonomie à de nombreux professionn" +
    "els. Cependant, il apporte aussi son lot de défis, notamment en matière de gestion du temps, de " +
    "séparation entre vie professionnelle et personnelle, et d’accès aux opportunités pour tous.\n\n" +
    "Enfin, la question environnementale ne peut être ignorée. Si le numérique apporte des solutions i" +
    "nnovantes pour réduire notre empreinte carbone (optimisation des transports, smart grids, réducti" +
    "on des déchets grâce à l’IA), il est aussi responsable d’une consommation énergétique croissant" +
    "e. Les centres de données, les blockchains et la fabrication des appareils électroniques néce" +
    "ssitent d’importantes ressources. Il est donc crucial de développer des technologies plus dura" +
    "bles et de promouvoir une utilisation responsable du numérique.\n\nFace à ces défis, il est es" +
    "sentiel que chacun s’implique dans cette transition numérique. Entre innovations et régulati" +
    "ons, opportunités et risques, l’avenir du digital dépend des choix que nous faisons aujourd’hui.";
  const iconSize = 22;

  if (!data) {
    return <p>{`Event doesn't exist`}</p>;
  }
  return (
    <div className="flex flex-col w-full sm:h-full gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ---- Event hero image */}
      {!!fakeImageUri && (
        <Image
          src={fakeImageUri}
          width={screenContainerMaxWidth}
          height={200}
          alt="Event hero"
          priority
          className="object-cover w-full h-[200px] rounded-xl self-center self-center"
          style={{ maxWidth: screenContainerMaxWidth }}
          loader={web3ImgLoader}
        />
      )}
      <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
        <div className="flex flex-col gap-4 w-full sm:w-2/5">
          {/* ---- Event image */}
          <Image
            src={data.imageUri}
            width={330}
            height={330}
            alt="Event image"
            priority
            className="flex w-full rounded-xl self-center"
            loader={web3ImgLoader}
          />

          {/* ---- Edit button */}
          {/* If the user is organizer, link to /edit page */}
          {isOrganizer && (
            <Card className="flex flex-row items-center">
              <SmallText className="w-3/5">
                {t("is-organisator-role")}
              </SmallText>
              <div className="w-2/5 flex justify-end">
                <Link href={`/edit/${id}`}>
                  <ButtonWithLabel
                    label={t("edit-button")}
                    onClick={() => setLoading(true)}
                    loading={loading}
                  />
                </Link>
              </div>
            </Card>
          )}

          {/* ---- Participants preview and dialog section */}
          <EventSection title={t("going", { count: data.participants })}>
            <ParticipantsSection id={id} />
          </EventSection>

          {/* ---- Host section */}
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithName linkToProfile address={data.creator} />
          </EventSection>
        </div>

        <div className="flex flex-col gap-4 w-full sm:w-3/5">
          {/* ---- Event title, dates */}
          <VeryLargeText className="mb-7">{data.title}</VeryLargeText>
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <LargeText>
                {format(fromUnixTime(Number(data.startDate)), "PPP")}
              </LargeText>
              <div className="flex flex-row text-sm gap-1">
                <SmallText variant="secondary">
                  {format(fromUnixTime(Number(data.startDate)), "p")}
                </SmallText>
                <SmallText variant="secondary">-</SmallText>
                <SmallText variant="secondary">
                  {format(fromUnixTime(Number(data.endDate)), "PPp")}
                </SmallText>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            {/* ---- Event location */}
            <div className="flex flex-row gap-4 items-center mb-2">
              <div className="w-[22px] h-[22px]">
                <MapPin width={iconSize} height={iconSize} />
              </div>
              {location.kind === "virtual" ? (
                <Link href={location.location} target="_blank">
                  <LargeText className="hover:underline hover:underline-offset-1">
                    {location.location}
                  </LargeText>
                </Link>
              ) : (
                <LargeText>{location.address}</LargeText>
              )}
            </div>
            {location.kind === "geo" && (
              <MapCaller lat={location.lat} lng={location.lng} />
            )}
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
                  eventId={id}
                />
              </div>
            )}
          </Card>

          {/* ---- Event description */}
          <EventSection title={t("about-event")}>
            <div ref={descContainerRef}>
              <MarkdownPreview
                className={cn(
                  "overflow-hidden text-ellipsis",
                  !isDescExpanded && descLineClampClassName,
                )}
                markdownString={fakeMarkdownString}
              />
            </div>

            {/* ---- See More button */}
            {isDescTruncated && (
              <div
                className="w-full flex justify-center cursor-pointer "
                onClick={() =>
                  setDescExpanded((isDescExpanded) => !isDescExpanded)
                }
              >
                {isDescExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            )}
          </EventSection>
        </div>
      </div>
      {/* ---- Tabs */}
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as EventTab)}>
          <TabsList className={`grid w-full grid-cols-${eventTabs.length}`}>
            {Object.values(eventTabs).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(tab)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* ---- Social Feed */}
        <EventFeed isDescExpanded={isDescExpanded} />
      </div>
      ;
    </div>
  );
}
