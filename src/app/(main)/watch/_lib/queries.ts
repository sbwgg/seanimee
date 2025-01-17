"use client"

import { useQuery } from "@tanstack/react-query"
import { SkipTime } from "@/lib/aniskip/types"
import { ConsumetAnimeEpisode, ConsumetProvider } from "@/lib/consumet/types"
import { getConsumetEpisodes, getConsumetEpisodeStreamingData } from "@/lib/consumet/actions"
import { logger } from "@/lib/helpers/debug"

/**
 * Get an episode streaming data from a specific provider
 * @param episodes
 * @param episodeNumber
 * @param provider
 * @param server
 */
export function useEpisodeStreamingData(episodes: ConsumetAnimeEpisode[], episodeNumber: number, provider: ConsumetProvider, server: any | undefined) {
    const episodeId = episodes.find(episode => episode.number === episodeNumber)?.id
    const res = useQuery(
        ["episode-streaming-data", episodes, episodeNumber, server || "-"],
        async () => {
            logger("watch/lib/useEpisodeStreamingData").info(`Fetching episode ${episodeNumber} streaming data (${provider}, ${server})`)
            return await getConsumetEpisodeStreamingData(episodeId!, provider, server, true)
        },
        { enabled: !!episodeId, retry: false, keepPreviousData: false, refetchOnWindowFocus: false },
    )
    return { data: res.data, isLoading: res.isLoading || res.isFetching, isError: res.isError }
}

/**
 * Get metadata of all episodes from all providers
 * @param mediaId
 * @param server
 */
export function useProviderEpisodes(mediaId: number, server: any) {
    const res = useQuery(
        ["episode-data", mediaId, server],
        async () => {
            logger("watch/lib/useProviderEpisodes").info("Fetching episodes from all providers", mediaId)
            return await getConsumetEpisodes(mediaId, server, true)
        },
        { keepPreviousData: false, refetchOnWindowFocus: false },
    )
    return { data: res.data, isLoading: res.isLoading || res.isFetching, isError: res.isError, error: res.error }
}

/**
 * Get skip information for a certain media
 * @param mediaMalId
 * @param episodeNumber
 */
export function useSkipData(mediaMalId: number | null | undefined, episodeNumber: number) {
    const res = useQuery(
        ["skip-data", mediaMalId, episodeNumber],
        async () => {
            const result = await fetch(
                `https://api.aniskip.com/v2/skip-times/${mediaMalId}/${episodeNumber}?types[]=ed&types[]=mixed-ed&types[]=mixed-op&types[]=op&types[]=recap&episodeLength=`,
            )
            const skip = (await result.json()) as { found: boolean, results: SkipTime[] }
            if (!!skip.results && skip.found) return {
                op: skip.results?.find((item) => item.skipType === "op") || null,
                ed: skip.results?.find((item) => item.skipType === "ed") || null,
            }
            return { op: null, ed: null }
        },
        { keepPreviousData: false, refetchOnWindowFocus: false, enabled: !!mediaMalId },
    )
    return { data: res.data, isLoading: res.isLoading || res.isFetching, isError: res.isError }
}
