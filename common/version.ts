import {BUILD_BUILD_DATE, BUILD_COMMIT, BUILD_VERSION} from "./version_build";

export const VERSION = BUILD_VERSION;
export const COMMIT = BUILD_COMMIT;
export const BUILD_DATE = BUILD_BUILD_DATE;
export const SOURCE = 'https://github.com/GergoEB/MindustryStatsNode';

export interface BuildInfo {
  commit: string;
  buildDate: string;
  version: string;
}

export const buildInfo: BuildInfo = {
  commit: COMMIT,
  buildDate: BUILD_DATE,
  version: VERSION,
};
