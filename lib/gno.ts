export function extractGnoJSONResponse(res: string): unknown {
  const jsonString = res.substring("(".length, res.length - " string)".length);
  // eslint-disable-next-line no-restricted-syntax
  const jsonStringContent = JSON.parse(jsonString);
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(jsonStringContent) as unknown;
}
