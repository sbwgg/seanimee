"use server"
import { AnilistShortMedia, AnilistShowcaseMedia } from "@/lib/anilist/fragment"
import { ordinalize } from "inflection"
import { similarity } from "@/lib/string-similarity"
import { logger } from "@/lib/helpers/debug"
import { ScanLogging } from "@/lib/local-library/logs"
import isNumber from "lodash/isNumber"
import sortBy from "lodash/sortBy"
import { advancedSearchWithMAL } from "@/lib/mal/actions"
import { AnimeFileInfo, LocalFile } from "@/lib/local-library/types"
import { eliminateLeastSimilarValue, valueContainsSeason } from "@/lib/local-library/utils/filtering.utils"
import { matching_compareTitleVariationsToMedia } from "@/lib/local-library/utils/matching.utils"
import { toRomanNumber } from "@/lib/local-library/utils/common.utils"

/**
 * This method employs 3 comparison algorithms: Dice's coefficient (string-similarity), Levenshtein's algorithm, and MAL's elastic search algorithm
 */
export async function findBestCorrespondingMedia(
    {
        file,
        allMedia,
        mediaTitles,
        _matchingCache,
        _scanLogging,
    }: {
        file: LocalFile,
        allMedia: AnilistShortMedia[],
        mediaTitles: {
            eng: string[],
            rom: string[],
            preferred: string[],
            synonymsWithSeason: string[]
        },
        _matchingCache: Map<string, AnilistShowcaseMedia | undefined>,
        _scanLogging: ScanLogging
    },
) {

    // function debug(...value: any[]) {
    //     // if (parsed.original.toLowerCase().includes("(not)")) console.log(...value)
    // }

    _scanLogging.add(file.path, ">>> [media-matching/findBestCorrespondingMedia]")
    _scanLogging.add(file.path, "Creating title variations")

    const parsedFolderInfo = file.parsedFolderInfo
    const parsed = file.parsedInfo!

    let folderParsed: AnimeFileInfo | undefined
    let rootFolderParsed: AnimeFileInfo | undefined

    if (parsedFolderInfo.length > 0) {
        folderParsed = parsedFolderInfo[parsedFolderInfo.length - 1]
        rootFolderParsed = parsedFolderInfo[parsedFolderInfo.length - 2]
        // console.log(rootFolderParsed)
    }

    /* Get constants */

    const mediaEngTitles = mediaTitles.eng.map(value => value.toLowerCase())
    const mediaRomTitles = mediaTitles.rom.map(value => value.toLowerCase())
    const mediaPreferredTitles = mediaTitles.preferred.map(value => value.toLowerCase())
    const mediaSynonymsWithSeason = mediaTitles.synonymsWithSeason.map(value => value.toLowerCase())

    const episodeAsNumber = (parsed.episode && isNumber(parseInt(parsed.episode)))
        ? parseInt(parsed.episode)
        : undefined
    const folderSeasonAsNumber = (folderParsed?.season && isNumber(parseInt(folderParsed.season)))
        ? parseInt(folderParsed.season)
        : undefined
    const seasonAsNumber = (parsed.season && isNumber(parseInt(parsed.season)))
        ? parseInt(parsed.season)
        : undefined
    const courAsNumber = (folderParsed?.cour && isNumber(parseInt(folderParsed.cour)))
        ? parseInt(folderParsed.cour)
        : (parsed.cour && isNumber(parseInt(parsed.cour))) ? parseInt(parsed.cour) : undefined
    const partAsNumber = (folderParsed?.part && isNumber(parseInt(folderParsed.part)))
        ? parseInt(folderParsed.part)
        : (parsed.part && isNumber(parseInt(parsed.part))) ? parseInt(parsed.part) : undefined

    /* Get all variations of title */

    // Get the parent folder title or root folder title
    const _folderTitle = (folderParsed?.title && folderParsed.title.length > 0)
        ? folderParsed.title
        : (rootFolderParsed?.title && rootFolderParsed.title.length > 0)
            ? rootFolderParsed.title
            : undefined

    // Get the title from the folders first
    const _title = _folderTitle || parsed.title

    const bothTitles = !!parsed.title && !!_folderTitle
    const noSeasonsOrParts = !seasonAsNumber && !folderSeasonAsNumber && !courAsNumber && !partAsNumber
    const bothTitlesAreSimilar = bothTitles && _folderTitle!.toLowerCase().includes(parsed.title!.toLowerCase())
    const eitherSeasonExists = !!seasonAsNumber || !!folderSeasonAsNumber
    const eitherSeasonIsFirst = (!!seasonAsNumber && seasonAsNumber <= 1) || (!!folderSeasonAsNumber && folderSeasonAsNumber <= 1)

    let _titleVariations: (string | undefined)[] = []

    if (!!courAsNumber) {
        [_folderTitle, parsed.title].filter(Boolean).map(value => {
            _titleVariations.push(`${value} Part ${courAsNumber}`) // Title Part 2
            _titleVariations.push(`${value} Part ${toRomanNumber(courAsNumber)}`) // Title Part II
            _titleVariations.push(`${value} Cour ${courAsNumber}`) // Title Cour 2
            _titleVariations.push(`${value} Cour ${toRomanNumber(courAsNumber)}`) // Title Cour II
        })
    }
    if (!!partAsNumber) {
        [_folderTitle, parsed.title].filter(Boolean).map(value => {
            _titleVariations.push(`${value} Part ${partAsNumber}`) // Title Part 2
            _titleVariations.push(`${value} Part ${toRomanNumber(partAsNumber)}`) // Title Part II
            _titleVariations.push(`${value} Cour ${partAsNumber}`) // Title Cour 2
            _titleVariations.push(`${value} Cour ${toRomanNumber(partAsNumber)}`) // Title Cour II
        })
    }
    if (noSeasonsOrParts || eitherSeasonIsFirst) {
        _titleVariations.push(_folderTitle) // Title
        _titleVariations.push(parsed.title) // Title
    }
    if (!!partAsNumber && eitherSeasonExists) {
        [_folderTitle, parsed.title].filter(Boolean).map(value => {
            _titleVariations.push(`${value} Season ${seasonAsNumber || folderSeasonAsNumber} Part ${partAsNumber}`) // Title Season 1 Part 2
            _titleVariations.push(`${value} Season ${seasonAsNumber || folderSeasonAsNumber} Cour ${partAsNumber}`) // Title Season 1 Cour 2
        })
    }
    if (eitherSeasonExists) {
        [
            (bothTitlesAreSimilar ? _folderTitle : undefined), // Both titles are the same
            ...(bothTitles && !bothTitlesAreSimilar ? [_folderTitle, parsed.title, `${_folderTitle} ${parsed.title}`] : []), // Both titles are different
            (!!_folderTitle && !parsed.title ? _folderTitle : undefined), // One title but not the other
            (!_folderTitle && !!parsed.title ? parsed.title : undefined), // One title but not the other
        ].filter(Boolean).map(value => {
            _titleVariations.push(`${value} Season ${seasonAsNumber || folderSeasonAsNumber}`) // Title Season 2
            _titleVariations.push(`${value} S${seasonAsNumber || folderSeasonAsNumber}`) // Title S2
            _titleVariations.push(`${value} ${ordinalize(String(seasonAsNumber || folderSeasonAsNumber))} Season`) // Title 2nd Season
        })
    }

    // Remove duplicates and convert to lowercase
    let titleVariations: string[] = [...(new Set(_titleVariations.filter(Boolean).map(value => value.toLowerCase())))]

    _scanLogging.add(file.path, "Title variations")
    _scanLogging.add(file.path, "   -> " + JSON.stringify(titleVariations))

    // Check if titleVariations are already cached
    if (_matchingCache.has(JSON.stringify(titleVariations))) {
        logger("media-matching").success(file.path)
        logger("media-matching").success("   -> Cache HIT:", _matchingCache.get(JSON.stringify(titleVariations))?.title?.english)
        _scanLogging.add(file.path, `Cache HIT - File with same title variations found`)
        _scanLogging.add(file.path, `   -> Media ID = ${_matchingCache.get(JSON.stringify(titleVariations))?.id}`)
        return {
            correspondingMedia: _matchingCache.get(JSON.stringify(titleVariations)),
        }
    } else {
        _scanLogging.add(file.path, `Cache MISS - No file with same title variations found`)
    }

    /* Using string-similarity */
    _scanLogging.add(file.path, "Title matching using string-similarity")

    // Calculate similarity using string-similarity library
    // This section calculates the similarity of the title variations with media titles
    let similarTitleMatching = titleVariations.map((tValue) => {
        // Calculate best match for English titles, Romaji titles, preferred titles, and season titles
        const engResult = similarity.findBestMatch(tValue, mediaEngTitles)
        const romResult = similarity.findBestMatch(tValue, mediaRomTitles)
        const preferredResult = similarity.findBestMatch(tValue, mediaPreferredTitles)
        const seasonResult = similarity.findBestMatch(tValue, mediaSynonymsWithSeason)
        // Choose the best match out of the calculated results
        const bestResult = [engResult, romResult, preferredResult, seasonResult].reduce((prev, curr) => {
            return prev.bestMatch.rating >= curr.bestMatch.rating ? prev : curr // Higher rating
        })
        return { titleValue: tValue, bestResult }
    }) ?? []
    similarTitleMatching = sortBy(similarTitleMatching, n => n.bestResult.bestMatch.rating).reverse()

    const bestTitle = similarTitleMatching?.[0]?.bestResult

    let correspondingMediaUsingSimilarity = (bestTitle) ? allMedia.find(media => {
        return media.title?.userPreferred?.toLowerCase() === bestTitle.bestMatch.target.toLowerCase()
            || media.title?.english?.toLowerCase() === bestTitle.bestMatch.target.toLowerCase()
            || media.title?.romaji?.toLowerCase() === bestTitle.bestMatch.target.toLowerCase()
            || !!media.synonyms?.filter(Boolean).find(synonym => synonym.toLowerCase() === bestTitle.bestMatch.target.toLowerCase())
    }) : undefined

    _scanLogging.add(file.path, "   -> Result = " + JSON.stringify(correspondingMediaUsingSimilarity?.title))
    _scanLogging.add(file.path, "   -> Rating = " + bestTitle?.bestMatch.rating)

    if (correspondingMediaUsingSimilarity) { // Unnecessary?
        delete correspondingMediaUsingSimilarity?.relations
    }

    /**
     * Using levenshtein
     */

    let correspondingMediaFromDistance: AnilistShortMedia | undefined

    _scanLogging.add(file.path, "Title matching using levenshtein")

    // Calculate Levenshtein distances and find the lowest for all title variations
    const distances = allMedia.flatMap(media => {
        return matching_compareTitleVariationsToMedia(media, titleVariations)
    })
    if (distances) {
        const lowest = distances.reduce((prev, curr) => prev.distance <= curr.distance ? prev : curr) // Lower distance
        correspondingMediaFromDistance = lowest.media // Find the corresponding media from the title with the lower distance
        _scanLogging.add(file.path, "   -> Result = " + JSON.stringify(correspondingMediaFromDistance?.title))
        _scanLogging.add(file.path, "   -> Distance = " + lowest.distance)
    } else {
        _scanLogging.add(file.path, `   -> Could not calculate distances`)
    }


    /* Using MAL */

    let correspondingMediaFromMAL: AnilistShowcaseMedia | undefined

    _scanLogging.add(file.path, "Title matching using MAL")
    try {
        if (_title) {
            const anime = await advancedSearchWithMAL(titleVariations[0])
            const correspondingInUserList = allMedia.find(media => media.idMal === anime?.id)
            _scanLogging.add(file.path, `   -> Title used for search = ` + JSON.stringify(titleVariations[0]))
            if (anime && !!correspondingInUserList) {
                correspondingMediaFromMAL = correspondingInUserList
                _scanLogging.add(file.path, "   -> Result = " + JSON.stringify(correspondingMediaFromMAL.title))
            } else if (anime) {
                _scanLogging.add(file.path, "   -> warning - Could not find the MAL media in user anime list")
                _scanLogging.add(file.path, "   -> Result = " + JSON.stringify(anime))
            } else {
                _scanLogging.add(file.path, "   -> error - Could not find a media")
            }
        }
    } catch {
        _scanLogging.add(file.path, "   -> error - Could not access MAL")
    }

    // Create an array of different media sources for comparison
    let differentFoundMedia = [correspondingMediaFromMAL, correspondingMediaUsingSimilarity, correspondingMediaFromDistance].filter(Boolean)

    // debug("------------------------------------------------------")
    // debug(titleVariations)
    // debug(differentFoundMedia.map(n => n.title?.userPreferred?.toLowerCase()).filter(Boolean))
    // debug(differentFoundMedia.map(n => n.title?.english?.toLowerCase()).filter(Boolean))
    // debug(differentFoundMedia.map(n => n.title?.romaji?.toLowerCase()).filter(Boolean))
    // debug("------------------------------------------------------")

    _scanLogging.add(file.path, "Eliminating the least similar candidate title using string-similarity")

    // Eliminate duplicate and least similar elements from each langages
    const best_userPreferred = eliminateLeastSimilarValue(differentFoundMedia.map(n => n.title?.userPreferred?.toLowerCase()).filter(Boolean))
    const best_english = eliminateLeastSimilarValue(differentFoundMedia.map(n => n.title?.english?.toLowerCase()).filter(Boolean))
    const best_romaji = eliminateLeastSimilarValue(differentFoundMedia.map(n => n.title?.romaji?.toLowerCase()).filter(Boolean))
    const best_syn = eliminateLeastSimilarValue(differentFoundMedia.flatMap(n => n.synonyms?.filter(Boolean).filter(syn => valueContainsSeason(syn.toLowerCase()))).map(n => n?.toLowerCase()).filter(Boolean))
    // debug(best_userPreferred, "preferred")// debug(best_english, "english")// debug(best_romaji, "romaji")// debug(best_syn, "season synonym")

    _scanLogging.add(file.path, "   -> Remaining candidate titles from 'userPreferred' = " + JSON.stringify(best_userPreferred))
    _scanLogging.add(file.path, "   -> Remaining candidate titles from 'english' = " + JSON.stringify(best_english))
    _scanLogging.add(file.path, "   -> Remaining candidate titles from 'romaji' = " + JSON.stringify(best_romaji))
    _scanLogging.add(file.path, "   -> Remaining candidate titles from 'synonyms' = " + JSON.stringify(best_syn))

    _scanLogging.add(file.path, "Comparing remaining candidate titles with title variations using string-similarity")
    // Compare each title variation with the best titles from different sources
    let bestTitleComparisons = titleVariations.filter(Boolean).map(title => {
        const matchingUserPreferred = best_userPreferred.length > 0 ? similarity.findBestMatch(title.toLowerCase(), best_userPreferred) : undefined
        const matchingEnglish = best_english.length > 0 ? similarity.findBestMatch(title.toLowerCase(), best_english) : undefined
        const matchingRomaji = best_romaji.length > 0 ? similarity.findBestMatch(title.toLowerCase(), best_romaji) : undefined
        const matchingSyn = best_syn.length > 0 ? similarity.findBestMatch(title.toLowerCase(), best_syn) : undefined

        if ([matchingUserPreferred, matchingEnglish, matchingRomaji, matchingSyn].filter(Boolean).length === 0) return undefined
        // Return the best match from all comparisons
        return [matchingUserPreferred, matchingEnglish, matchingRomaji, matchingSyn].filter(Boolean).reduce((prev, val) => {
            return val.bestMatch.rating >= prev.bestMatch.rating ? val : prev
        })
    }).filter(Boolean)

    // Determine the best title among the comparisons
    let bestTitleMatching = bestTitleComparisons.length > 0 ? bestTitleComparisons.reduce((prev, val) => {
        return val.bestMatch.rating >= prev.bestMatch.rating ? val : prev
    }) : undefined
    _scanLogging.add(file.path, "   -> Result = " + JSON.stringify(bestTitleMatching?.bestMatch?.target))
    _scanLogging.add(file.path, "   -> Rating = " + JSON.stringify(bestTitleMatching?.bestMatch?.rating))

    // Initialize variables to store the final rating and corresponding media
    let rating: number = 0
    let bestMedia: AnilistShowcaseMedia | undefined

    _scanLogging.add(file.path, `Retrieving media using ` + JSON.stringify(bestTitleMatching!.bestMatch.target))

    if (bestTitleMatching) {
        // Find the media with matching title
        bestMedia = allMedia.find(media => {
            if (media.title?.userPreferred?.toLowerCase() === bestTitleMatching!.bestMatch.target.toLowerCase()
                || media.title?.english?.toLowerCase() === bestTitleMatching!.bestMatch.target.toLowerCase()
                || media.title?.romaji?.toLowerCase() === bestTitleMatching!.bestMatch.target.toLowerCase()
                || !!media.synonyms?.filter(Boolean)?.some(synonym => synonym.toLowerCase() === bestTitleMatching!.bestMatch.target.toLowerCase())
            ) {
                rating = bestTitleMatching!.bestMatch.rating
                return true
            } else {
                return false
            }
        })
    }
    // debug(bestTitleMatching?.bestMatch, "best", bestMedia)

    logger("media-matching").warning(file.path)
    logger("media-matching").warning("   -> Cache MISS:", bestMedia?.title?.english, "| [Rating]", rating)
    // Adding it to the cache
    _matchingCache.set(JSON.stringify(titleVariations), bestMedia)

    if (+rating < 0.5) {
        logger("media-matching").error("   -> Unmatching, rating is below the threshold (0.5)")
        _scanLogging.add(file.path, "warning - Rating is below the threshold (0.5)")
        _scanLogging.add(file.path, `   -> Rating = ${rating}`)
        _scanLogging.add(file.path, "   -> File was not matched")
    } else {
        _scanLogging.add(file.path, `Match found using ` + JSON.stringify(bestTitleMatching!.bestMatch.target))
        _scanLogging.add(file.path, `   -> Media ID = ` + bestMedia?.id)
        _scanLogging.add(file.path, `   -> ` + JSON.stringify(bestMedia?.title))
        _scanLogging.add(file.path, `   -> Rating = ${rating}`)
    }

    return {
        correspondingMedia: +rating >= 0.5 ? bestMedia : undefined,
    }
}
