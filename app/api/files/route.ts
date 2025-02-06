import { NextResponse, type NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { PinataSDK } from "pinata-web3";
import { FilesPostResponse } from "@/lib/files";

const pinata = new PinataSDK({
  pinataJwt: `${process.env.PINATA_JWT}`,
  pinataGateway: `${process.env.NEXT_PUBLIC_GATEWAY_URL}`,
});

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

    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    const uploadData = await pinata.upload.file(file, {
      groupId: process.env.PINATA_GROUP,
      cidVersion: 1,
    });
    const res: FilesPostResponse = {
      uri: `ipfs://${uploadData.IpfsHash}`,
    };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
