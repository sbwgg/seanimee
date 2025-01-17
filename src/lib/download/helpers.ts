import { AnilistDetailedMedia } from "@/lib/anilist/fragment"
import { MediaListStatus } from "@/gql/graphql"
import { useAnilistCollectionEntryAtomByMediaId } from "@/atoms/anilist/entries.atoms"
import { useStableSelectAtom } from "@/atoms/helpers"
import { useLibraryEntryAtomByMediaId } from "@/atoms/library/library-entry.atoms"
import { useLatestMainLocalFileByMediaId, useLocalFilesByMediaId_UNSTABLE } from "@/atoms/library/local-file.atoms"
import { useMemo } from "react"
import { LocalFile } from "@/lib/local-library/types"
import sortBy from "lodash/sortBy"
import { localFile_isMain } from "@/lib/local-library/utils/episode.utils"
import { anilist_getEpisodeCeilingFromMedia } from "@/lib/anilist/utils"

export const getMediaDownloadInfo = (props: {
    media: AnilistDetailedMedia,
    files: LocalFile[],
    progress: number | null | undefined,
    status: MediaListStatus | null | undefined,
}) => {

    const { media, files, progress, status } = props

    const lastProgress = progress ?? 0
    // e.g., 12
    const maxEp = anilist_getEpisodeCeilingFromMedia(media)

    // Sometimes AniList includes Episode 0, AniDB does not
    const specialIsIncluded = files.filter(file => localFile_isMain(file)).some(file => file.metadata.episode === 0)

    // e.g., [1,2,3,…,12]
    let originalEpisodeArr = [...Array(maxEp).keys()].map((_, idx) => idx + 1)

    // None of the files have an episode number than is equal to the AniList ceiling
    if (specialIsIncluded && files.findIndex(file => file.metadata.episode === maxEp) === -1) {
        originalEpisodeArr = [0, ...originalEpisodeArr.slice(0, -1)]
    }

    // e.g., progress = 9 => [10,11,12] | completed => [1,2,3,…,12]
    const actualEpisodeArr = status !== "COMPLETED" ? [...originalEpisodeArr.slice(lastProgress)] : originalEpisodeArr

    // e.g., [1,2]
    let downloadedEpisodeArr = files.filter(file => localFile_isMain(file)).map(file => file.metadata.episode)

    // No files with episode number, but we know that the media is a movie, and there is at least a file associated with that media
    if (
        (media.format === "MOVIE" || media.episodes === 1)
        && downloadedEpisodeArr.length === 0
        && files.filter(file => !file.metadata.isNC).length > 0 // there is at least a file associated with that media that is not NC
    ) {
        downloadedEpisodeArr = [1]
    }

    let missingArr = sortBy(actualEpisodeArr.filter(num => !downloadedEpisodeArr.includes(num)))

    const canBatch = (media.status === "FINISHED" || media.status === "CANCELLED") && !!media.episodes && media.episodes > 1

    // FIXME This is a hacky fix for the case where the media is still airing but media.nextAiringEpisode is null due to scheduling issues
    const schedulingIssues = media.status === "RELEASING" && !media.nextAiringEpisode && !!media.episodes
    if (schedulingIssues) {
        missingArr = []
    }

    return {
        toDownload: missingArr.length,
        originalEpisodeCount: media.episodes,
        isMovie: media.format === "MOVIE",
        episodeNumbers: missingArr,
        rewatch: status === "COMPLETED",
        // batch = should download entire batch
        batch: canBatch && downloadedEpisodeArr.length === 0 && lastProgress === 0, // Media finished airing and user has no episodes downloaded/watched
        schedulingIssues,
        canBatch,
    }


}

export type MediaDownloadInfo = ReturnType<typeof getMediaDownloadInfo>

export function useMediaDownloadInfo(media: AnilistDetailedMedia) {
    const collectionEntryAtom = useAnilistCollectionEntryAtomByMediaId(media.id)
    const collectionEntryProgress = useStableSelectAtom(collectionEntryAtom, collectionEntry => collectionEntry?.progress)
    const collectionEntryStatus = useStableSelectAtom(collectionEntryAtom, collectionEntry => collectionEntry?.status)
    const entryAtom = useLibraryEntryAtomByMediaId(media.id)
    const latestFile = useLatestMainLocalFileByMediaId(media.id)

    const files = useLocalFilesByMediaId_UNSTABLE(media.id)

    const downloadInfo = useMemo(() => getMediaDownloadInfo({
        media: media,
        files: files,
        progress: collectionEntryProgress,
        status: collectionEntryStatus,
    }), [files.length])

    return {
        entryAtom,
        collectionEntryAtom,
        collectionEntryProgress,
        collectionEntryStatus,
        latestFile,
        downloadInfo,
    }
}
