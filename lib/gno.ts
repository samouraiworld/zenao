import { bech32 } from "bech32";
import shajs from "sha.js";

export function extractGnoJSONResponse(res: string): unknown {
  const str = extractGnoStringResponse(res);
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(str) as unknown;
}

export function extractGnoStringResponse(res: string): string {
  const jsonString = res.substring("(".length, res.length - " string)".length);
  // eslint-disable-next-line no-restricted-syntax
  const jsonStringContent = JSON.parse(jsonString);
  if (typeof jsonStringContent != "string") {
    throw new Error(
      `unexpected response type ${typeof jsonStringContent} in ${jsonString}`,
    );
  }
  return jsonStringContent;
}

export function derivePkgAddr(pkgPath: string): string {
  const h = shajs("sha256")
    .update("pkgPath:" + pkgPath)
    .digest()
    .subarray(0, 20);
  return bech32.encode("g", bech32.toWords(h));
}

export function addressFromRealmId<T extends string | null | undefined>(
  realmId: T,
) {
  if (typeof realmId !== "string") {
    return realmId;
  }
  if (realmId.includes(".")) {
    return derivePkgAddr(realmId);
  }
  return realmId;
}
