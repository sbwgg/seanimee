"use client"
import React, { Fragment, useState } from "react"
import { Combobox, Dialog, Transition } from "@headlessui/react"
import { cn } from "@/components/ui/core"
import { FiSearch } from "@react-icons/all-files/fi/FiSearch"
import { atom } from "jotai"
import { useAtom } from "jotai/react"
import { BiChevronRight } from "@react-icons/all-files/bi/BiChevronRight"
import { useDebounce } from "@/hooks/use-debounce"
import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAniListAsyncQuery } from "@/hooks/graphql-server-helpers"
import { SearchAnimeShortMediaDocument } from "@/gql/graphql"
import { useAuthed } from "@/atoms/auth"
import { useRouter } from "next/navigation"
import capitalize from "lodash/capitalize"

export const __globalSearch_isOpenAtom = atom(false)

interface GlobalSearchProps {
    children?: React.ReactNode
}

export const GlobalSearch: React.FC<GlobalSearchProps> = (props) => {

    const { children, ...rest } = props

    const [inputValue, setInputValue] = useState("")
    const query = useDebounce(inputValue, 500)

    const { token } = useAuthed()
    const router = useRouter()

    const [open, setOpen] = useAtom(__globalSearch_isOpenAtom)

    const { data: media, isLoading, isFetching, fetchStatus } = useQuery(
        ["global-search", query, query.length],
        async () => {
            const res = await useAniListAsyncQuery(SearchAnimeShortMediaDocument, {
                search: query,
                page: 1,
                perPage: 10,
                status: ["FINISHED", "CANCELLED", "NOT_YET_RELEASED", "RELEASING"],
                sort: "SEARCH_MATCH",
            }, token || "")
            return res.Page?.media?.filter(Boolean) ?? []
        },
        { enabled: query.length > 0, keepPreviousData: false, refetchOnWindowFocus: false, retry: 0 },
    )

    return (
        <>
            <Transition.Root show={open} as={Fragment} afterLeave={() => setInputValue("")} appear>
                <Dialog as="div" className="relative z-[99]" onClose={setOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity backdrop-blur-sm"/>
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className="mx-auto max-w-3xl transform overflow-hidden space-y-4 transition-all">
                                <Combobox
                                    // onChange={(person) => (window.location = person.profileUrl)}
                                >
                                    {({ activeOption }: any) => (
                                        <>
                                            <div
                                                className="relative bg-gray-900 shadow-2xl ring-1 ring-black ring-opacity-5 w-full rounded-lg ">
                                                <FiSearch
                                                    className="pointer-events-none absolute top-5 left-4 h-6 w-6 text-[--muted]"
                                                    aria-hidden="true"
                                                />
                                                <Combobox.Input
                                                    className="h-16 w-full border-0 bg-transparent pl-14 pr-4 text-white placeholder-[--muted] focus:ring-0 sm:text-md"
                                                    placeholder="Search..."
                                                    onChange={(event) => setInputValue(event.target.value)}
                                                />
                                                <Link href={"/discover/search"} onClick={() => setOpen(false)}>
                                                    <Button className={"absolute top-3 right-2 z-1"}
                                                            intent={"white-basic"}>
                                                        Advanced search
                                                    </Button>
                                                </Link>
                                            </div>

                                            {(!!media && media.length > 0) && (
                                                <Combobox.Options
                                                    as="div" static hold
                                                    className="flex divide-[--border] bg-gray-900 shadow-2xl ring-1 ring-black ring-opacity-5 rounded-lg border border-[--border]"
                                                >
                                                    <div
                                                        className={cn(
                                                            "max-h-96 min-w-0 flex-auto scroll-py-2 overflow-y-auto px-6 py-2 my-2",
                                                            { "sm:h-96": activeOption },
                                                        )}
                                                    >
                                                        <div className="-mx-2 text-sm text-[--text-color]">
                                                            {(media).map((item) => (
                                                                <Combobox.Option
                                                                    as="div"
                                                                    key={item.id}
                                                                    value={item}
                                                                    onClick={() => router.push(`/view/${item.id}`)}
                                                                    className={({ active }) =>
                                                                        cn(
                                                                            "flex select-none items-center rounded-md p-2 text-[--muted] cursor-pointer",
                                                                            active && "bg-gray-800 text-white",
                                                                        )
                                                                    }
                                                                >
                                                                    {({ active }) => (
                                                                        <>
                                                                            <div
                                                                                className="h-10 w-10 flex-none rounded-md object-cover object-center relative overflow-hidden">
                                                                                {item.coverImage?.medium && <Image
                                                                                    src={item.coverImage?.medium}
                                                                                    alt={""}
                                                                                    fill
                                                                                    quality={50}
                                                                                    priority
                                                                                    sizes="10rem"
                                                                                    className="object-cover object-center"
                                                                                />}
                                                                            </div>
                                                                            <span
                                                                                className="ml-3 flex-auto truncate">{item.title?.userPreferred}</span>
                                                                            {active && (
                                                                                <BiChevronRight
                                                                                    className="ml-3 h-7 w-7 flex-none text-gray-400"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {activeOption && (
                                                        <div
                                                            className="hidden min-h-96 w-1/2 flex-none flex-col overflow-y-auto sm:flex p-4">
                                                            <div className="flex-none p-6 text-center">
                                                                <div
                                                                    className="h-40 w-32 mx-auto flex-none rounded-md object-cover object-center relative overflow-hidden">
                                                                    {activeOption.coverImage?.large && <Image
                                                                        src={activeOption.coverImage?.large}
                                                                        alt={""}
                                                                        fill
                                                                        quality={100}
                                                                        priority
                                                                        sizes="10rem"
                                                                        className="object-cover object-center"
                                                                    />}
                                                                </div>
                                                                <h4 className="mt-3 font-semibold text-[--text-color] line-clamp-3">{activeOption.title?.userPreferred}</h4>
                                                                <p className="text-sm leading-6 text-[--muted]">
                                                                    {activeOption.format}{activeOption.season ? ` - ${capitalize(activeOption.season)} ` : " - "}{activeOption.startDate?.year
                                                                    ? new Intl.DateTimeFormat("en-US", { year: "numeric" })
                                                                        .format(new Date(activeOption.startDate?.year || 0, activeOption.startDate?.month || 0))
                                                                    : "-"}
                                                                </p>
                                                            </div>
                                                            <Link href={`/view/${activeOption.id}`}>
                                                                <Button
                                                                    type="button"
                                                                    className={"w-full"}
                                                                    intent={"white-subtle"}
                                                                >
                                                                    Open
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    )}
                                                </Combobox.Options>
                                            )}

                                            {(query !== "" && (!media || media.length === 0) && (isLoading || isFetching)) && (
                                                <LoadingSpinner/>
                                            )}

                                            {query !== "" && !isLoading && !isFetching && (!media || media.length === 0) && (
                                                <div className="py-14 px-6 text-center text-sm sm:px-14">
                                                    {<div
                                                        className="h-[10rem] w-[10rem] mx-auto flex-none rounded-md object-cover object-center relative overflow-hidden">
                                                        <Image
                                                            src={"/luffy-01.png"}
                                                            alt={""}
                                                            fill
                                                            quality={100}
                                                            priority
                                                            sizes="10rem"
                                                            className="object-contain object-top"
                                                        />
                                                    </div>}
                                                    <h5 className="mt-4 font-semibold text-[--text-color]">Nothing
                                                        found</h5>
                                                    <p className="mt-2 text-[--muted]">
                                                        We couldn't find anything with that name. Please try again.
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </Combobox>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>
        </>
    )

}
