"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { userInfoOptions } from "@/lib/queries/user";
import { feedPost } from "@/lib/queries/social-feed";
import { eventOptions } from "@/lib/queries/event";
import { OrgType } from "@/lib/organization";
import useFeedPostEditHandler from "@/hooks/use-feed-post-edit-handler";
import useFeedPostReactionHandler from "@/hooks/use-feed-post-reaction-handler";
import useFeedPostDeleteHandler from "@/hooks/use-feed-post-delete-handler";
import {
  socialFeedPostFormSchema,
  SocialFeedPostFormSchemaType,
} from "@/types/schemas";
import { isPollPost, isStandardPost } from "@/lib/social-feed";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";
import CommentsList from "@/components/social-feed/lists/comments-list";
import Heading from "@/components/widgets/texts/heading";
import CommunityPostInfo from "@/components/features/community/community-post-info";
import EventPostInfo from "@/components/features/event/event-post-info";
import PostCommentForm from "@/components/social-feed/forms/post-comment-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Separator } from "@/components/shadcn/separator";
import { EventInfoLayout } from "@/app/(general)/event/[id]/(general)/event-info-layout";
import CommunityInfoLayout from "@/app/(general)/community/(general)/[id]/community-info-layout";

interface PostInfoProps {
  orgType: OrgType;
  orgId: string;
  feedId: string;
  postId: string;
}

export default function PostInfo({
  orgType,
  orgId,
  postId,
  feedId,
}: PostInfoProps) {
  if (orgType === "event") {
    return <EventPostPage eventId={orgId} postId={postId} feedId={feedId} />;
  }
  return (
    <CommunityPostPage communityId={orgId} postId={postId} feedId={feedId} />
  );
}

function EventPostTabsNav({ eventId }: { eventId: string }) {
  const t = useTranslations("event");
  return (
    <Tabs value="feed" className="w-full min-h-0">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/event/${eventId}`} scroll={false}>
          <TabsTrigger
            value="description"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("about-event")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/feed`} scroll={false}>
          <TabsTrigger
            value="feed"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("discussion")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/votes`} scroll={false}>
          <TabsTrigger
            value="votes"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("votes")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />
    </Tabs>
  );
}

function CommunityPostTabsNav({ communityId }: { communityId: string }) {
  const t = useTranslations("community");
  return (
    <Tabs value="chat" className="w-full min-h-0">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/community/${communityId}`}>
          <TabsTrigger
            value="chat"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("chat")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/votes`}>
          <TabsTrigger
            value="votes"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("votes")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/events`}>
          <TabsTrigger
            value="events"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("events")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/members`}>
          <TabsTrigger
            value="members"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("members")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/portfolio`}>
          <TabsTrigger
            value="portfolio"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("portfolio")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />
    </Tabs>
  );
}

function EventPostPage({
  eventId,
  postId,
  feedId,
}: {
  eventId: string;
  postId: string;
  feedId: string;
}) {
  const { userId, getToken } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";

  const { data: post } = useSuspenseQuery(feedPost(postId, userProfileId));
  const { data: eventData } = useSuspenseQuery(eventOptions(eventId));

  const [editMode, setEditMode] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tabsRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(
    "event",
    eventId,
    feedId,
  );
  const { onReactionChange, isReacting } = useFeedPostReactionHandler(
    "event",
    eventId,
    feedId,
  );
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(
    "event",
    eventId,
    feedId,
  );

  const form = useForm<SocialFeedPostFormSchemaType>({
    mode: "all",
    resolver: zodResolver(socialFeedPostFormSchema),
    defaultValues: {
      kind: "STANDARD_POST",
      content: "",
      parentPostId: post.post?.localPostId,
    },
  });

  const onEdit = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => {
    await onEditStandardPost(postId, values);
    setEditMode(false);
  };

  if (!isStandardPost(post) && !isPollPost(post)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <EventInfoLayout eventId={eventId} data={eventData} />
      <div ref={tabsRef}>
        <EventPostTabsNav eventId={eventId} />
      </div>
      <div className="flex flex-col gap-12">
        <EventPostInfo
          post={post}
          postId={postId}
          eventId={eventId}
          userId={userProfileId}
          editMode={editMode}
          onEditModeChange={setEditMode}
          onEdit={onEdit}
          isEditing={isEditing}
          onReactionChange={onReactionChange}
          isReacting={isReacting}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
        <div className="flex flex-col gap-4">
          <Heading level={2}>Comments ({post.childrenCount})</Heading>
          <PostCommentForm
            orgType="event"
            orgId={eventId}
            parentId={post.post.localPostId}
            form={form}
          />
          <div className="pl-6">
            <Suspense fallback={<PostCardSkeleton />}>
              <CommentsList
                orgType="event"
                orgId={eventId}
                parentId={post.post.localPostId.toString()}
                feedId={feedId}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityPostPage({
  communityId,
  postId,
  feedId,
}: {
  communityId: string;
  postId: string;
  feedId: string;
}) {
  const { userId, getToken } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";

  const { data: post } = useSuspenseQuery(feedPost(postId, userProfileId));

  const [editMode, setEditMode] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tabsRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const { onEditStandardPost, isEditing } = useFeedPostEditHandler(
    "community",
    communityId,
    feedId,
  );
  const { onReactionChange, isReacting } = useFeedPostReactionHandler(
    "community",
    communityId,
    feedId,
  );
  const { onDelete, isDeleting } = useFeedPostDeleteHandler(
    "community",
    communityId,
    feedId,
  );

  const form = useForm<SocialFeedPostFormSchemaType>({
    mode: "all",
    resolver: zodResolver(socialFeedPostFormSchema),
    defaultValues: {
      kind: "STANDARD_POST",
      content: "",
      parentPostId: post.post?.localPostId,
    },
  });

  const onEdit = async (
    postId: string,
    values: SocialFeedPostFormSchemaType,
  ) => {
    await onEditStandardPost(postId, values);
    setEditMode(false);
  };

  if (!isStandardPost(post) && !isPollPost(post)) {
    return null;
  }

  return (
    <CommunityInfoLayout communityId={communityId}>
      <div className="flex flex-col gap-8">
        <div ref={tabsRef}>
          <CommunityPostTabsNav communityId={communityId} />
        </div>
        <div className="flex flex-col gap-12">
          <CommunityPostInfo
            post={post}
            postId={postId}
            communityId={communityId}
            userId={userProfileId}
            editMode={editMode}
            onEditModeChange={setEditMode}
            onEdit={onEdit}
            isEditing={isEditing}
            onReactionChange={onReactionChange}
            isReacting={isReacting}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
          <div className="flex flex-col gap-4">
            <Heading level={2}>Comments ({post.childrenCount})</Heading>
            <PostCommentForm
              orgType="community"
              orgId={communityId}
              parentId={post.post.localPostId}
              form={form}
            />
            <div className="pl-6">
              <Suspense fallback={<PostCardSkeleton />}>
                <CommentsList
                  orgType="community"
                  orgId={communityId}
                  parentId={post.post.localPostId.toString()}
                  feedId={feedId}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </CommunityInfoLayout>
  );
}
