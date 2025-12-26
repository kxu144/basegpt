import { useEffect, useRef } from "react";

export function useScrollToBottom(messages) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (!ref.current || !messages.length) return;
    
    const scrollToBottom = () => {
      if (ref.current) {
        // Use scrollTop for immediate scroll (no animation delay)
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    };
    
    // Immediate scroll attempt
    scrollToBottom();
    
    // Use requestAnimationFrame for DOM updates
    requestAnimationFrame(() => {
      scrollToBottom();
      // Double RAF to catch batched updates
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
    
    // Multiple delayed attempts to catch async rendering (errors, long content, etc.)
    const timeouts = [
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 150),
      setTimeout(scrollToBottom, 300),
      setTimeout(scrollToBottom, 500),
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [messages.length, messages]);
  
  return ref;
}
