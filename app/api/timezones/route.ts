import { promises as fs } from "fs";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const file = await fs.readFile(
      process.cwd() + "/lib/timezones.json",
      "utf8",
    );

    // eslint-disable-next-line no-restricted-syntax
    const data = JSON.parse(file);
    return NextResponse.json(data.timezones, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
