declare module "tailwindcss-displaymodes" {
  const pwaPlugin: {
    handler: import("tailwindcss/types/config").PluginCreator;
    config?: Partial<import("tailwindcss").Config>;
  };

  export default pwaPlugin;
}
