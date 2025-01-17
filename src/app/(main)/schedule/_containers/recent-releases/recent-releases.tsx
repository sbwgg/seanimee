import { useQuery } from "@tanstack/react-query"
import { useAniListAsyncQuery } from "@/hooks/graphql-server-helpers"
import { ListRecentAiringsDocument } from "@/gql/graphql"
import { addSeconds, formatDistanceToNow, subDays } from "date-fns"
import React from "react"
import { Slider } from "@/components/shared/slider"
import { LargeEpisodeListItem } from "@/components/shared/large-episode-list-item"
import { useRouter } from "next/navigation"
import { BiLinkExternal } from "@react-icons/all-files/bi/BiLinkExternal"
import { AppLayoutStack } from "@/components/ui/app-layout"

export function RecentReleases() {

    const router = useRouter()

    const { data } = useQuery({
        queryKey: ["recent-released"],
        queryFn: async () => {
            return await useAniListAsyncQuery(ListRecentAiringsDocument, {
                page: 1,
                perPage: 50,
                airingAt_lesser: Math.floor(new Date().getTime() / 1000),
                airingAt_greater: Math.floor(subDays(new Date(), 14).getTime() / 1000),
            })
        },
        keepPreviousData: true,
        cacheTime: 1000 * 60 * 10,
    })

    return (
        <AppLayoutStack>
            <h2>Recent releases</h2>
            <Slider>
                {data?.Page?.airingSchedules?.filter(item => item?.media?.isAdult === false
                    && item?.media?.type === "ANIME"
                    && item?.media?.countryOfOrigin === "JP"
                    && item?.media?.format !== "TV_SHORT",
                ).filter(Boolean).map(item => {
                    return (
                        <LargeEpisodeListItem
                            key={item.id}
                            title={`Episode ${item.episode}`}
                            image={item.media?.bannerImage || item.media?.coverImage?.large}
                            topTitle={item.media?.title?.userPreferred}
                            meta={item.airingAt ? formatDistanceToNow(addSeconds(new Date(), item.timeUntilAiring), { addSuffix: true }) : undefined}
                            onClick={() => router.push(`/view/${item.media?.id}`)}
                            actionIcon={<BiLinkExternal/>}
                        />
                    )
                })}
            </Slider>
        </AppLayoutStack>
    )
}
