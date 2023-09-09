import toast from "react-hot-toast"
import { cleanupFiles, scanLocalFiles } from "@/lib/local-library/repository"
import { logger } from "@/lib/helpers/debug"
import { useCallback, useState } from "react"
import { useAuthed } from "@/atoms/auth"
import { useCurrentUser } from "@/atoms/user"
import { useSetLocalFiles } from "@/atoms/library/local-file.atoms"
import { useSettings } from "@/atoms/settings"

type UseManageEntriesOptions = {
    onComplete: () => void
    preserveLockedFileStatus: boolean
    preserveIgnoredFileStatus: boolean
    lockedPaths: string[],
    ignoredPaths: string[],
}

export function useManageLibraryEntries(options: UseManageEntriesOptions) {

    const { token } = useAuthed()
    const { user } = useCurrentUser()
    const { settings } = useSettings()

    const { lockedPaths, ignoredPaths } = options

    const [isLoading, setIsLoading] = useState(false)

    // Atoms
    const setLocalFiles = useSetLocalFiles()

    const handleRefreshEntries = useCallback(async () => {
        if (user && token) {
            const tID = toast.loading("Loading")
            setIsLoading(true)

            const result = await scanLocalFiles(settings, user?.name, token, {
                locked: lockedPaths,
                ignored: ignoredPaths,
            })
            if (result && result.checkedFiles && !result.error) {
                const incomingFiles = result.checkedFiles

                /**
                 * Refresh the local files by adding scanned files and keeping locked/ignored files intact
                 */
                setLocalFiles(draft => {
                    logger("atom/library/handleStoreLocalFiles").info("Incoming files", incomingFiles.length)
                    const keptFiles = draft.filter(file => file.ignored || file.locked)
                    const keptFilesPaths = new Set<string>(keptFiles.map(file => file.path))
                    return [...keptFiles, ...incomingFiles.filter(file => !keptFilesPaths.has(file.path))]
                })

                toast.success("Your local library is up to date")
            } else if (result && result.error) {
                toast.error(result.error)
            }
            options.onComplete()
            toast.remove(tID)
            setIsLoading(false)
        }
    }, [user, token, settings, lockedPaths, ignoredPaths])


    const handleRescanEntries = useCallback(async () => {
        if (user && token) {
            const tID = toast.loading("Loading")
            setIsLoading(true)

            const result = await scanLocalFiles(settings, user?.name, token, {
                ignored: [],
                locked: [],
            })
            if (result && result.checkedFiles) {
                if (result.checkedFiles.length > 0) {

                    if (options.preserveLockedFileStatus || options.preserveIgnoredFileStatus) {
                        setLocalFiles(draft => {
                            const lockedPathsSet = new Set(draft.filter(file => !!file.locked).map(file => file.path))
                            const ignoredPathsSet = new Set(draft.filter(file => !!file.ignored).map(file => file.path))
                            const final = []
                            for (let i = 0; i < result.checkedFiles.length; i++) {
                                if (options.preserveLockedFileStatus && lockedPathsSet.has(result.checkedFiles[i].path)) { // Reset locked status
                                    result.checkedFiles[i].locked = true
                                }
                                if (options.preserveIgnoredFileStatus && ignoredPathsSet.has(result.checkedFiles[i].path)) { // Reset ignored status
                                    result.checkedFiles[i].ignored = true
                                }
                                final.push(result.checkedFiles[i])
                            }
                            return final
                        })
                    } else {
                        setLocalFiles(result.checkedFiles)
                    }
                }
                toast.success("Your local library is up to date")
            } else if (result.error) {
                toast.error(result.error)
            }
            options.onComplete
            toast.remove(tID)
            setIsLoading(false)
        }
    }, [user, token, settings, lockedPaths, ignoredPaths, options.preserveLockedFileStatus, options.preserveIgnoredFileStatus])


    const handleCleanRepository = useCallback(async () => {

        const { pathsToClean } = await cleanupFiles(settings, {
            ignored: lockedPaths,
            locked: ignoredPaths,
        })
        const pathsToCleanSet = new Set(pathsToClean)
        // Delete local files
        setLocalFiles(prev => {
            return prev.filter(file => !pathsToCleanSet.has(file.path))
        })

    }, [lockedPaths, ignoredPaths])

    return {
        handleRescanEntries,
        handleRefreshEntries,
        handleCleanRepository,
        isScanning: isLoading,
    }

}