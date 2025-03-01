import { Poll } from "@/app/gen/polls/v1/polls_pb";

export const fakePolls: Poll[] = [
  {
    question: "What's your favorite type of pizza topping?",
    results: [
      { option: "Pepperoni", count: 120, hasUserVoted: true },
      { option: "Mushrooms", count: 80, hasUserVoted: false },
      { option: "Pineapple", count: 50, hasUserVoted: false },
      { option: "Extra Cheese", count: 90, hasUserVoted: false },
    ],
    multipleAnswers: true,
    duration: BigInt(2819200),
    createdAt: BigInt(1738369957),
    createdBy: "pizzaLover99",
  },
  {
    question: "Which season do you enjoy the most?",
    results: [
      { option: "Spring", count: 150, hasUserVoted: false },
      { option: "Summer", count: 200, hasUserVoted: true },
      { option: "Fall", count: 100, hasUserVoted: false },
      { option: "Winter", count: 75, hasUserVoted: false },
    ],
    multipleAnswers: false,
    duration: BigInt(12419200),
    createdAt: BigInt(1738369957),
    createdBy: "natureFanatic",
  },
  {
    question: "What's your go-to breakfast food?",
    results: [
      { option: "Pancakes", count: 180, hasUserVoted: true },
      { option: "Eggs and Bacon", count: 150, hasUserVoted: false },
      { option: "Cereal", count: 100, hasUserVoted: false },
      { option: "Avocado Toast", count: 70, hasUserVoted: false },
    ],
    multipleAnswers: false,
    duration: BigInt(91432000),
    createdAt: BigInt(1738369957),
    createdBy: "breakfastKing",
  },
  {
    question: "Which fictional character would you want as your best friend?",
    results: [
      { option: "Sherlock Holmes", count: 90, hasUserVoted: false },
      { option: "Hermione Granger", count: 120, hasUserVoted: true },
      { option: "Tony Stark", count: 110, hasUserVoted: false },
      { option: "SpongeBob SquarePants", count: 60, hasUserVoted: false },
    ],
    multipleAnswers: false,
    duration: BigInt(100500),
    createdAt: BigInt(1738369957),
    createdBy: "storyLover22",
  },
  {
    question: "What's your favorite way to spend a weekend?",
    results: [
      { option: "Netflix and Chill", count: 200, hasUserVoted: true },
      { option: "Hiking", count: 100, hasUserVoted: false },
      { option: "Shopping", count: 80, hasUserVoted: false },
      { option: "Cooking", count: 70, hasUserVoted: false },
    ],
    multipleAnswers: true,
    duration: BigInt(259200),
    createdAt: BigInt(1738369957),
    createdBy: "weekendWarrior",
  },
];
