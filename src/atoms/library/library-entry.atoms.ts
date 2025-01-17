import { useAtom, useAtomValue } from "jotai/react"
import { useMemo } from "react"
import { logger } from "@/lib/helpers/debug"
import { splitAtom } from "jotai/utils"
import { localFilesAtom } from "@/atoms/library/local-file.atoms"
import { Atom, atom } from "jotai"
import { AnilistShowcaseMedia } from "@/lib/anilist/fragment"
import { useSelectAtom } from "@/atoms/helpers"
import { allUserMediaAtom } from "@/atoms/anilist/media.atoms"
import orderBy from "lodash/orderBy"
import { anilistCollectionEntriesAtom, AnilistCollectionEntry } from "@/atoms/anilist/entries.atoms"
import { path_getDirectoryName } from "@/lib/helpers/path"
import { LocalFile } from "@/lib/local-library/types"

/* -------------------------------------------------------------------------------------------------
 * LibraryEntry
 * - Derived from `allUserMediaAtom` and `localFilesAtom`
 * -----------------------------------------------------------------------------------------------*/

export type LibraryEntry = {
    id: number // Media ID
    media: AnilistShowcaseMedia
    files: LocalFile[]
    collectionEntry: AnilistCollectionEntry
    sharedPath: string
}
export const libraryEntriesAtom = atom(get => {
    logger("atom/libraryEntriesAtom").warning("Derived")
    // Get all `mediaId`s
    const mediaIds = new Set(get(allUserMediaAtom).map(media => media?.id).filter(Boolean))
    // For each mediaId, create a new [LibraryEntry] from the existing [LocalFile]s
    return [...mediaIds].map(mediaId => {
        const firstFile = get(localFilesAtom).find(file => file.mediaId === mediaId)
        if (firstFile) {
            // Entry
            return {
                id: mediaId,
                media: get(allUserMediaAtom).filter(Boolean).find(media => media.id === mediaId)!,
                files: get(localFilesAtom).filter(file => file.mediaId === mediaId),
                collectionEntry: get(anilistCollectionEntriesAtom).find(entry => entry?.media?.id === mediaId),
                sharedPath: path_getDirectoryName(firstFile.path),
            } satisfies LibraryEntry
        }
    }).filter(Boolean).filter(entry => entry.files.length > 0) as LibraryEntry[]
})

/* -------------------------------------------------------------------------------------------------
 * Read
 * -----------------------------------------------------------------------------------------------*/

const sortedLibraryEntriesAtom = atom(get => {
    return orderBy(get(libraryEntriesAtom), [
        n => n.collectionEntry?.status === "CURRENT",
        n => n.collectionEntry?.status === "PAUSED",
        n => n.collectionEntry?.status === "PLANNING",
        n => n.media.title?.userPreferred,
    ], ["desc", "desc", "desc", "asc"])
})
export const libraryEntryAtoms = splitAtom(sortedLibraryEntriesAtom, entry => entry.id)

export const currentlyWatching_libraryEntryAtoms = splitAtom(atom(get => {
    return orderBy(get(libraryEntriesAtom).filter(n => n.collectionEntry?.status === "CURRENT"), [
            n => n.collectionEntry?.startedAt,
        ], ["asc"])
    },
), entry => entry.id)


export const completed_libraryEntryAtoms = splitAtom(atom(get => {
        return get(sortedLibraryEntriesAtom).filter(n => n.collectionEntry?.status === "COMPLETED")
    },
), entry => entry.id)

export const rest_libraryEntryAtoms = splitAtom(atom(get => {
        return get(sortedLibraryEntriesAtom).filter(n => n.collectionEntry?.status !== "CURRENT" && n.collectionEntry?.status !== "COMPLETED")
    },
), entry => entry.id)


/**
 * @example
 * const getLastFile = useSetAtom(getLibraryEntryAtomsByMediaIdAtom)
 * const latestFile = getLastFile(21)
 */
export const getLibraryEntryAtomsByMediaIdAtom = atom(null,
    (get, set, mediaId: number) => get(libraryEntryAtoms).find((fileAtom) => get(fileAtom).id === mediaId),
)

/**
 * @description
 * Useful for mapping over [LibraryEntry]s
 * /!\ Do not use to get nested information like `media`
 * /!\ Only re-renders when file count changes
 *      Why? Because a [LibraryEntry] depends only on available files
 *
 * @example Parent
 * const libraryEntryAtoms = useLocalFileAtomsByMediaId(21)
 *  ...
 * libraryEntryAtoms.map(entryAtom => <Child key={`${entryAtom}`} entryAtom={entryAtom}/>
 *
 * @example Children
 * const entry = useAtomValue(entryAtom)
 */
export const useLibraryEntryAtomByMediaId = (mediaId: number) => {
    // Refresh atom when its file count changes
    const fileCount = useSelectAtom(localFilesAtom, files => files.filter(file => file.mediaId === mediaId).filter(Boolean).map(file => file.path).length)
    const [, get] = useAtom(getLibraryEntryAtomsByMediaIdAtom)
    return useMemo(() => get(mediaId), [fileCount]) as Atom<LibraryEntry> | undefined
}

/**
 * @description Used in local library to display anime list
 */
export const useLibraryEntryAtoms = () => {
    // Refresh entry atom list when number of entries changes
    const entryCount = useSelectAtom(libraryEntriesAtom, entries => entries.flatMap(entry => entry.id))
    const value = useAtomValue(libraryEntryAtoms)
    return useMemo(() => value, [entryCount]) as Array<Atom<LibraryEntry>>
}
