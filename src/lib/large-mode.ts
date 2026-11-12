import { useCallback, useEffect, useState } from "react";

const KEY = "shifo:large-mode";

/** "Kattalashtirilgan rejim": bigger text and stronger contrast across the whole site, remembered in this browser. */
export function useLargeMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(window.localStorage.getItem(KEY) === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("large-mode", on);
  }, [on]);

  const toggle = useCallback(() => {
    setOn((v) => {
      window.localStorage.setItem(KEY, v ? "0" : "1");
      return !v;
    });
  }, []);

  return { on, toggle };
}
