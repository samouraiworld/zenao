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
