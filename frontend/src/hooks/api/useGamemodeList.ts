import { useEffect, useState } from "react";
import {GamemodeInfo} from "../../../../common/models/GlobalStatsTypes.js";
import {ApiPacker} from "../../../../common/Packer.ts";
import { getBaseUrl } from "../../util/getApi.ts";

export function useGamemodeList() {
    const [gamemodeList, setGamemodeList] = useState<GamemodeInfo[]>([]);

    useEffect(() => {
        let cancelled = false;
        const baseUrl = getBaseUrl();
        fetch(`${baseUrl}/api/gamemodes`)
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((r) => ApiPacker.unpack<GamemodeInfo>(r))
            .then((data: GamemodeInfo[]) => {
                if (!cancelled) setGamemodeList(data);
            })
            .catch((err) => console.error("Error fetching gamemode list:", err));

        return () => { cancelled = true; };
    }, []);

    return gamemodeList;
}