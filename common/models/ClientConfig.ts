import { BuildInfo } from "../version";

export interface ClientConfig {
  refreshInterval: number;
  build: BuildInfo
}