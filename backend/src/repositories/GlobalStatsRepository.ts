import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';
import { type GamemodeHistoryEntry, type GamemodeInfo, type ServerShareEntry } from '../../../common/models/GlobalStatsTypes.js';
import {removeColorsFromMindustry} from "../../../common/Mindustry.js";
import {
    PLAYER_FILTER_REPLACEMENTS,
    pickAggregateSource,
    playerFilterSql,
} from './aggregateTiers.js';
import {getModeName, getVanillaModeName, modeNameToIntOrNull} from "../../../common/Gamemode.js";

interface RawGamemodeHistoryRow {
    timestamp: number;
    mode_name: string;
    players: number | null;
    game_mode: number;
}

interface RawGamemodeListRow {
    mode_name: string;
    game_mode: number;
    server_count: number;
}

interface RawServerShareRow {
    timestamp: number;
    server_id: number;
    server_group_id: number;
    server_name: string;
    group_name: string;
    players: number | null;
}

/**
 * Range bounds shared by both builders.
 *
 * The end bound is exclusive but pushed out by one bucket so the bucket that is
 * currently filling up is still returned.
 */
function rangeBounds(startDate?: number, endDate?: number): { rangeStart: string; rangeEnd: string } {
    const fixedWindow = startDate != null && endDate != null;

    return {
        rangeStart: fixedWindow
            ? "time_bucket(:bucketSeconds * INTERVAL '1 second', to_timestamp(:startDate / 1000.0))"
            : "time_bucket(:bucketSeconds * INTERVAL '1 second', NOW() - interval '1 hour' * :hoursBack)",
        rangeEnd: fixedWindow
            ? "(time_bucket(:bucketSeconds * INTERVAL '1 second', to_timestamp(:endDate / 1000.0)) + :bucketSeconds * INTERVAL '1 second')"
            : "(time_bucket(:bucketSeconds * INTERVAL '1 second', NOW()) + :bucketSeconds * INTERVAL '1 second')",
    };
}

/**
 * Builds the SQL for bucketed gamemode history query.
 * Returns player counts grouped by mode_name per time bucket.
 *
 * Reads from the map-keyed continuous aggregates (see aggregateTiers.ts); the
 * gamemode is resolved from server_maps_registry at read time, so correcting a
 * map's classification takes effect immediately instead of needing years of
 * materialised data rebuilt.
 *
 * time_bucket_gapfill fills each mode's series independently, which is what the
 * old all_buckets × all_modes cross join was emulating — empty buckets still
 * keep their mode_name instead of coming back as null rows.
 */
function buildGamemodeHistoryQuery(
    hoursBack: number,
    bucketMinutes: number,
    startDate?: number,
    endDate?: number
): { query: string; replacements: Record<string, unknown> } {
    const source = pickAggregateSource(bucketMinutes);
    const time = source.timeColumn;
    const { rangeStart, rangeEnd } = rangeBounds(startDate, endDate);

    const timeParams =
        startDate != null && endDate != null
            ? { startDate, endDate }
            : { hoursBack };

    const conditions = [
        `src.${time} >= ${rangeStart}`,
        `src.${time} < ${rangeEnd}`,
        playerFilterSql(source, 'src'),
    ].filter((c): c is string => c != null);

    const query = `
        SELECT extract(epoch FROM g.gf_bucket) * 1000 AS timestamp,
               g.mode_name,
               g.game_mode,
               g.players
        FROM (
            SELECT time_bucket_gapfill(
                           :bucketSeconds * INTERVAL '1 second',
                           ps.bucket,
                           ${rangeStart},
                           ${rangeEnd}
                   ) AS gf_bucket,
                   ps.mode_name,
                   ps.game_mode,
                   SUM(ps.players) AS players
            FROM (
                -- Peak per server first, so summing across servers cannot
                -- double count a server that changed map mid-bucket.
                SELECT time_bucket(:bucketSeconds * INTERVAL '1 second', src.${time}) AS bucket,
                       src.server_id,
                       smr.mode_name,
                       smr.game_mode,
                       MAX(src.${source.playersColumn}) AS players
                FROM ${source.mapTable} src
                         JOIN server_maps_registry smr ON src.map_registry_id = smr.id
                WHERE ${conditions.join('\n                  AND ')}
                GROUP BY 1, 2, 3, 4
            ) ps
            WHERE ps.bucket >= ${rangeStart}
              AND ps.bucket < ${rangeEnd}
            -- Aliased away from the subquery's own bucket column: an
            -- unqualified GROUP BY name binds to the input column.
            GROUP BY gf_bucket, ps.mode_name, ps.game_mode
        ) g
        ORDER BY g.gf_bucket, g.mode_name
    `;

    const replacements = {
        ...timeParams,
        ...PLAYER_FILTER_REPLACEMENTS,
        bucketSeconds: source.bucketMinutes * 60,
    };
    return { query, replacements };
}

/**
 * Builds the SQL for bucketed server share query for a specific gamemode.
 * Returns player counts per server with group info.
 *
 * Same aggregate-backed shape as above; time_bucket_gapfill fills each server's
 * series, so empty buckets retain server identity instead of coming back as
 * null rows.
 */
function buildServerShareQuery(
    modeName: string,
    hoursBack: number,
    bucketMinutes: number,
    startDate?: number,
    endDate?: number
): { query: string; replacements: Record<string, unknown> } {
    const source = pickAggregateSource(bucketMinutes);
    const time = source.timeColumn;
    const { rangeStart, rangeEnd } = rangeBounds(startDate, endDate);

    const timeParams =
        startDate != null && endDate != null
            ? { startDate, endDate }
            : { hoursBack };

    const conditions = [
        'smr.game_mode = :modeInt',
        `src.${time} >= ${rangeStart}`,
        `src.${time} < ${rangeEnd}`,
        playerFilterSql(source, 'src'),
    ].filter((c): c is string => c != null);

    const query = `
        WITH bucketed_stats AS (
            SELECT time_bucket_gapfill(
                           :bucketSeconds * INTERVAL '1 second',
                           src.${time},
                           ${rangeStart},
                           ${rangeEnd}
                   ) AS gf_bucket,
                   src.server_id,
                   MAX(src.${source.playersColumn}) AS players -- gaps stay NULL
            FROM ${source.mapTable} src
                     JOIN server_maps_registry smr ON src.map_registry_id = smr.id
            WHERE ${conditions.join('\n              AND ')}
            -- Aliased away from the source's own bucket column: an
            -- unqualified GROUP BY name binds to the input column, which would
            -- silently group at the source's resolution instead of the
            -- requested one.
            GROUP BY gf_bucket, src.server_id
        )
        SELECT
            extract(epoch FROM bs.gf_bucket) * 1000 AS timestamp,
            bs.server_id,
            s.server_group_id,
            '' AS server_name,
            sg.name AS group_name,
            bs.players
        FROM bucketed_stats bs
                 -- Join the metadata AFTER the heavy lifting is done
                 JOIN servers s ON bs.server_id = s.id
                 JOIN server_groups sg ON s.server_group_id = sg.id
        ORDER BY bs.gf_bucket, bs.server_id;
    `;

    const replacements = {
        ...timeParams,
        ...PLAYER_FILTER_REPLACEMENTS,
        bucketSeconds: source.bucketMinutes * 60,
        modeInt: modeNameToIntOrNull(modeName),
    };
    return { query, replacements };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get global player history grouped by mode_name
 */
export async function getGlobalGamemodeHistory(
    hoursBack: number = 24,
    bucketMinutes: number = 1,
    startDate?: number,
    endDate?: number
): Promise<GamemodeHistoryEntry[]> {
    if (bucketMinutes < 1) {
        bucketMinutes = 1;
    }

    const { query, replacements } = buildGamemodeHistoryQuery(
        hoursBack,
        bucketMinutes,
        startDate,
        endDate
    );

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    }) as RawGamemodeHistoryRow[];

    return rows.map(r => {
        const modeName = getModeName(r.mode_name, r.game_mode);
        return {
            timestamp: Number(r.timestamp),
            modeName: modeName ?? 'Unknown',
            cleanName: modeName ?? 'Unknown',
            players: r.players == null ? null : Number(r.players)
        }
    });
}

/**
 * Get list of all gamemodes with server counts
 */
export async function getGamemodeList(): Promise<GamemodeInfo[]> {
    //todo gamemode registry, that will unlock this feature fully
    const query = `
        SELECT --smr.mode_name,
               COUNT(DISTINCT smh.server_id) AS server_count,
               smr.game_mode
        FROM server_maps_registry smr
                 JOIN server_maps_history smh ON smr.id = smh.map_id
        WHERE smr.mode_name IS NOT NULL
          AND smr.mode_name != ''
        GROUP BY smr.game_mode--, smr.mode_name
        --ORDER BY smr.mode_name
    `;

    const rows = await sequelize.query(query, {
        type: QueryTypes.SELECT
    }) as RawGamemodeListRow[];

    return rows.map(r => ({
        modeName: getVanillaModeName(r.game_mode),
        serverCount: Number(r.server_count),
        cleanName: getVanillaModeName(r.game_mode)//removeColorsFromMindustry(r.mode_name) ?? "Null",
    }));
}

/**
 * Get server share for a specific gamemode
 */
export async function getServerShareByGamemode(
    modeName: string,
    hoursBack: number = 24,
    bucketMinutes: number = 1,
    startDate?: number,
    endDate?: number
): Promise<ServerShareEntry[]> {
    if (bucketMinutes < 1) {
        bucketMinutes = 1;
    }

    const { query, replacements } = buildServerShareQuery(
        modeName,
        hoursBack,
        bucketMinutes,
        startDate,
        endDate
    );

    const rows = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    }) as RawServerShareRow[];

    return rows.map(r => ({
        timestamp: Number(r.timestamp),
        serverId: Number(r.server_id),
        serverGroupId: Number(r.server_group_id),
        serverName: r.server_name,
        groupName: r.group_name,
        players: r.players == null ? null : Number(r.players)
    }));
}