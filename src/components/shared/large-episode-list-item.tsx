import React from "react"
import { cn } from "@/components/ui/core"
import Image from "next/image"
import { AiFillPlayCircle } from "@react-icons/all-files/ai/AiFillPlayCircle"

interface EpisodeListItemProps {
    title: string,
    actionIcon?: React.ReactElement
    image?: string | null
    onClick?: () => void
    topTitle?: string | null
    meta?: string | null
}

export const LargeEpisodeListItem: React.FC<EpisodeListItemProps & React.ComponentPropsWithoutRef<"div">> = (props) => {

    const {
        children,
        actionIcon = <AiFillPlayCircle/>,
        image,
        onClick,
        topTitle,
        meta,
        title,
        ...rest
    } = props

    return <>
        <div
            className={"rounded-md border border-[--border] overflow-hidden aspect-[4/2] w-96 relative flex items-end flex-none group/missed-episode-item"}
        >
            <div className={"absolute w-full h-full rounded-md rounded-b-none overflow-hidden z-[1]"}>
                {!!image ? <Image
                    src={image}
                    alt={""}
                    fill
                    quality={100}
                    sizes="20rem"
                    className="object-cover object-center transition group-hover/missed-episode-item:scale-110"
                /> : <div
                    className={"h-full block absolute w-full bg-gradient-to-t from-gray-800 to-transparent z-[2]"}></div>}
                <div
                    className={"z-[1] absolute bottom-0 w-full h-[80%] bg-gradient-to-t from-[--background-color] to-transparent"}
                />
            </div>
            <div className={cn(
                "group-hover/missed-episode-item:opacity-100 text-7xl text-gray-200",
                "cursor-pointer opacity-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-md z-[6] absolute w-full h-full flex items-center justify-center",
            )} onClick={onClick}>
                {actionIcon}
            </div>
            <div className={"relative z-[3] w-full p-4 space-y-1"}>
                {topTitle && <p className={"w-[80%] line-clamp-1 text-[--muted] font-semibold"}>{topTitle}</p>}
                <div className={"w-full justify-between flex items-center"}>
                    <p className={"text-xl font-semibold"}>{title}</p>
                    {(meta) &&
                        <p className={"text-[--muted]"}>{meta}</p>}
                </div>
            </div>
        </div>
    </>

}
