"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
}

function useQuillAnimation(text: string, speed = 30) {
  const sessionKey = useMemo(() => `sorcer-quill-${text.replace(/\s/g, "-")}`, [text]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(sessionKey);
    if (seen) {
      setVisibleCount(text.length);
      setDone(true);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
        sessionStorage.setItem(sessionKey, "1");
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, sessionKey]);

  return { visibleCount, done };
}

export function PageHeader({ title, subtitle, backHref = "/" }: PageHeaderProps) {
  const router = useRouter();
  const { visibleCount, done } = useQuillAnimation(title);

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-2 text-xs font-sub text-oak/40">
        <Link href="/" className="hover:text-oak transition-colors">Sorcer</Link>
        <span>/</span>
        <span className="text-oak/60">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(backHref)}
          className="p-2 rounded-xl hover:bg-oak/5 text-oak/40 hover:text-oak transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-header text-oak tracking-wide relative">
            <span>{title.slice(0, visibleCount)}</span>
            {!done && (
              <motion.span
                className="inline-block ml-0.5 text-oak/40"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ✦
              </motion.span>
            )}
          </h1>
          {subtitle && (
            <motion.p
              className="text-sm font-sub text-oak-light/50 mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: done ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
