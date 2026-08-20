export const VERSION = 'v5.314';
export const COMMIT = '18186a4';
export const BUILD_DATE = 'Tue 21 Jul 15:53:56 BST 2026';
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
