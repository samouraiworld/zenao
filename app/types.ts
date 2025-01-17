// Generic type when you want to get the keys of an object where the values are of a given type.
export type KeysOfValue<T, TCondition> = {
  [K in keyof T]: T[K] extends TCondition ? K : never;
}[keyof T];
