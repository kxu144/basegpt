import { useEffect, useRef } from "react";

export function useScrollToBottom(dep) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [dep]);
  return ref;
}
