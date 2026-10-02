export type ProviderId =
  | "interpark"
  | "yes24"
  | "ticketlink"
  | "melon"
  | "weverse";

export type ProviderConfig = {
  id: ProviderId;
  name: string;
  targetUrl: string;
  enabled: boolean;
};
