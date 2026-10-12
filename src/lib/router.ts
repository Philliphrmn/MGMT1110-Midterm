import { useEffect, useState } from "react";

function current(): string[] {
  return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

/** Minimal hash router: "#/study/3" -> ["study", "3"]. */
export function useRoute(): string[] {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function go(path: string) {
  window.location.hash = path.startsWith("/") ? path : `/${path}`;
}
