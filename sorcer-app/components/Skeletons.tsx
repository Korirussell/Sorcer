"use client";

import { motion } from "framer-motion";

function Pulse({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-oak/8 ${className}`}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Pulse className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Pulse className="w-48 h-6" />
          <Pulse className="w-64 h-3" />
        </div>
      </div>

      {/* Map area */}
      <div className="specimen-card overflow-hidden">
        <Pulse className="w-full h-[400px] sm:h-[500px] rounded-none" />
      </div>

      {/* Legend */}
      <div className="specimen-card mt-5 p-4">
        <div className="flex justify-center gap-6">
          <Pulse className="w-28 h-4" />
          <Pulse className="w-28 h-4" />
          <Pulse className="w-28 h-4" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Pulse className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Pulse className="w-40 h-6" />
          <Pulse className="w-56 h-3" />
        </div>
        <Pulse className="w-12 h-12 rounded-2xl" />
      </div>

      {/* Score ring card */}
      <div className="specimen-card p-6 mb-6 flex items-center gap-6">
        <Pulse className="w-24 h-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Pulse className="w-40 h-5" />
          <Pulse className="w-full h-3" />
          <Pulse className="w-3/4 h-3" />
          <div className="flex gap-4 mt-2">
            <Pulse className="w-20 h-3" />
            <Pulse className="w-20 h-3" />
            <Pulse className="w-20 h-3" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        <Pulse className="w-20 h-9 rounded-xl" />
        <Pulse className="w-28 h-9 rounded-xl" />
        <Pulse className="w-24 h-9 rounded-xl" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="specimen-card p-4 space-y-2">
            <Pulse className="w-16 h-3" />
            <Pulse className="w-12 h-7" />
            <Pulse className="w-20 h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LedgerSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Pulse className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Pulse className="w-36 h-6" />
          <Pulse className="w-52 h-3" />
        </div>
      </div>

      {/* Hero stat */}
      <div className="specimen-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="space-y-2">
            <Pulse className="w-24 h-3" />
            <Pulse className="w-40 h-12" />
            <Pulse className="w-56 h-3" />
          </div>
          <div className="sm:ml-auto grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Pulse className="w-10 h-10 rounded-xl mx-auto" />
                <Pulse className="w-8 h-5 mx-auto" />
                <Pulse className="w-12 h-2 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="specimen-card p-5">
          <Pulse className="w-20 h-3 mb-3" />
          <Pulse className="w-full h-32" />
        </div>
        <div className="specimen-card p-5">
          <Pulse className="w-24 h-3 mb-3" />
          <Pulse className="w-full h-32" />
        </div>
      </div>

      {/* Receipt list */}
      <div className="specimen-card overflow-hidden">
        <div className="px-5 py-4 border-b border-oak/8 flex items-center gap-2">
          <Pulse className="w-4 h-4 rounded" />
          <Pulse className="w-28 h-4" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-oak/5 flex items-start gap-3">
            <Pulse className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="w-3/4 h-4" />
              <div className="flex gap-3">
                <Pulse className="w-20 h-2.5" />
                <Pulse className="w-16 h-2.5" />
                <Pulse className="w-12 h-2.5" />
              </div>
            </div>
            <Pulse className="w-16 h-4 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SchedulerSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Pulse className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Pulse className="w-32 h-6" />
          <Pulse className="w-52 h-3" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="specimen-card p-3 text-center space-y-2">
            <Pulse className="w-16 h-3 mx-auto" />
            <Pulse className="w-10 h-6 mx-auto" />
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="specimen-card p-5 mb-6 space-y-3">
        <Pulse className="w-40 h-4" />
        <Pulse className="w-full h-16 rounded-xl" />
        <div className="flex gap-2">
          <Pulse className="w-24 h-8 rounded-lg" />
          <Pulse className="w-20 h-8 rounded-lg" />
          <Pulse className="w-28 h-8 rounded-lg" />
        </div>
      </div>

      {/* Task list */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="specimen-card p-4 mb-2 flex items-start gap-3">
          <Pulse className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Pulse className="w-3/4 h-4" />
            <div className="flex gap-3">
              <Pulse className="w-16 h-2.5" />
              <Pulse className="w-20 h-2.5" />
            </div>
          </div>
          <Pulse className="w-14 h-3 shrink-0" />
        </div>
      ))}
    </div>
  );
}
