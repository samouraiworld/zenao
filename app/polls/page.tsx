import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PollsListLayout } from "@/components/layout/PollsListLayout";
import { fakePolls } from "@/app/polls/fake-polls";
import { Poll } from "@/app/gen/polls/v1/polls_pb";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { SmallText } from "@/components/texts/SmallText";

// export interface UserPollVotes {
//     pollId: string;
//     votes: VoteInfo[];
// }
//
// export interface VoteInfo {
//     label: string;
//     nbVotes: number;
// }
//
// export enum PollType {
//     SINGLE_ANSWER,
//     MULTIPLE_ANSWERS,
// }
//
// export interface PollInfo {
//     title: string;
//     description?: string;
//     imageUri?: string;
//     votes: VoteInfo[];
//     nbMaxVotes?: number;
//     startTime?: number;
//     endTime?: number;
//     type: PollType;
//     // Metadata
//     id: string;
//     createdAt: number;
//     createdBy: string;
//     pkgPath: string;
// }

// TODO: poll creation
// TODO: do vote

// const now = 1740622721411;

// export const fakePollsUpcoming: PollInfo[] = [
//     {
//         title:
//             "This is a poll started at a specific time, with a maximum of votes, no end time",
//         votes: [
//             {
//                 label: "A",
//                 nbVotes: 0,
//             },
//             {
//                 label: "B",
//                 nbVotes: 0,
//             },
//         ],
//         nbMaxVotes: 50,
//         startTime: getTime(
//             add(now, {
//                 hours: 4,
//                 weeks: 3,
//             }),
//         ),
//         type: PollType.SINGLE_ANSWER,
//         id: "3",
//         createdAt: getTime(now),
//         createdBy: "g1p8mjr27qrftks5ad4ygts8vxhkvqakeex883wk",
//         pkgPath: "idk",
//     },
//     {
//         title: "This is a poll not started yet, with a end time",
//         votes: [
//             {
//                 label: "Yes",
//                 nbVotes: 0,
//             },
//             {
//                 label: "No",
//                 nbVotes: 0,
//             },
//             {
//                 label: "Nothing",
//                 nbVotes: 0,
//             },
//         ],
//         startTime: getTime(
//             add(now, {
//                 weeks: 4,
//             }),
//         ),
//         endTime: getTime(
//             add(now, {
//                 weeks: 5,
//             }),
//         ),
//         type: PollType.SINGLE_ANSWER,
//         id: "4",
//         createdAt: getTime(now),
//         createdBy: "g1p8mjr27qrftks5ad4ygts8vxhkvqakeex883wk",
//         pkgPath: "idk",
//     },
//     {
//         title:
//             "This is a poll not started yet, with a maximum of votes, and no end time",
//         votes: [
//             {
//                 label: "This is a choice",
//                 nbVotes: 0,
//             },
//             {
//                 label: "This is another choice",
//                 nbVotes: 0,
//             },
//         ],
//         nbMaxVotes: 999,
//         type: PollType.SINGLE_ANSWER,
//         id: "5",
//         startTime: getTime(
//             add(now, {
//                 days: 14,
//                 weeks: 3,
//             }),
//         ),
//         createdAt: getTime(now),
//         createdBy: "g1p8mjr27qrftks5ad4ygts8vxhkvqakeex883wk",
//         pkgPath: "idk",
//     },
// ];
//
// export const fakePollsStarted: PollInfo[] = [
//     {
//         title:
//             "This is a poll with no start time, with a maximum of votes, and end time",
//         votes: [
//             {
//                 label: "This is a choice",
//                 nbVotes: 23,
//             },
//             {
//                 label: "This is another choice",
//                 nbVotes: 0,
//             },
//         ],
//         nbMaxVotes: 50,
//         type: PollType.SINGLE_ANSWER,
//         id: "1",
//         endTime: getTime(
//             add(now, {
//                 years: 1,
//             }),
//         ),
//         createdAt: getTime(now),
//         createdBy: "g1p8mjr27qrftks5ad4ygts8vxhkvqakeex883wk",
//         pkgPath: "idk",
//     },
//     {
//         title: "This is a poll started at the creation, with a end time",
//         votes: [
//             {
//                 label: "1111",
//                 nbVotes: 8,
//             },
//             {
//                 label: "2222",
//                 nbVotes: 45,
//             },
//             {
//                 label: "3333",
//                 nbVotes: 13,
//             },
//         ],
//         endTime: getTime(
//             add(now, {
//                 years: 2,
//             }),
//         ),
//         type: PollType.MULTIPLE_ANSWERS,
//         id: "2",
//         createdAt: getTime(now),
//         createdBy: "g1p8mjr27qrftks5ad4ygts8vxhkvqakeex883wk",
//         pkgPath: "idk",
//     },
// ];
//
// export const fakePollsEnded: PollInfo[] = [
//     {
//         title:
//             "This is a poll ended",
//         votes: [
//             {
//                 label: "W",
//                 nbVotes: 30,
//             },
//             {
//                 label: "X",
//                 nbVotes: 30,
//             },
//             {
//                 label: "Y",
//                 nbVotes: 0,
//             },
//             {
//                 label: "Z",
//                 nbVotes: 6,
//             },
//         ],
//         type: PollType.SINGLE_ANSWER,
//         id: "0",
//         endTime: getTime(now),
//         createdAt: getTime(sub(now, {months: 1})),
//         createdBy: "g1p8mjr27qrftks5ad4ygts8vxhkvqakeex883wk",
//         pkgPath: "idk",
//     },
// ];

export const fakeUserPollVotes: UserPollVotes[] = [
  {
    pollId: "1",
    votes: [
      {
        label: "This is a choice",
        nbVotes: 1,
      },
    ],
  },
  {
    pollId: "2",
    votes: [
      {
        label: "2222",
        nbVotes: 1,
      },
      {
        label: "3333",
        nbVotes: 1,
      },
    ],
  },
];

const PollsPageFC: React.FC<{
  started: Poll[];
  ended: Poll[];
}> = ({ started, ended }) => {
  const t = useTranslations("discover");
  return (
    <PollsListLayout
      started={started}
      ended={ended}
      title={t("title")}
      description={t("description")}
    />
  );
};

export default async function PollsPage() {
  // TODO: query Polls

  return (
    <ScreenContainer>
      <div className="w-full flex justify-center mb-6">
        <Link href="/create-poll">
          <ButtonWithChildren className="rounded-3xl py-5">
            <SmallText variant="invert">Create your poll</SmallText>
          </ButtonWithChildren>
        </Link>
      </div>

      <PollsPageFC started={fakePolls} ended={[]} />
    </ScreenContainer>
  );
}
