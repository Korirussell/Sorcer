"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RealmMap } from "@/components/RealmMapSimple";
import { MapSkeleton } from "@/components/Skeletons";

export default function MapPage() {
  return (
    <div className="min-h-screen py-6 px-4 sm:px-8 max-w-6xl mx-auto">
      <PageHeader title="The Realms of Digital Power" subtitle="A cartograph of the great data sanctuaries" />
      <Suspense fallback={<MapSkeleton />}>
        <RealmMap />
      </Suspense>
    </div>
  );
}
