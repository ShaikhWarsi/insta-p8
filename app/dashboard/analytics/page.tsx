"use client"

import { Activity } from "lucide-react"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-700">
            <div className="w-20 h-20 rounded-2xl bg-accent-yellow/10 border border-accent-yellow/40 flex items-center justify-center mb-6">
                <Activity className="w-10 h-10 text-accent-yellow-foreground dark:text-accent-yellow" />
            </div>
            <h1 className="font-serif-display text-4xl text-foreground mb-2">Deep Analytics</h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                We're building a comprehensive analytics suite to help you track engagement, conversions, and automation performance.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-yellow/15 text-accent-yellow-foreground dark:text-accent-yellow text-xs font-bold uppercase tracking-widest border border-accent-yellow/40">
                Coming Soon
            </div>
        </div>
    )
}