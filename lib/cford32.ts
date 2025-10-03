const CROCKFORD32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const cford32Encode = (num: bigint, length?: number): string => {
  if (num === BigInt(0)) {
    return "0".padStart(length || 1, "0");
  }

  let str = "";
  while (num > 0) {
    const digit = Number(num % BigInt(32));
    str = CROCKFORD32_ALPHABET[digit] + str;
    num = num / BigInt(32);
  }

  if (length) {
    str = str.padStart(length, "0");
  }

  return str;
};
