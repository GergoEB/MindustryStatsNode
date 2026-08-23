// ─────────────────────────────────────────────────────────────────────────────
// serverRepository.ts
// Server and network read/write operations.
// Raw SQL is intentional — Sequelize is used only as a connection/transaction
// layer so TimescaleDB extensions remain accessible.
// ─────────────────────────────────────────────────────────────────────────────

import sequelize from '../config/database.js';
import {
    Server,
    ServerGroup,
    ServerMapHistory,
    ServerMotdHistory,
    ServerStats,
} from '../models/index.js';
import {
    GameMode,
    type ServerDetails,
    type ServerElement,
    type ServerMapData,
    type ServerMotdData,
} from '../../../common/models/serverData.js';
import { createLogger } from '../logger.js';
import { Op, QueryTypes, Transaction } from 'sequelize';
import {
    type NetworkDetails,
    type ServerInput,
    type ServerRecord,
} from '../../../common/models/RepositoryTypes.js';
import {CURRENT_DATA_FRESH_THRESHOLD, MAX_REALISTIC_PLAYERCOUNT} from "../const.js";

const logger = createLogger('ServerRepository');

// ─── Normalise nullable/empty values to empty string for registry key lookups ─

const normalize = (val: unknown): string =>
    val == null || val === '' ? '' : String(val);

// ─── Servers ─────────────────────────────────────────────────────────────────

export async function getServers(): Promise<ServerRecord[]> {
    const [servers, serverGroups] = await Promise.all([
        Server.findAll({ raw: true }),
        ServerGroup.findAll({ raw: true }),
    ]);

    const groupNameById = new Map<number, string>(
        serverGroups.map((g: any) => [g.id, g.name])
    );

    return servers.map((server: any) => {
        const record = server as ServerRecord;
        record.name = groupNameById.get(server.server_group_id) ?? 'Unknown';
        return record;
    });
}

/** Returns all servers with their latest stats, map, and MOTD in one query. */
export async function getAllServerElements(hoursBack: number = 36): Promise<ServerElement[]> {
    const rows: any[] = await sequelize.query(`
        WITH latest_motds AS (
            SELECT DISTINCT ON (h.server_id)
                h.server_id,
                r.server_name  AS "serverName",
                r.description,
                h.valid_from
            FROM server_motds_history h
            JOIN server_motds_registry r ON h.motd_id = r.id
            WHERE h.valid_to IS NULL
            ORDER BY h.server_id, h.valid_from DESC
        ),
        latest_maps AS (
            SELECT DISTINCT ON (h.server_id)
                h.server_id,
                r.map_name   AS "mapName",
                r.game_mode  AS mode,
                r.mode_name  AS "modeName",
                h.valid_from
            FROM server_maps_history h
            JOIN server_maps_registry r ON h.map_id = r.id
            WHERE h.valid_to IS NULL
            ORDER BY h.server_id, h.valid_from DESC
        ),
        latest_stats AS (
            -- One row per server, upserted by bulkSaveServerStats() each poll
            -- cycle, so this is a small table scan instead of a DISTINCT ON
            -- across every chunk of the hypertable.
            SELECT server_id, timestamp, players, max_players, wave,
                   version, version_type, ping, online
            FROM server_current
            WHERE timestamp > NOW() - interval '1 hour' * :hoursBack
              AND players >= 0 AND players < :maxRealisticPlayerCount
        )
        SELECT
            s.id, sg.name, s.server_group_id AS "groupId",
            s.host, s.port, s.country_code,
            s.updated_at AS "lastUpdated", s.last_seen,
            stats.online, stats.timestamp, stats.players,
            stats.max_players AS "playerLimit",
            stats.wave, stats.version, stats.version_type AS "versionType", stats.ping,
            motds."serverName", motds.description,
            maps."modeName", maps."mapName", maps.mode
        FROM servers s
        LEFT JOIN latest_stats stats ON s.id = stats.server_id
        LEFT JOIN latest_motds motds ON s.id = motds.server_id
        LEFT JOIN latest_maps  maps  ON s.id = maps.server_id
        LEFT JOIN server_groups sg   ON s.server_group_id = sg.id
        ORDER BY sg.name, s.host, s.port
    `, { replacements: { hoursBack, maxRealisticPlayerCount: MAX_REALISTIC_PLAYERCOUNT }, type: QueryTypes.SELECT });

    return rows.map((row): ServerElement => {
        const element: ServerElement = {
            id:          row.id,
            name:        row.name,
            groupId:     row.groupId,
            host:        row.host,
            port:        row.port,
            online:      row.online ?? false,
            lastSeen:    row.last_seen,
            lastUpdated: row.lastUpdated ? new Date(row.lastUpdated).getTime() : Date.now(),
            countryCode: row.country_code ?? null,
        };

        // currentData is current - only populate if "fresh" aka 5 minutes
        if (row.timestamp && row.timestamp > new Date(Date.now() - CURRENT_DATA_FRESH_THRESHOLD).getTime()) {
            element.currentData = {
                ping:        row.ping        ?? 0,
                host:        row.host,
                port:        row.port,
                serverName:  row.serverName  ?? 'Unknown',
                mapName:     row.mapName     ?? 'Unknown',
                players:     row.players     ?? 0,
                wave:        row.wave        ?? 0,
                version:     row.version     ?? 0,
                versionType: row.versionType ?? 'Unknown',
                mode:        row.mode        ?? 0,
                playerLimit: row.playerLimit ?? 0,
                description: row.description ?? '',
                modeName:    row.modeName    ?? '',
                online:      row.online      ?? false,
            };
        }

        return element;
    });
}

/** Full detail for a single server — delegates to the get_server_details() DB function. */
export async function getServer(serverId: number): Promise<(ServerElement & ServerDetails) | undefined> {
    const [result]: any = await sequelize.query(
        `SELECT * FROM get_server_details($1)`,
        { bind: [serverId], type: 'SELECT' as any }
    );

    if (!result) return undefined;

    const allMaps: ServerMapData[] = (result.detail_all_maps ?? []).map((m: any) => ({
        id:        m.id,
        serverId:  m.serverId,
        validFrom: new Date(m.validFrom),
        validTo:   m.validTo ? new Date(m.validTo) : null,
        mapName:   m.mapName,
        gameMode:  m.gameMode as GameMode,
        modeName:  m.modeName,
    }));

    const allMotds: ServerMotdData[] = (result.detail_all_motds ?? []).map((m: any) => ({
        id:          m.id,
        serverId:    m.serverId,
        validFrom:   new Date(m.validFrom),
        validTo:     m.validTo ? new Date(m.validTo) : null,
        serverName:  m.serverName,
        description: m.description,
        modeName:    m.modeName,
    }));

    const currentMotd = allMotds.find(m => m.validTo === null) ?? allMotds[0] ?? null;
    const currentMap  = allMaps.find(m => m.validTo === null)  ?? allMaps[0]  ?? null;

    const detail: ServerElement & ServerDetails = {
        id:          result.detail_id,
        name:        result.detail_name,
        host:        result.detail_host,
        port:        result.detail_port,
        online:      result.detail_online ?? false,
        lastUpdated: result.detail_last_updated?.getTime() ?? Date.now(),
        groupId:     result.server_group_id,
        playerPeaks: {
            allTime:     result.detail_all_time_peak ?? 0,
            allTimeDate: result.detail_peak_date     ?? new Date(),
            daily:       result.detail_daily_peak    ?? 0,
            weekly:      result.detail_weekly_peak   ?? 0,
        },
        uptime: {
            last24h: parseFloat(result.detail_24h_uptime) || 0,
            last7d:  parseFloat(result.detail_7d_uptime)  || 0,
        },
        allMaps,
        allMotds,
        currentMotd,
        currentMap,
    };

    if (result.detail_timestamp != null &&
        result.detail_timestamp > new Date(Date.now() - CURRENT_DATA_FRESH_THRESHOLD).getTime()) {
        detail.currentData = {
            ping:        result.detail_ping         ?? 0,
            host:        result.detail_host,
            port:        result.detail_port,
            serverName:  result.detail_display_name ?? currentMotd?.serverName  ?? 'Unknown',
            mapName:     result.detail_map_name     ?? currentMap?.mapName      ?? 'Unknown',
            players:     result.detail_players      ?? 0,
            wave:        result.detail_wave         ?? 0,
            version:     result.detail_version      ?? 0,
            versionType: result.detail_version_type ?? 'Unknown',
            mode:        (result.detail_mode ?? currentMap?.gameMode ?? 0) as GameMode,
            playerLimit: result.detail_player_limit ?? 0,
            description: result.detail_description  ?? currentMotd?.description ?? '',
            modeName:    result.detail_mode_name    ?? currentMotd?.modeName    ?? '',
            online:      result.detail_online       ?? false,
        };
    }

    return detail;
}

/** Upsert servers and their groups reliably. */
export async function batchUpsertServers(servers: ServerInput[]): Promise<void> {
    if (servers.length === 0) return;

    // 1. Deduplicate servers by host + port
    const deduplicated = Array.from(
        servers
            .reduce((acc, s) => {
                const key = `${s.host}|${s.port}`;
                if (!acc.has(key)) acc.set(key, s);
                return acc;
            }, new Map<string, ServerInput>())
            .values()
    );

    // 2. Extract strictly unique group names
    const groupObjects = Array.from(new Set(deduplicated.map(s => s.name)))
        .map(name => ({ name }));

    try {
        await sequelize.transaction(async (t) => {
            // Step 1: Ensure all server groups exist
            if (groupObjects.length > 0) {
                await sequelize.query(`
                    INSERT INTO server_groups (name)
                    SELECT name
                    FROM jsonb_to_recordset(:groupsJson::jsonb) AS x(name text)
                    ON CONFLICT (name) DO NOTHING
                `, {
                    replacements: { groupsJson: JSON.stringify(groupObjects) },
                    type: QueryTypes.INSERT,
                    transaction: t
                });
            }

            // Step 2: Insert servers joining against the updated server_groups table
            await sequelize.query(`
                WITH server_data AS (
                    SELECT * FROM jsonb_to_recordset(:serverData::jsonb)
                        AS x(name text, host text, port int)
                )
                INSERT INTO servers (host, port, server_group_id)
                SELECT sd.host, sd.port, g.id
                FROM server_data sd
                LEFT JOIN server_groups g ON g.name = sd.name
                ON CONFLICT (host, port) DO UPDATE
                    SET server_group_id = EXCLUDED.server_group_id,
                        updated_at      = NOW()
            `, {
                replacements: { serverData: JSON.stringify(deduplicated) },
                type: QueryTypes.INSERT,
                transaction: t
            });
        });
    } catch (error) {
        logger.error('Error batch upserting servers:', error);
        throw error;
    }
}

export async function bulkUpdateLastSeen(serverIds: number[]): Promise<void> {
    if (!serverIds.length) return;
    await Server.update(
        { last_seen: new Date() },
        { where: { id: { [Op.in]: serverIds } } }
    );
}

// ─── Stats writes ─────────────────────────────────────────────────────────────

export async function bulkSaveServerStats(statsBatch: ServerStats[]): Promise<void> {
    if (!statsBatch.length) return;
    await ServerStats.bulkCreate(<any>statsBatch);
    await upsertServerCurrent(statsBatch);
}

/**
 * Keeps server_current in step with the hypertable.
 *
 * server_current holds the newest sample per server so the read paths never
 * have to answer "latest value per server" with a DISTINCT ON over
 * server_stats.  Rows are deduplicated inside the batch first (ON CONFLICT
 * cannot resolve two conflicting rows from the same statement) and the update
 * is guarded on the timestamp, so an out-of-order batch cannot move a server
 * backwards in time.
 */
async function upsertServerCurrent(statsBatch: ServerStats[]): Promise<void> {
    const rows = statsBatch
        .filter(stat => stat.server_id != null && stat.timestamp != null)
        .map(stat => ({
            server_id:        stat.server_id,
            timestamp:        new Date(stat.timestamp).toISOString(),
            players:          stat.players      ?? 0,
            max_players:      stat.max_players  ?? null,
            wave:             stat.wave         ?? null,
            version:          stat.version      ?? null,
            version_type:     stat.version_type ?? null,
            ping:             stat.ping         ?? null,
            online:           stat.online       ?? false,
            motd_registry_id: stat.motd_registry_id ?? null,
            map_registry_id:  stat.map_registry_id  ?? null,
        }));

    if (!rows.length) return;

    await sequelize.query(`
        INSERT INTO server_current (
            server_id, timestamp, players, max_players, wave,
            version, version_type, ping, online, motd_registry_id, map_registry_id
        )
        SELECT DISTINCT ON (x.server_id)
            x.server_id, x.timestamp, x.players, x.max_players, x.wave,
            x.version, x.version_type, x.ping, x.online, x.motd_registry_id, x.map_registry_id
        FROM jsonb_to_recordset(:rows::jsonb) AS x(
            server_id int, timestamp timestamptz, players int, max_players int, wave int,
            version int, version_type varchar(50), ping int, online boolean,
            motd_registry_id int, map_registry_id int
        )
        ORDER BY x.server_id, x.timestamp DESC
        ON CONFLICT (server_id) DO UPDATE
            SET timestamp        = EXCLUDED.timestamp,
                players          = EXCLUDED.players,
                max_players      = EXCLUDED.max_players,
                wave             = EXCLUDED.wave,
                version          = EXCLUDED.version,
                version_type     = EXCLUDED.version_type,
                ping             = EXCLUDED.ping,
                online           = EXCLUDED.online,
                motd_registry_id = EXCLUDED.motd_registry_id,
                map_registry_id  = EXCLUDED.map_registry_id
            WHERE server_current.timestamp <= EXCLUDED.timestamp
    `, {
        replacements: { rows: JSON.stringify(rows) },
        type: QueryTypes.INSERT,
    });
}

// ─── Map / MOTD history writes ────────────────────────────────────────────────

/**
 * Shared logic for MOTD and Map history updates:
 *   1. Upsert the registry rows (deduplication).
 *   2. Fetch back the registry IDs.
 *   3. In one transaction: close old open history rows, bulk-insert new ones.
 */
async function bulkSaveHistoryEntries<T extends Record<string, unknown>>(opts: {
    entries:          T[];
    /** Unique natural key for deduplication and registry lookup. */
    keyOf:            (entry: T) => string;
    /** Columns to upsert into the registry table. */
    registryColumns:  string[];
    /** SQL table name for the registry. */
    registryTable:    string;
    /** SQL table name for the history. */
    historyTable:     string;
    /** Foreign-key column on the history table (e.g. 'motd_id', 'map_id'). */
    historyFkColumn:  string;
    /** Sequelize model for the history table. */
    historyModel:     typeof ServerMotdHistory | typeof ServerMapHistory;
    /** Build the registry row object for a given entry. */
    toRegistryRow:    (entry: T) => Record<string, unknown>;
    /** Column type hints for jsonb_to_recordset (e.g. "server_name text, description text"). */
    registryTypeDef:  string;
    /** Build the history insert row (without server_id / fk / valid_from). */
    logTag:           string;
}): Promise<Map<number, number>> {
    if (!opts.entries.length) return new Map();

    // 1. Deduplicate
    const unique = new Map<string, T>();
    for (const e of opts.entries) {
        const k = opts.keyOf(e);
        if (!unique.has(k)) unique.set(k, e);
    }

    const registryRowToKey = new Map<string, string>();
    for (const [key, entry] of unique.entries()) {
        const row = opts.toRegistryRow(entry);
        const rowKey = opts.registryColumns.map(col => row[col]).join('\x00');
        registryRowToKey.set(rowKey, key);
    }

    const registryData = Array.from(unique.values()).map(opts.toRegistryRow);

    // 2. Upsert registry
    await sequelize.query(`
        INSERT INTO ${opts.registryTable} (${opts.registryColumns.join(', ')})
        SELECT ${opts.registryColumns.join(', ')}
        FROM jsonb_to_recordset(:registryData::jsonb) AS x(${opts.registryTypeDef})
        ON CONFLICT (${opts.registryColumns.join(', ')}) DO NOTHING
    `, {
        replacements: { registryData: JSON.stringify(registryData) },
        type: QueryTypes.INSERT,
    });

    // 3. Fetch registry IDs
    const fetched: any[] = await sequelize.query(`
        SELECT ${opts.registryColumns.join(', ')}, id
        FROM ${opts.registryTable}
        WHERE (${opts.registryColumns.join(', ')}) IN (
            SELECT ${opts.registryColumns.join(', ')}
            FROM jsonb_to_recordset(:registryData::jsonb) AS x(${opts.registryTypeDef})
        )
    `, {
        replacements: { registryData: JSON.stringify(registryData) },
        type: QueryTypes.SELECT,
    });

    const registryMap = new Map<string, number>();
    for (const row of fetched) {
        const rowKey = opts.registryColumns.map(col => row[col]).join('\x00');
        const naturalKey = registryRowToKey.get(rowKey);
        if (naturalKey !== undefined) {
            registryMap.set(naturalKey, row.id);
        }
    }

    const serverIds = opts.entries.map((e: any) => e.server_id);
    const now       = new Date();

    const currentActiveHistory: any[] = await sequelize.query(`
        SELECT server_id, ${opts.historyFkColumn} as current_id
        FROM ${opts.historyTable}
        WHERE server_id IN (:serverIds) AND valid_to IS NULL
    `, {
        replacements: { serverIds },
        type: QueryTypes.SELECT
    });

    const currentIdByServer = new Map<number, number>(
        currentActiveHistory.map(r => [r.server_id, r.current_id])
    );

    const changedEntries = opts.entries.filter(e => {
        const key = opts.keyOf(e);
        const incomingRegistryId = registryMap.get(key);
        if (incomingRegistryId === null || incomingRegistryId === undefined) {
            logger.error(
                `${opts.logTag}: registry ID not found for key ${key}`
            );
            return false;
        }
        const currentRegistryId = currentIdByServer.get(<number>e.server_id);
        return incomingRegistryId !== currentRegistryId;
    });

    if (changedEntries.length === 0) {
        return new Map();
    }

    const changedServerIds = changedEntries.map(
        (e: any) => e.server_id
    );

    // 4. Close old open rows + insert new ones in one transaction
    await sequelize.transaction(async (t: Transaction) => {
        await (opts.historyModel as any).update(
            { valid_to: now },
            {
                where:       { server_id: { [Op.in]: changedServerIds }, valid_to: null },
                transaction: t,
            }
        );

        const toInsert = changedEntries.flatMap((e: any) => {
            const key        = opts.keyOf(e);
            const registryId = registryMap.get(key);
            if (!registryId) logger.error(`${opts.logTag}: registry ID not found for key: ${key}`);
            return {
                server_id:              e.server_id,
                [opts.historyFkColumn]: registryId,
                valid_from:             now,
            };
        });

        await (opts.historyModel as any).bulkCreate(toInsert, { transaction: t });
    });

    return new Map<number, number>(
        opts.entries.flatMap((e: any) => {
            const key = opts.keyOf(e);
            const registryId = registryMap.get(key);
            return registryId !== undefined ? [[e.server_id, registryId]] : [];
        })
    );
}

export async function bulkSaveMotds(newMotds: any[]): Promise<Map<number, number>> {
    return await bulkSaveHistoryEntries({
        entries:         newMotds,
        keyOf:           e => `${normalize((e as any).server_name)}|${normalize((e as any).description)}`,
        registryColumns: ['server_name', 'description'],
        registryTable:   'server_motds_registry',
        historyTable:    'server_motds_history',
        historyFkColumn: 'motd_id',
        historyModel:    ServerMotdHistory,
        toRegistryRow:   e => ({
            server_name: (e as any).server_name ?? '',
            description: (e as any).description ?? '',
        }),
        registryTypeDef: 'server_name text, description text',
        logTag:          'bulkSaveMotds',
    });
}

export async function bulkSaveMaps(newMaps: any[]): Promise<Map<number, number>> {
    return await bulkSaveHistoryEntries({
        entries:         newMaps,
        keyOf:           e => `${normalize((e as any).map_name)}|${normalize((e as any).game_mode)}|${normalize((e as any).mode_name)}`,
        registryColumns: ['map_name', 'game_mode', 'mode_name'],
        registryTable:   'server_maps_registry',
        historyTable:    'server_maps_history',
        historyFkColumn: 'map_id',
        historyModel:    ServerMapHistory,
        toRegistryRow:   e => ({
            map_name:  (e as any).map_name  ?? 'Unknown',
            game_mode: (e as any).game_mode ?? 0,
            mode_name: (e as any).mode_name ?? '',
        }),
        registryTypeDef: 'map_name text, game_mode smallint, mode_name text',
        logTag:          'bulkSaveMaps',
    });
}

// ─── Map / MOTD history reads ─────────────────────────────────────────────────

export async function getMapHistory(
    serverId: number,
    page: number    = 1,
    perPage: number = 20
): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * perPage;

    const [[{ count }], data]: any = await Promise.all([
        sequelize.query(
            `SELECT COUNT(*) AS count FROM server_maps_history WHERE server_id = :serverId`,
            { replacements: { serverId }, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT h.id, h.server_id, h.valid_from, h.valid_to,
                    r.map_name, r.game_mode, r.mode_name
             FROM server_maps_history h
             JOIN server_maps_registry r ON h.map_id = r.id
             WHERE h.server_id = :serverId
             ORDER BY h.valid_from DESC
             LIMIT :perPage OFFSET :offset`,
            { replacements: { serverId, perPage, offset }, type: QueryTypes.SELECT }
        ),
    ]);

    return { data, total: parseInt(count, 10) };
}

export async function getMotdHistory(
    serverId: number,
    page: number    = 1,
    perPage: number = 20
): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * perPage;

    const [[{ count }], data]: any = await Promise.all([
        sequelize.query(
            `SELECT COUNT(*) AS count FROM server_motds_history WHERE server_id = :serverId`,
            { replacements: { serverId }, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT h.id, h.server_id, h.valid_from, h.valid_to,
                    r.server_name, r.description
             FROM server_motds_history h
             JOIN server_motds_registry r ON h.motd_id = r.id
             WHERE h.server_id = :serverId
             ORDER BY h.valid_from DESC
             LIMIT :perPage OFFSET :offset`,
            { replacements: { serverId, perPage, offset }, type: QueryTypes.SELECT }
        ),
    ]);

    return { data, total: parseInt(count, 10) };
}

// ─── Network (server group) ───────────────────────────────────────────────────

/**
 * Returns aggregate stats for a network in a single query.
 * Previously this was 4 separate round-trips; the bug where activeServers
 * equalled totalServers is also fixed here.
 */
export async function getNetworkDetails(groupId: number): Promise<NetworkDetails | undefined> {
    const [row]: any = await sequelize.query(`
        WITH group_servers AS (
            SELECT id FROM servers WHERE server_group_id = :groupId
        ),
        latest_stats AS (
            -- server_current holds exactly one row per server; the hour bound
            -- keeps long-dead servers from counting towards active_servers.
            SELECT server_id, players, timestamp
            FROM server_current
            WHERE server_id IN (SELECT id FROM group_servers)
              AND timestamp > NOW() - INTERVAL '1 hour'
        ),
        peaks AS (
            -- Hourly continuous aggregate: max() is decomposable, so
            -- max(max_players) is the same number the raw scan produced, without
            -- walking (and decompressing) every chunk back to day one.
            SELECT
                MAX(max_players) FILTER (WHERE bucket > NOW() - interval '1 day')  AS daily_peak,
                MAX(max_players) FILTER (WHERE bucket > NOW() - interval '7 days') AS weekly_peak,
                MAX(max_players)                                                   AS all_time_peak
            FROM server_stats_1h
            WHERE server_id IN (SELECT id FROM group_servers)
        ),
        top_server AS (
            SELECT s.id, s.host, s.port, ls.players, sg2.name AS server_name
            FROM servers s
            JOIN server_groups sg2 ON s.server_group_id = sg2.id
            LEFT JOIN latest_stats ls ON s.id = ls.server_id
            WHERE s.server_group_id = :groupId
            ORDER BY ls.players DESC NULLS LAST
            LIMIT 1
        )
        SELECT
            sg.id,
            sg.name,
            (SELECT COUNT(*)                                   FROM group_servers) AS total_servers,
            (SELECT COUNT(*) FROM latest_stats WHERE players > 0)                 AS active_servers,
            (SELECT daily_peak    FROM peaks)                                      AS daily_peak,
            (SELECT weekly_peak   FROM peaks)                                      AS weekly_peak,
            (SELECT all_time_peak FROM peaks)                                      AS all_time_peak,
            (SELECT id          FROM top_server)                                   AS top_server_id,
            (SELECT host        FROM top_server)                                   AS top_server_host,
            (SELECT port        FROM top_server)                                   AS top_server_port,
            (SELECT players     FROM top_server)                                   AS top_server_players,
            (SELECT server_name FROM top_server)                                   AS top_server_name
        FROM server_groups sg
        WHERE sg.id = :groupId
    `, { replacements: { groupId }, type: QueryTypes.SELECT });

    if (!row) return undefined;

    return {
        id:   row.id,
        name: row.name,
        playerPeaks: {
            allTime: row.all_time_peak ?? 0,
            daily:   row.daily_peak   ?? 0,
            weekly:  row.weekly_peak  ?? 0,
        },
        topServer: row.top_server_id
            ? {
                id:      row.top_server_id,
                host:    row.top_server_host,
                port:    row.top_server_port,
                players: row.top_server_players ?? 0,
                name:    row.top_server_name,
            }
            : null,
        activeServers: parseInt(row.active_servers, 10) || 0,
        totalServers:  parseInt(row.total_servers,  10) || 0,
    };
}
