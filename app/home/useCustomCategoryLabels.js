"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  areCustomDictionariesEqual,
  createEmptyCategoryDictionary,
  readCustomCategoriesFromStorage,
} from "./homeCustomCategories";

export function useCustomCategoryLabels(storageKey) {
  const [labels, setLabels] = useState(() => createEmptyCategoryDictionary());
  const pathname = usePathname();

  const sync = useCallback(() => {
    const next = readCustomCategoriesFromStorage(storageKey);
    setLabels((prev) => (areCustomDictionariesEqual(prev, next) ? prev : next));
  }, [storageKey]);

  const handleRefresh = useCallback(() => {
    sync();
  }, [sync]);

  const handleVisibility = useCallback(() => {
    if (document.visibilityState === "visible") {
      handleRefresh();
    }
  }, [handleRefresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    handleRefresh();

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("miadmi:data-updated", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("miadmi:data-updated", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [handleRefresh, handleVisibility, pathname]);

  return labels;
}
