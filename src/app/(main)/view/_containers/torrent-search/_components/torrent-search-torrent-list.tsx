/* -------------------------------------------------------------------------------------------------
 * - List torrents that are about to be downloaded
 * - Add torrent magnets
 * - Redirect to download page
 * -----------------------------------------------------------------------------------------------*/
import React, { useCallback, useMemo, useRef, useState } from "react"
import { Atom } from "jotai"
import { LibraryEntry } from "@/atoms/library/library-entry.atoms"
import { AnilistDetailedMedia } from "@/lib/anilist/fragment"
import { useSettings } from "@/atoms/settings"
import { useRouter } from "next/navigation"
import { useAtomValue, useSetAtom } from "jotai/react"
import { useStableSelectAtom } from "@/atoms/helpers"
import { useMount } from "react-use"
import { TorrentManager } from "@/lib/download"
import { FcFolder } from "@react-icons/all-files/fc/FcFolder"
import { Tooltip } from "@/components/ui/tooltip"
import { Button, IconButton } from "@/components/ui/button"
import { BiDownload } from "@react-icons/all-files/bi/BiDownload"
import {
    __torrentSearch_selectedTorrentsAtom,
    __torrentSearch_sortedSelectedTorrentsAtom,
} from "@/app/(main)/view/_containers/torrent-search/torrent-search-modal"
import { useTorrentSmartSelectQueue } from "@/atoms/torrent/torrent-smart-select-queue.atoms"
import { SearchTorrentData } from "@/lib/download/types"
import { MediaDownloadInfo } from "@/lib/download/helpers"
import { BiCollection } from "@react-icons/all-files/bi/BiCollection"
import { FcFilmReel } from "@react-icons/all-files/fc/FcFilmReel"
import { BiX } from "@react-icons/all-files/bi/BiX"
import { AppLayoutStack } from "@/components/ui/app-layout"
import { DirectoryInput } from "@/components/shared/directory-input"
import path from "path"

interface TorrentListProps {
    children?: React.ReactNode
    entryAtom: Atom<LibraryEntry> | undefined
    media: AnilistDetailedMedia,
    onClose: () => void
    downloadInfo: MediaDownloadInfo
    episodeOffset: number
}

export const TorrentSearchTorrentList: React.FC<TorrentListProps> = (props) => {

    const { children, entryAtom, media, downloadInfo, episodeOffset, ...rest } = props

    const router = useRouter()
    const { settings } = useSettings()
    const torrentManager = useRef(TorrentManager(settings))

    const [isLoading, setIsLoading] = useState(false)

    const setSelectedTorrents = useSetAtom(__torrentSearch_selectedTorrentsAtom)
    const selectedTorrents = useAtomValue(__torrentSearch_sortedSelectedTorrentsAtom)
    const sharedPath = useStableSelectAtom(entryAtom, entry => entry.sharedPath)

    const [selectedDir, setSelectedDir] = useState<string | undefined>(sharedPath || (settings.library.localDirectory ? path.join(settings.library.localDirectory, sanitizeDirectoryName(media.title?.romaji || "")) : ""))

    const { addTorrentToQueue } = useTorrentSmartSelectQueue()

    const isFile = useCallback((parsed: ParsedTorrentInfo) => {
        return !!parsed.episode
    }, [])
    // 1. Torrent might be a batch
    // 2. Media finished airing and user has some episodes downloaded/watched
    const shouldAddToQueue = useCallback((torrent: SearchTorrentData) => {
        return (!torrent.parsed.episode && downloadInfo.canBatch && !downloadInfo.batch)
    }, [])

    const canDownloadUnwatched = useMemo(() => {
        return selectedTorrents?.every(torrent => shouldAddToQueue(torrent))
    }, [selectedTorrents])

    function sanitizeDirectoryName(input: string): string {
        const disallowedChars = /[<>:"/\\|?*\x00-\x1F]/g // Pattern for disallowed characters
        // Replace disallowed characters with an underscore
        const sanitized = input.replace(disallowedChars, " ")
        // Remove leading/trailing spaces and dots (periods) which are not allowed
        const trimmed = sanitized.trim().replace(/^\.+|\.+$/g, "").replace(/\s+/g, " ")
        // Ensure the directory name is not empty after sanitization
        return trimmed || "Untitled"
    }

    // If all selected torrents are batches, set destination to root folder
    useMount(() => {
        if (selectedTorrents?.every(torrent => !torrent.parsed.episode) && !sharedPath) {
            setSelectedDir(prev => settings.library.localDirectory)
        }
    })

    async function kickstartTorrentManager() {
        setIsLoading(true)
        await torrentManager.current.kickstart()
        await new Promise(acc => setTimeout(() => acc(""), 2000))
        setIsLoading(false)
    }

    const handleAddTorrents = useCallback(async (smartSelect: boolean = false) => {
        await kickstartTorrentManager()

        if (selectedDir && selectedTorrents) {

            const res = smartSelect
                ? await Promise.all(selectedTorrents.map(torrent => (
                    torrentManager.current.addMagnets({
                        magnets: [torrent.links.magnet],
                        savePath: selectedDir,
                        paused: shouldAddToQueue(torrent), // Pause if batch
                    })
                )))
                : await Promise.all(selectedTorrents.map(torrent => (
                    torrentManager.current.addMagnets({
                        magnets: [torrent.links.magnet],
                        savePath: selectedDir,
                        paused: false,
                    })
                )))

            if (smartSelect && res.every(r => r)) {

                // Add torrents to queue
                selectedTorrents.map(torrent => {
                    if (shouldAddToQueue(torrent)) {
                        addTorrentToQueue({
                            torrent,
                            downloadInfo,
                            episodeOffset,
                            media,
                        })
                    }
                })

            }

            if (res.every(r => r)) {
                setSelectedTorrents([])
                props.onClose()
                if (smartSelect) {
                    router.push(`/torrents/smart-select`)
                } else {
                    router.push(`/torrents`)
                }
            }
        }
    }, [selectedDir, selectedTorrents, episodeOffset])

    return <>
        <AppLayoutStack>
            <DirectoryInput
                value={selectedDir}
                onSelect={(dir) => setSelectedDir(dir)}
                prefix={settings.library.localDirectory}
            />
            <div className={"space-y-2"}>
                {selectedTorrents.map(torrent => (
                    <Tooltip
                        key={`${torrent.id}`}
                        trigger={<div
                            className={"ml-12 gap-2 p-2 border border-[--border] rounded-md hover:bg-gray-800 relative"}
                            key={torrent.name}
                        >
                            <div
                                className={"flex flex-none items-center gap-2 w-[90%] cursor-pointer"}
                                onClick={() => window.open("https://nyaa.si" + torrent.links.page.replace("#comments", ""), "_blank")}
                            >
                                <span className={"text-lg"}>
                                    {(isFile(torrent.parsed) || media.format === "MOVIE") ? <FcFilmReel/> :
                                        <FcFolder className={"text-2xl"}/>} {/*<BsCollectionPlayFill/>*/}
                                </span>
                                <p className={"truncate text-ellipsis"}>{torrent.name}</p>
                            </div>
                            <IconButton
                                icon={<BiX/>}
                                className={"absolute right-2 top-2 rounded-full"}
                                size={"xs"}
                                intent={"gray-outline"}
                                onClick={() => {
                                    setSelectedTorrents(prev => prev.filter(tr => tr.hash !== torrent.hash))
                                }}
                            />
                        </div>}>
                        Open on NYAA
                    </Tooltip>
                ))}
            </div>
            <div className={"mt-4 flex w-full justify-end gap-2"}>
                {(selectedTorrents.length > 0 && canDownloadUnwatched) && <Button
                    leftIcon={<BiCollection/>}
                    intent={"white-outline"}
                    onClick={() => handleAddTorrents(true)}
                    isDisabled={isLoading}
                >Download unwatched episodes</Button>}
                {selectedTorrents.length > 0 && <Button
                    leftIcon={<BiDownload/>}
                    intent={"white"}
                    onClick={() => handleAddTorrents()}
                    isDisabled={isLoading}
                >{canDownloadUnwatched ? "Download all" : "Download"}</Button>}
            </div>
        </AppLayoutStack>
    </>

}
