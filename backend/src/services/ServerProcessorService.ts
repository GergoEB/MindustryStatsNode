import {createLogger} from '../logger.js';
import {InMemoryQueue} from '../utils/in-memory-queue.js';
import {CACHE_KEYS} from '../shared/constants.js';
import * as serverRepository from '../repositories/serverRepository.js';
import { type ServerProcessorConfig} from '../shared/config.js';
import { type RawServerData} from './ServerCollectorService.js';
import {CURRENT_DATA_FRESH_THRESHOLD} from "../const.js";
import { serversList } from '../state/serversList.js';
import { isTransientError } from '../utils/errors.js';

const logger = createLogger('ServerProcessor');

export class ServerProcessorService {
  private rawDataQueue: InMemoryQueue<RawServerData>;
  private config: ServerProcessorConfig;
  private processLoop?: NodeJS.Timeout;
  private running = false;

  constructor(
    rawDataQueue: InMemoryQueue<RawServerData>,
    config: ServerProcessorConfig
  ) {
    this.rawDataQueue = rawDataQueue;
    this.config = config;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing data storage...');
    const servers = await serverRepository.getAllServerElements(this.config.MAX_HISTORY_HOURS);
    serversList.clear();

    for (const server of servers) {
      server.online = false;
      if (server.currentData) server.currentData.online = false;
      serversList.set(CACHE_KEYS.SERVER_DATA(server.id), server);
    }

    logger.info(`Initialized data storage with ${serversList.size} servers`);
  }

  async start(): Promise<void> {
    logger.info('Starting Server Processor Service...');
    this.running = true;

    // Schedule periodic batch database uploads
    // todo, setInterval doesn't wait for previous run to finish...
    this.processLoop = setInterval(async () => {
      try {
        const processQueue = await this.rawDataQueue.popAll();
        if (processQueue.length > 0) {
          await this.processBatch(processQueue);
        }
      } catch (error) {
        // processBatch handles its own write failures, so anything reaching
        // here is a bug in the drain/prepare step rather than a database fault.
        logger.error('Unhandled error in processor loop:', error);
      }
    }, this.config.QUEUE_POLL_TIMEOUT_MS);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.processLoop) {
      clearInterval(this.processLoop);
    }
    logger.info('Server Processor Service stopped');
  }

  private async processBatch(batch: RawServerData[]): Promise<void> {
    const statsToInsert: any[] = [];
    const onlineServerIds: number[] = [];

    // One MOTD/map entry per server: the history tables keep a single open row
    // per server, so feeding them two entries for one server would leave two
    // rows marked current.  Stats are a time series and keep every sample.
    const motdByServer = new Map<number, any>();
    const mapByServer  = new Map<number, any>();

    // Only once not every iteration
    const freshThresholdOldest = new Date(Date.now() - CURRENT_DATA_FRESH_THRESHOLD).getTime();

    // Ascending timestamp so "last write wins" on the in-memory entry and on
    // the per-server maps means the newest sample wins, whatever order the
    // collector's concurrent workers happened to finish in.
    const ordered = [...batch].sort((a, b) => a.timestamp - b.timestamp);

    let unknownServers = 0;

    // Process memory states and prepare DB payloads
    for (const rawData of ordered) {
      const { data, timestamp, online, cacheKey, serverId: rawId } = rawData;
      let serverEntry = serversList.get(cacheKey);

      if (serverEntry == null) {
        try {
          serverEntry = await serverRepository.getServer(rawId)
        } catch (error) {
          logger.error(
            `Failed to load server ${rawId} (${rawData.host}:${rawData.port}) while processing its sample:`,
            error
          );
          unknownServers++;
          continue;
        }

        // This should never happen, can only really be caused by a bug or memory corruption
        if (!serverEntry) {
          logger.error(`Error in processing server entry, failed to acquire server data: ${rawId} / ${rawData.host}:${rawData.port}`);
          unknownServers++;
          continue;
        }
      }

      if (data != null && online) {
        // Queue up MOTD update only if changed
        motdByServer.set(rawId, {
          server_id: rawId,
          server_name: data.serverName,
          description: data.description,
          mode_name: data.modeName
        });

        // Queue up Map update only if changed.
        // mode_name rides along with the map (not just the MOTD) because the
        // map registry's gamemode link is keyed on (game_mode, mode_name) --
        // without it every new registry row would collapse onto the nameless
        // vanilla gamemode.
        mapByServer.set(rawId, {
          server_id: rawId,
          map_name: data.mapName,
          game_mode: data.mode,
          mode_name: data.modeName
        });

        // Always queue stats and last seen
        statsToInsert.push({
          server_id: rawId,
          timestamp: new Date(timestamp),
          players: data.players,
          max_players: data.playerLimit,
          wave: data.wave,
          version: data.version,
          version_type: data.versionType,
          ping: data.ping,
          online: true
        });
        onlineServerIds.push(rawId);

        // Update in-memory state
        serverEntry.currentData = data;
        serverEntry.lastUpdated = timestamp;
        serverEntry.lastSeen = timestamp;
        serverEntry.online = true;
        serverEntry.consecutiveFailures = 0;
        
      } else {
        // Handle offline server state
        serverEntry.online = false;
        serverEntry.lastUpdated = timestamp;
        serverEntry.consecutiveFailures = (serverEntry.consecutiveFailures || 0) + 1;

        // Invalidate current data if not seen for a while
        if (serverEntry.lastSeen != null && serverEntry.lastSeen < freshThresholdOldest) {
          serverEntry.currentData = undefined;
        }

        statsToInsert.push({
          server_id: rawId,
          timestamp: new Date(timestamp),
          online: false
        });
      }

      serversList.set(cacheKey, serverEntry)
    }

    if (unknownServers > 0) {
      logger.warn(`Dropped ${unknownServers} of ${batch.length} sample(s): server row could not be resolved`);
    }

    const motdsToUpdate = Array.from(motdByServer.values());
    const mapsToUpdate  = Array.from(mapByServer.values());

    logger.debug(`Saving batch of ${batch.length} servers (Stats: ${statsToInsert.length}, MOTDs: ${motdsToUpdate.length}, Maps: ${mapsToUpdate.length})`);

    // The three writes are independent, and only the stats one carries the
    // player numbers.  Settling them separately means a MOTD or map failure no
    // longer takes the whole poll cycle's player history down with it.
    const [lastSeenResult, motdResult, mapResult] = await Promise.allSettled([
      serverRepository.bulkUpdateLastSeen(onlineServerIds),
      serverRepository.bulkSaveMotds(motdsToUpdate),
      serverRepository.bulkSaveMaps(mapsToUpdate)
    ]);

    this.reportFailure(lastSeenResult, 'last-seen update', { servers: onlineServerIds.length });
    this.reportFailure(motdResult,     'MOTD history write', { entries: motdsToUpdate.length });
    this.reportFailure(mapResult,      'map history write',  { entries: mapsToUpdate.length });

    // A failed registry write leaves its IDs null rather than blocking the
    // sample: the player count is the point, and the FK is nullable.
    const motdRegistryByServer = motdResult.status === 'fulfilled' ? motdResult.value : new Map<number, number>();
    const mapRegistryByServer  = mapResult.status  === 'fulfilled' ? mapResult.value  : new Map<number, number>();

    const statsWithRegistryIds = statsToInsert.map(stat => ({
      ...stat,
      motd_registry_id: motdRegistryByServer.get(stat.server_id) ?? null,
      map_registry_id: mapRegistryByServer.get(stat.server_id) ?? null,
    }));

    try {
      await serverRepository.bulkSaveServerStats(statsWithRegistryIds);
      logger.debug(`Processed batch of ${batch.length} servers (Stats: ${statsToInsert.length}, MOTDs: ${motdsToUpdate.length}, Maps: ${mapsToUpdate.length})`);
    } catch (error) {
      // This is the lossy one: the samples are only held in the batch, so a
      // failure here discards this cycle's player history outright.  Say how
      // much was lost, for which servers, and exactly why.
      const servers = new Set(statsWithRegistryIds.map(s => s.server_id));
      logger.error(
        `Player stats write failed - ${statsWithRegistryIds.length} sample(s) across ` +
        `${servers.size} server(s) were lost` +
        `${isTransientError(error) ? ' (transient; the next cycle should recover)' : ''}; ` +
        `affected server ids: ${summariseIds(Array.from(servers))} --`,
        error
      );
    }
  }

  /** Logs a rejected settled write with its cause; fulfilled results are ignored. */
  private reportFailure(
    result: PromiseSettledResult<unknown>,
    stage: string,
    context: Record<string, number>
  ): void {
    if (result.status !== 'rejected') return;

    const detail = Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ');
    logger.error(
      `${stage} failed (${detail})` +
      `${isTransientError(result.reason) ? ' (transient)' : ''} --`,
      result.reason
    );
  }
}

/** Caps an ID list so one broken batch cannot dump thousands of IDs into a log line. */
function summariseIds(ids: number[], limit: number = 20): string {
  if (ids.length <= limit) return ids.join(', ');
  return `${ids.slice(0, limit).join(', ')} (+${ids.length - limit} more)`;
}
