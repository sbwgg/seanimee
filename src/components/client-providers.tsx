"use client"
import React from "react"
import { UIProvider } from "@/components/ui/core"
import { createStore } from "jotai"
import { ThemeProvider } from "next-themes"
import { Provider as JotaiProvider } from "jotai/react"
import { QueryClient } from "@tanstack/query-core"
import { QueryClientProvider } from "@tanstack/react-query"
import { ToastProvider } from "@/components/ui/toast"
import { AniListGraphQLClientProvider } from "@/lib/anilist/provider"

interface ClientProvidersProps {
    children?: React.ReactNode
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            keepPreviousData: false,
            retry: 0,
        },
    },
})

export const ClientProviders: React.FC<ClientProvidersProps> = ({ children, ...rest }) => {
    const [store] = React.useState(createStore())

    return (
        <ThemeProvider attribute={"class"} defaultTheme={"dark"}>
            <JotaiProvider store={store}>
                <AniListGraphQLClientProvider>
                    <QueryClientProvider client={queryClient}>
                        <UIProvider config={{ locale: "en", countryLocale: "en-US", country: "US" }}>
                            {children}
                            <ToastProvider/>
                        </UIProvider>
                    </QueryClientProvider>
                </AniListGraphQLClientProvider>
            </JotaiProvider>
        </ThemeProvider>
    )

}
