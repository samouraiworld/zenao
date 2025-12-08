import { NextResponse, type NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import z from "zod";
import { SupportedNetworks } from "@gnosis-guild/zodiac";
import { planApplyEventOrganizerRole } from "@/lib/zodiac";

export const getPlanRequestSchema = z.object({
  organizers: z.string().array(),
  rolesModAddr: z.string(),
});

export type GetPlanRequest = z.infer<typeof getPlanRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    // User not logged in
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    // User banned
    if (user.banned) {
      return NextResponse.json({ error: "Banned" }, { status: 403 });
    }

    const j = await request.json();
    const req = getPlanRequestSchema.parse(j);

    const calls = await planApplyEventOrganizerRole(
      req.organizers as `0x${string}`[],
      {
        chainId: SupportedNetworks.BaseSepolia,
        address: req.rolesModAddr as `0x${string}`,
      },
    );

    return NextResponse.json(calls, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
