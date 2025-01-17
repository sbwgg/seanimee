import { useSelectAtom } from "@/atoms/helpers"
import { useMediaDownloadInfo } from "@/lib/download/helpers"
import { useLatestMainLocalFileByMediaId } from "@/atoms/library/local-file.atoms"
import React, { memo, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { AnilistShowcaseMedia } from "@/lib/anilist/fragment"
import { useRouter } from "next/navigation"
import { LargeEpisodeListItem } from "@/components/shared/large-episode-list-item"
import { Atom } from "jotai"
import { LibraryEntry } from "@/atoms/library/library-entry.atoms"
import { formatDistanceToNow, isBefore, subYears } from "date-fns"
import { anilist_getEpisodeCeilingFromMedia } from "@/lib/anilist/utils"
import { anizip_getEpisode } from "@/lib/anizip/utils"
import { fetchAniZipData } from "@/lib/anizip/helpers"

export function ContinueWatching(props: { entryAtom: Atom<LibraryEntry> }) {

    const media = useSelectAtom(props.entryAtom, entry => entry.media)
    const currentlyWatching = useSelectAtom(props.entryAtom, entry => entry.collectionEntry?.status === "CURRENT")
    const progress = useSelectAtom(props.entryAtom, entry => entry.collectionEntry?.progress)

    const { downloadInfo } = useMediaDownloadInfo(media)
    const latestFile = useLatestMainLocalFileByMediaId(media.id)

    const nextEpisode = useMemo(() => {
        if (currentlyWatching) {
            const availableEp = anilist_getEpisodeCeilingFromMedia(media)
            // Next episode has not been watched
            // Latest sorted file has an episode
            // The episode has been downloaded
            if (!downloadInfo.schedulingIssues) {
                if (availableEp > (progress || 0) && !!latestFile?.metadata?.episode && !downloadInfo.episodeNumbers.includes((progress || 0) + 1)) {
                    return (progress || 0) + 1
                }
                // FIXME Hacky way to check if the next episode is downloaded when we don't have accurate scheduling information
            } else if (latestFile?.metadata?.episode === ((progress || 0) + 1)) {
                return (progress || 0) + 1
            }
        }
        return undefined
    }, [currentlyWatching, progress, downloadInfo.schedulingIssues, latestFile?.metadata?.episode, downloadInfo.episodeNumbers, media])


    const { data, isLoading } = useQuery({
        queryKey: ["continue-watching-anizip", media.id, nextEpisode, progress, currentlyWatching],
        queryFn: async () => {
            return await fetchAniZipData(media.id)
        },
        keepPreviousData: false,
        enabled: !!nextEpisode,
        cacheTime: 1000 * 60 * 60,
    })

    if (!nextEpisode) return null


    return !isLoading ? (
        <>
            <EpisodeItem
                key={`${media.id}${nextEpisode}`}
                media={media}
                episodeNumber={nextEpisode!}
                aniZipData={data}
            />
        </>
    ) : (
        <>
            <Skeleton
                className={"rounded-md h-auto overflow-hidden aspect-[4/2] w-96 relative flex items-end flex-none"}
            />
        </>
    )
}


type EpisodeItemProps = {
    media: AnilistShowcaseMedia
    episodeNumber: number
    aniZipData?: AniZipData
}

const EpisodeItem = memo(({ media, episodeNumber, aniZipData }: EpisodeItemProps) => {

    const episodeData = anizip_getEpisode(aniZipData, episodeNumber)

    const router = useRouter()

    const date = episodeData?.airdate ? new Date(episodeData?.airdate) : undefined
    const mediaIsOlder = useMemo(() => date ? isBefore(date, subYears(new Date(), 2)) : undefined, [])

    return (
        <>
            <LargeEpisodeListItem
                image={episodeData?.image || media.bannerImage}
                title={`Episode ${episodeNumber}`}
                topTitle={media.title?.userPreferred}
                actionIcon={undefined}
                meta={(date) ? (!mediaIsOlder ? `${formatDistanceToNow(date, { addSuffix: true })}` : new Intl.DateTimeFormat("en-US", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                }).format(date)) : undefined}
                onClick={() => {
                    router.push(`/view/${media.id}?playNext=true`)
                }}
            />
        </>
    )
})
