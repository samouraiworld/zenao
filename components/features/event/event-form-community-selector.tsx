"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UseFormReturn } from "react-hook-form";
import {
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shadcn/command";

import { useActiveAccount } from "@/components/providers/active-account-provider";
import { Button } from "@/components/shadcn/button";
import { FormField } from "@/components/shadcn/form";
import Heading from "@/components/widgets/texts/heading";
import {
  communitiesByUserRolesList,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import { userInfoOptions } from "@/lib/queries/user";
import { cn } from "@/lib/tailwind";
import { EventFormSchemaType } from "@/types/schemas";

export default function EventFormCommunitySelector({
  form,
}: {
  form: UseFormReturn<EventFormSchemaType>;
}) {
  const t = useTranslations("eventForm");
  // Community selection
  const { userId, getToken } = useAuth();
  const { activeAccount } = useActiveAccount();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  const entityId = activeAccount?.id ?? userInfo?.userId ?? "";
  const teamId = activeAccount?.type === "team" ? activeAccount.id : undefined;

  const { data: userCommunitiesPages } = useSuspenseInfiniteQuery(
    communitiesByUserRolesList(
      entityId,
      ["administrator"],
      DEFAULT_COMMUNITIES_LIMIT,
      getToken,
      teamId,
    ),
  );

  const selectableCommunities = useMemo(
    () =>
      userCommunitiesPages?.pages
        .flat()
        .map((cu) => cu.community)
        .filter((c) => c !== undefined) ?? [],
    [userCommunitiesPages?.pages],
  );

  const options = selectableCommunities.map((community) => ({
    label: community.displayName,
    value: community.id,
  }));

  const [search, setSearch] = useState<string>(() => {
    const selectedCommunity = options.find(
      (o) => o.value === form.getValues().communityId,
    );
    return selectedCommunity?.label ?? "";
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [selected, setSelected] = useState<{
    value: string;
    label: string;
  } | null>(() => {
    const selectedCommunity = options.find(
      (o) => o.value === form.getValues().communityId,
    );
    if (selectedCommunity) {
      return { value: selectedCommunity.value, label: selectedCommunity.label };
    }
    return null;
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      if (!isOpen) {
        setOpen(true);
      }

      if (event.key === "Escape") {
        input.blur();
      }
    },
    [isOpen],
  );

  const handleBlur = useCallback(() => {
    setOpen(false);
    setSearch(selected?.label ?? "");
  }, [selected]);

  const handleSelectOption = useCallback(
    (option: { value: string; label: string }) => {
      setSelected(option);
      setSearch(option.label);
      form.setValue("communityId", option.value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setOpen(false);
      form.trigger("communityId");
      inputRef.current?.blur();
    },
    [form, inputRef],
  );

  useEffect(() => {
    const selectedCommunity = options.find(
      (o) => o.value === form.getValues().communityId,
    );

    setSearch(selectedCommunity?.label ?? "");
  }, [options, form, selectableCommunities]);

  if (selectableCommunities.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading size="sm" level={3}>
        {t("community-selector-label")}
      </Heading>

      <FormField
        control={form.control}
        name="communityId"
        render={({ field }) => {
          return (
            <CommandPrimitive onKeyDown={handleKeyDown} shouldFilter={false}>
              <div className="relative">
                <CommandInput
                  ref={inputRef}
                  value={search}
                  typeof="search"
                  onValueChange={setSearch}
                  onBlur={handleBlur}
                  onFocus={() => setOpen(true)}
                  placeholder={t("community-selector-placeholder")}
                  className="!h-12 px-4 text-base rounded bg-custom-input-bg border border-custom-input-border"
                  containerClassName="border-none p-0"
                />
                {!!field.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="backdrop-blur-sm self-center absolute top-1/2 -translate-y-1/2 right-1"
                    onClick={() => {
                      setSearch("");
                      setSelected(null);
                      field.onChange(null);
                      form.trigger("communityId");
                    }}
                  >
                    <XIcon className="h-3 w-3" />
                    <span className="sr-only">
                      {t("community-selector-clear")}
                    </span>
                  </Button>
                )}
              </div>
              <div className={cn("relative", isOpen && "mt-1")}>
                <div
                  className={cn(
                    "animate-in fade-in-0 zoom-in-95 absolute top-0 z-50 w-full rounded-md bg-popover border text-popover-foreground outline-none",
                    isOpen ? "block" : "hidden",
                  )}
                >
                  <CommandList className="rounded-lg">
                    <CommandGroup>
                      {options.map((option) => {
                        return (
                          <CommandItem
                            key={option.value}
                            value={option.label}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onSelect={() => handleSelectOption(option)}
                            className={cn("flex w-full items-center gap-2")}
                          >
                            {option.label}
                          </CommandItem>
                        );
                      })}
                      <CommandPrimitive.Empty className="select-none rounded-sm px-2 py-3 text-center text-sm">
                        {t("no-communities-found")}
                      </CommandPrimitive.Empty>
                    </CommandGroup>
                  </CommandList>
                </div>
              </div>
            </CommandPrimitive>
          );
        }}
      />
    </div>
  );
}
