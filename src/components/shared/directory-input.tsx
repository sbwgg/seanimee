"use client"
import React, { startTransition, useCallback, useEffect, useRef, useState } from "react"
import { TextInput, TextInputProps } from "@/components/ui/text-input"
import { useDebounce } from "@/hooks/use-debounce"
import { useAsync } from "react-use"
import { getSafeFoldersFromDirectory } from "@/lib/helpers/directory"
import { FcOpenedFolder } from "@react-icons/all-files/fc/FcOpenedFolder"
import { BiCheck } from "@react-icons/all-files/bi/BiCheck"
import { BiFolderPlus } from "@react-icons/all-files/bi/BiFolderPlus"
import { BiX } from "@react-icons/all-files/bi/BiX"
import path from "path"
import { path_removeTopPath } from "@/lib/helpers/path"

export interface DirectoryInputProps {
    children?: React.ReactNode
    value: string | undefined
    onSelect: (value: string) => void
    prefix?: string
    directoryShouldExist?: boolean
    showFolderOptions?: boolean
}

export const DirectoryInput: React.FC<DirectoryInputProps & Omit<TextInputProps, "value" | "onChange" | "onSelect">> = React.forwardRef((props, ref) => {

    const { children, value, prefix, directoryShouldExist, onSelect, showFolderOptions = true, ...rest } = props

    const [inputValue, setInputValue] = useState((prefix && value) ? path_removeTopPath(value, prefix) || "" : (value || ""))
    const debouncedValue = useDebounce(inputValue, 1000)
    const valueRef = useRef(inputValue)

    const folders = useAsync(async () => {
        const val = prefix ? (path.join(prefix, debouncedValue)) : debouncedValue
        if (val.length > 0) {
            const res = await getSafeFoldersFromDirectory(val)
            return res
        } else {
            return { data: [], error: null }
        }
    }, [debouncedValue])

    const handleSelectDir = useCallback((input: string) => {
        let _path = prefix ? path_removeTopPath(input, prefix) : input
        _path = _path.startsWith(path.sep) ? _path.substring(1) : _path
        _path = _path.replaceAll(path.sep + path.sep, path.sep)
        // actions
        setInputValue(_path)
        onSelect(_path)
        valueRef.current = _path
    }, [prefix])

    useEffect(() => {
        if (folders.value) {
            if (directoryShouldExist && !folders.value.error) {
                onSelect(debouncedValue)
            } else if (!directoryShouldExist) {
                onSelect(debouncedValue)
            }
        }
    }, [debouncedValue, folders])

    async function checkDirectory() {
        const res = await getSafeFoldersFromDirectory(inputValue)
        if (!!res.error) setInputValue(valueRef.current)
    }


    return (
        <div className={"space-y-1"}>
            <TextInput
                leftIcon={<FcOpenedFolder className={"text-2xl"}/>}
                leftAddon={prefix ? prefix : undefined}
                value={inputValue}
                rightIcon={!folders.value?.error ? <BiCheck className={"text-green-500"}/> : directoryShouldExist ?
                    <BiX className={"text-red-500"}/> : <BiFolderPlus/>}
                {...rest}
                onChange={e => {
                    setInputValue(e.target.value)
                }}
                onBlur={() => {
                    startTransition(() => {
                        if (inputValue.length === 0) {
                            setTimeout(() => {
                                setInputValue(valueRef.current)
                            }, 500)
                        }
                        if (directoryShouldExist) {
                            setTimeout(() => {
                                checkDirectory()
                            }, 200)
                        }
                    })
                }}
            />
            {!!(folders.value?.data.length && folders.value?.data.length > 0 && showFolderOptions) &&
                <div
                    className={"w-full flex flex-none flex-nowrap overflow-x-auto gap-2 items-center bg-gray-800 rounded-md p-1 px-4"}>
                    <div>Sub-folders:</div>
                    {folders.value?.data.map(folder => (
                        <div
                            key={folder.name}
                            className={"py-1 text-sm px-3 rounded-md border border-[--border] flex-none cursor-pointer bg-gray-900 hover:bg-gray-800"}
                            onClick={() => handleSelectDir(folder.path)}
                        >
                            {folder.name}
                        </div>
                    ))}
                </div>}
        </div>
    )

})
