// MessageInput.jsx
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { API_BASE, authenticatedFetch } from "../../utils/api";

const MessageInput = forwardRef(function MessageInput({ value, onChange, onSend, sending, isNewConv, onKeyDown, error, entities, onEntitiesChange }, ref) {
  const textareaRef = useRef(null);
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [autocompleteMatches, setAutocompleteMatches] = useState([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const [autocompleteStart, setAutocompleteStart] = useState(null);

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/keys`, { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        setKeys(Array.isArray(data) ? data.map(k => k.key) : []);
      }
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useImperativeHandle(ref, () => ({ refreshKeys: fetchKeys }));
  useEffect(() => { fetchKeys(); }, []);

  useEffect(() => {
    if (!value || !keys.length) {
      setAutocompleteMatches([]);
      setAutocompleteStart(null);
      return;
    }

    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    const entityEndingAtCursor = (entities || []).find(ent => ent.end === cursorPos);
    
    let currentWord, start;
    
    if (entityEndingAtCursor) {
      const textAfterCursor = value.substring(cursorPos);
      const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
      if (wordMatchAfterCursor) {
        currentWord = wordMatchAfterCursor[1];
        start = cursorPos;
      } else {
        setAutocompleteMatches([]);
        setAutocompleteStart(null);
        return;
      }
    } else {
      const entitiesEndingBeforeCursor = (entities || []).filter(ent => ent.end < cursorPos).sort((a, b) => b.end - a.end);
      const lastEntityEndingBeforeCursor = entitiesEndingBeforeCursor[0];
      
      if (lastEntityEndingBeforeCursor) {
        const textAfterLastEntity = value.substring(lastEntityEndingBeforeCursor.end, cursorPos);
        const wordMatchAfter = textAfterLastEntity.match(/([A-Za-z0-9_]+)/);
        if (wordMatchAfter) {
          currentWord = wordMatchAfter[1];
          start = lastEntityEndingBeforeCursor.end + wordMatchAfter.index;
        } else {
          const textAfterCursor = value.substring(cursorPos);
          const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
          if (wordMatchAfterCursor) {
            currentWord = wordMatchAfterCursor[1];
            start = cursorPos;
          } else {
            setAutocompleteMatches([]);
            setAutocompleteStart(null);
            return;
          }
        }
      } else {
        const keyPatternMatch = textBeforeCursor.match(/([A-Za-z0-9_]+)$/);
        if (!keyPatternMatch) {
          setAutocompleteMatches([]);
          setAutocompleteStart(null);
          return;
        }

        currentWord = keyPatternMatch[1];
        start = cursorPos - currentWord.length;
        
        const entityMatchingWord = (entities || []).find(ent => {
          return ent.start === start && ent.end === cursorPos && ent.id === currentWord;
        });
        
        if (entityMatchingWord) {
          const textAfterCursor = value.substring(cursorPos);
          const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
          if (wordMatchAfterCursor) {
            currentWord = wordMatchAfterCursor[1];
            start = cursorPos;
          } else {
            setAutocompleteMatches([]);
            setAutocompleteStart(null);
            return;
          }
        } else {
          const entityInWord = (entities || []).find(ent => {
            return ent.start < cursorPos && ent.end > start;
          });
          
          if (entityInWord && entityInWord.end < cursorPos) {
            const textAfterEntity = textBeforeCursor.substring(entityInWord.end);
            const wordMatchAfterEntity = textAfterEntity.match(/^([A-Za-z0-9_]+)/);
            if (wordMatchAfterEntity) {
              currentWord = wordMatchAfterEntity[1];
              start = entityInWord.end;
            } else {
              setAutocompleteMatches([]);
              setAutocompleteStart(null);
              return;
            }
          } else if (entityInWord && entityInWord.end === cursorPos) {
            const textAfterCursor = value.substring(cursorPos);
            const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
            if (wordMatchAfterCursor) {
              currentWord = wordMatchAfterCursor[1];
              start = cursorPos;
            } else {
              setAutocompleteMatches([]);
              setAutocompleteStart(null);
              return;
            }
          }
        }
      }
    }
    
    if (!currentWord) {
      setAutocompleteMatches([]);
      setAutocompleteStart(null);
      return;
    }

    const end = cursorPos;
    
    const wordIsEntityEndingAtCursor = (entities || []).some(ent => {
      return ent.start === start && ent.end === cursorPos && ent.id === currentWord;
    });
    
    const cursorInEntity = (entities || []).some(ent => {
      return cursorPos > ent.start && cursorPos < ent.end;
    });
    
    const wordCompletelyInEntity = !wordIsEntityEndingAtCursor && (entities || []).some(ent => {
      return start >= ent.start && end <= ent.end;
    });
    
    if (cursorInEntity || wordCompletelyInEntity) {
      setAutocompleteMatches([]);
      setAutocompleteStart(null);
      return;
    }

    let matches = [];
    let prefix = currentWord;
    
    matches = keys.filter(key => key.startsWith(prefix)).sort();
    
    if (matches.length === 0 && currentWord.length > 1) {
      const lastChar = currentWord[currentWord.length - 1];
      const lastCharMatches = keys.filter(key => key.startsWith(lastChar)).sort();
      if (lastCharMatches.length > 0) {
        matches = lastCharMatches;
        prefix = lastChar;
      }
    }
    
    if (matches.length === 0) {
      prefix = currentWord;
      while (prefix.length > 0 && matches.length === 0) {
        matches = keys.filter(key => key.startsWith(prefix)).sort();
        if (matches.length === 0) {
          prefix = prefix.slice(0, -1);
        }
      }
    }
    
    if (matches.length > 0) {
      setAutocompleteMatches(matches);
      setAutocompleteStart(start);
      setSelectedMatchIndex(0);
    } else {
      setAutocompleteMatches([]);
      setAutocompleteStart(null);
    }
  }, [value, keys, entities]);

  const prevValueRef = useRef(value);
  const prevCursorRef = useRef(0);
  const skipEntityTrackingRef = useRef(false);

  useEffect(() => {
    if (skipEntityTrackingRef.current) {
      skipEntityTrackingRef.current = false;
      return;
    }

    if (!entities || entities.length === 0) {
      prevValueRef.current = value;
      if (textareaRef.current) prevCursorRef.current = textareaRef.current.selectionStart || 0;
      return;
    }

    if (!value) {
      if (onEntitiesChange && entities.length > 0) onEntitiesChange([]);
      prevValueRef.current = value;
      return;
    }

    const prevValue = prevValueRef.current;
    const currentValue = value;
    const currentCursor = textareaRef.current?.selectionStart || 0;
    const prevCursor = prevCursorRef.current;

    if (prevValue === currentValue) {
      prevCursorRef.current = currentCursor;
      return;
    }

    const lengthDiff = currentValue.length - prevValue.length;
    const isInsertion = lengthDiff > 0;
    const isDeletion = lengthDiff < 0;
    const changePosition = isInsertion ? prevCursor : currentCursor;

    const adjustedEntities = entities.map(entity => {
      if (entity.end <= changePosition) {
        if (entity.start < 0 || entity.end > currentValue.length || entity.start >= entity.end) return null;
        if (isDeletion && entity.end <= prevValue.length) {
          const entityText = currentValue.substring(entity.start, entity.end);
          if (entity.type === "key" && entity.id !== entityText) return null;
        }
        return entity;
      }

      if (entity.start >= changePosition) {
        const newStart = Math.max(0, entity.start + lengthDiff);
        const newEnd = Math.max(0, entity.end + lengthDiff);
        if (newStart < 0 || newEnd > currentValue.length || newStart >= newEnd) return null;
        const entityText = currentValue.substring(newStart, newEnd);
        if (entity.type === "key") {
          if (entity.id === entityText) return { ...entity, start: newStart, end: newEnd };
          return null;
        }
        return { ...entity, start: newStart, end: newEnd };
      }

      const newStart = entity.start + lengthDiff;
      const newEnd = entity.end + lengthDiff;
      if (newStart < 0 || newEnd > currentValue.length || newStart >= newEnd) return null;
      const entityText = currentValue.substring(newStart, newEnd);
      if (entity.type === "key") {
        if (entity.id === entityText) return { ...entity, start: newStart, end: newEnd };
        return null;
      }
      return { ...entity, start: newStart, end: newEnd };
    }).filter(e => e && e.start >= 0 && e.end <= value.length && e.start < e.end);

    if (onEntitiesChange) {
      const changed = JSON.stringify(adjustedEntities) !== JSON.stringify(entities);
      if (changed) onEntitiesChange(adjustedEntities);
    }

    prevValueRef.current = value;
    prevCursorRef.current = currentCursor;
  }, [value, entities, onEntitiesChange]);

  useEffect(() => {
    if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(scrollHeight, 200)}px`;
    textarea.style.overflowY = scrollHeight > 200 ? "auto" : "hidden";
  }, [value]);

  const applyAutocomplete = (selectedKey) => {
    if (!selectedKey) return;

    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);

    const entityEndingAtCursor = (entities || []).find(ent => ent.end === cursorPos);
    
    let currentWord, start;
    
    if (entityEndingAtCursor) {
      const wordMatchAfter = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
      if (wordMatchAfter) {
        currentWord = wordMatchAfter[1];
        start = cursorPos;
      } else {
        return;
      }
    } else {
      const entitiesEndingBeforeCursor = (entities || []).filter(ent => ent.end < cursorPos).sort((a, b) => b.end - a.end);
      const lastEntityEndingBeforeCursor = entitiesEndingBeforeCursor[0];
      
      if (lastEntityEndingBeforeCursor) {
        const textAfterLastEntity = value.substring(lastEntityEndingBeforeCursor.end, cursorPos);
        const wordMatchAfter = textAfterLastEntity.match(/([A-Za-z0-9_]+)/);
        if (wordMatchAfter) {
          currentWord = wordMatchAfter[1];
          start = lastEntityEndingBeforeCursor.end + wordMatchAfter.index;
        } else {
          const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
          if (wordMatchAfterCursor) {
            currentWord = wordMatchAfterCursor[1];
            start = cursorPos;
          } else {
            return;
          }
        }
      } else {
        const keyPatternMatch = textBeforeCursor.match(/([A-Za-z0-9_]+)$/);
        if (!keyPatternMatch) return;

        currentWord = keyPatternMatch[1];
        start = cursorPos - currentWord.length;
        
        const entityMatchingWord = (entities || []).find(ent => {
          return ent.start === start && ent.end === cursorPos && ent.id === currentWord;
        });
        
        if (entityMatchingWord) {
          const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
          if (wordMatchAfterCursor) {
            currentWord = wordMatchAfterCursor[1];
            start = cursorPos;
          } else {
            return;
          }
        } else {
          const entityInWord = (entities || []).find(ent => {
            return ent.start < cursorPos && ent.end > start;
          });
          
          if (entityInWord && entityInWord.end < cursorPos) {
            const textAfterEntity = textBeforeCursor.substring(entityInWord.end);
            const wordMatchAfterEntity = textAfterEntity.match(/^([A-Za-z0-9_]+)/);
            if (wordMatchAfterEntity) {
              currentWord = wordMatchAfterEntity[1];
              start = entityInWord.end;
            } else {
              return;
            }
          } else if (entityInWord && entityInWord.end === cursorPos) {
            const wordMatchAfterCursor = textAfterCursor.match(/^([A-Za-z0-9_]+)/);
            if (wordMatchAfterCursor) {
              currentWord = wordMatchAfterCursor[1];
              start = cursorPos;
            } else {
              return;
            }
          }
        }
      }
    }
    
    if (!currentWord) return;

    let matchingPrefix = currentWord;
    if (!selectedKey.startsWith(currentWord)) {
      let prefix = currentWord;
      while (prefix.length > 0 && !selectedKey.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
      
      if (prefix.length === 0 && currentWord.length > 0) {
        const lastChar = currentWord[currentWord.length - 1];
        if (selectedKey.startsWith(lastChar)) {
          prefix = lastChar;
        } else {
          for (let i = 1; i < currentWord.length; i++) {
            const suffix = currentWord.substring(currentWord.length - i);
            if (selectedKey.startsWith(suffix)) {
              prefix = suffix;
              break;
            }
          }
        }
      }
      
      matchingPrefix = prefix;
    }
    
    let replacementStart, replacementEnd;
    
    if (matchingPrefix.length < currentWord.length) {
      // Check if the matching prefix matches the end of the current word
      const wordEnd = currentWord.substring(currentWord.length - matchingPrefix.length);
      if (wordEnd === matchingPrefix) {
        replacementEnd = cursorPos;
        replacementStart = cursorPos - matchingPrefix.length;
      } else {
        replacementStart = start;
        replacementEnd = start + matchingPrefix.length;
      }
    } else {
      replacementStart = start;
      replacementEnd = start + matchingPrefix.length;
    }
    
    const keyPatternMatchAfter = textAfterCursor.match(/^([A-Za-z0-9_]*)/);
    const wordAfterCursor = keyPatternMatchAfter ? keyPatternMatchAfter[1] : "";
    const potentialFullWord = currentWord + wordAfterCursor;
    const potentialEnd = start + potentialFullWord.length;
    
    const entityInRange = (entities || []).find(ent => {
      return ent.start < potentialEnd && ent.end > start;
    });
    
    let end;
    if (entityInRange) {
      end = entityInRange.start;
    } else {
      end = replacementEnd;
      start = replacementStart;
    }

    const newValue = value.substring(0, start) + selectedKey + value.substring(end);
    const insertedLength = selectedKey.length - (end - start);

    // Find where each entity's text actually appears in the current value
    const entityOccurrences = new Map();
    (entities || []).forEach(ent => {
      if (!entityOccurrences.has(ent.id)) {
        const occurrences = [];
        let searchPos = 0;
        while (true) {
          const pos = value.indexOf(ent.id, searchPos);
          if (pos === -1) break;
          occurrences.push(pos);
          searchPos = pos + 1;
        }
        entityOccurrences.set(ent.id, occurrences);
      }
    });
    
    const usedOccurrences = new Map();
    (entities || []).forEach(ent => {
      if (!usedOccurrences.has(ent.id)) {
        usedOccurrences.set(ent.id, []);
      }
    });
    
    const adjustedExistingEntities = (entities || []).map(ent => {
      const occurrences = entityOccurrences.get(ent.id) || [];
      const used = usedOccurrences.get(ent.id) || [];
      
      let actualEntityStart = -1;
      let bestMatch = null;
      let bestDistance = Infinity;
      
      for (const pos of occurrences) {
        if (used.includes(pos)) continue;
        
        const distance = Math.abs(pos - ent.start);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = pos;
        }
      }
      
      if (bestMatch !== null) {
        actualEntityStart = bestMatch;
        used.push(actualEntityStart);
        usedOccurrences.set(ent.id, used);
      }
      
      if (actualEntityStart === -1) {
        if (ent.start >= end) {
          return { ...ent, start: ent.start + insertedLength, end: ent.end + insertedLength };
        }
        return { ...ent, start: ent.start + insertedLength, end: ent.end + insertedLength };
      }
      
      const actualEntityEnd = actualEntityStart + ent.id.length;
      const textBeingReplaced = value.substring(start, end);
      
      if (actualEntityStart >= start && actualEntityEnd <= end && textBeingReplaced === ent.id && ent.id === selectedKey) {
        return { ...ent, start, end: start + selectedKey.length };
      }
      
      if (actualEntityStart >= end) {
        return {
          ...ent,
          start: actualEntityStart + insertedLength,
          end: actualEntityEnd + insertedLength,
        };
      } else if (actualEntityEnd <= start) {
        return { ...ent, start: actualEntityStart, end: actualEntityEnd };
      } else {
        return {
          ...ent,
          start: actualEntityStart + insertedLength,
          end: actualEntityEnd + insertedLength,
        };
      }
    });

    const newEntity = {
      type: "key",
      id: selectedKey,
      start,
      end: start + selectedKey.length,
    };

    const updatedEntities = adjustedExistingEntities.filter(ent => {
      const overlaps = ent.start < newEntity.end && ent.end > newEntity.start;
      return !overlaps;
    });

    updatedEntities.push(newEntity);
    updatedEntities.sort((a, b) => a.start - b.start);
    
    skipEntityTrackingRef.current = true;
    onChange({ target: { value: newValue } });
    if (onEntitiesChange) onEntitiesChange(updatedEntities);

    prevValueRef.current = newValue;
    if (textareaRef.current) prevCursorRef.current = start + selectedKey.length;

    setTimeout(() => {
      if (textareaRef.current) {
        const pos = start + selectedKey.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);

    setAutocompleteMatches([]);
    setAutocompleteStart(null);
  };

  const handleKeyDown = (e) => {
    if (autocompleteMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMatchIndex(i => (i + 1) % autocompleteMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMatchIndex(i => (i - 1 + autocompleteMatches.length) % autocompleteMatches.length);
        return;
      }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        applyAutocomplete(autocompleteMatches[selectedMatchIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAutocompleteMatches([]);
        setAutocompleteStart(null);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
      if (textareaRef.current) {
        e.preventDefault();
        textareaRef.current.select();
        textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
      }
      return;
    }
    
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onKeyDown(e);
      return;
    }
  };

  const renderTextWithHighlights = () => {
    if (!value) return "";
    if (!entities || entities.length === 0) return value;

    const sorted = [...entities].sort((a, b) => a.start - b.start);
    const parts = [];
    let last = 0;

    sorted.forEach(ent => {
      if (ent.start > last) parts.push({ text: value.substring(last, ent.start), isEntity: false });
      parts.push({ text: value.substring(ent.start, ent.end), isEntity: true, entity: ent });
      last = ent.end;
    });

    if (last < value.length) parts.push({ text: value.substring(last), isEntity: false });
    return parts;
  };

  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="relative flex items-end gap-3 bg-white rounded-2xl border border-gray-300 shadow-sm hover:border-gray-400 focus-within:border-[#19c37d] focus-within:shadow-md transition-all">
          <div className="flex-1 relative">
            {autocompleteMatches.length > 0 && autocompleteStart !== null && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-300 rounded-t-lg border-b-0 shadow-lg max-h-60 overflow-y-auto z-50">
                {autocompleteMatches.map((key, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyAutocomplete(key)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                      idx === selectedMatchIndex ? "bg-gray-100" : ""
                    }`}
                    onMouseEnter={() => setSelectedMatchIndex(idx)}
                  >
                    <span className="text-sm text-gray-900">{key}</span>
                    <span className="text-xs text-gray-400 italic opacity-60">key</span>
                  </button>
                ))}
              </div>
            )}
          <textarea
            ref={textareaRef}
            value={value}
              onChange={(e) => {
                if (textareaRef.current) {
                  prevCursorRef.current = textareaRef.current.selectionStart || 0;
                }
                onChange(e);
              }}
            onKeyDown={handleKeyDown}
              onSelect={(e) => {
                if (textareaRef.current) {
                  prevCursorRef.current = textareaRef.current.selectionStart || 0;
                }
              }}
            placeholder="Send a message..."
            rows={1}
              className="w-full resize-none rounded-2xl px-4 py-3 text-[15px] leading-relaxed focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 max-h-[200px] select-text relative z-10"
            style={{ minHeight: "24px", overflowY: "hidden", userSelect: "text" }}
          />
            {entities && entities.length > 0 && value && (
              <div
                key={`overlay-${entities.length}-${entities.map(e => `${e.start}-${e.end}-${e.id}`).join('-')}`}
                className="absolute inset-0 pointer-events-none px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden rounded-2xl"
                style={{
                  minHeight: "24px",
                  color: "transparent",
                  zIndex: 0,
                  wordBreak: "break-word",
                  fontFamily: "inherit",
                  lineHeight: "inherit",
                }}
              >
                {renderTextWithHighlights().map((part, idx) => {
                  if (part.isEntity) {
                    return (
                      <span
                        key={`entity-${part.entity.start}-${part.entity.end}-${part.entity.id}-${idx}`}
                        style={{ 
                          backgroundColor: "rgba(254, 240, 138, 0.5)",
                          borderRadius: "2px",
                        }}
                      >
                        {part.text}
                      </span>
                    );
                  }
                  return <span key={`text-${idx}`}>{part.text}</span>;
                })}
              </div>
            )}
          </div>
          <button
            onClick={onSend}
            disabled={sending || !value.trim()}
            className="mb-2 mr-2 p-2 rounded-lg bg-[#19c37d] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#16a570] transition-colors flex-shrink-0"
            title="Send message"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </button>
        </div>
        {entities && entities.length > 0 && (
          <div className="text-xs text-gray-500 mt-1 px-4 flex flex-wrap gap-1">
            <span>Entities:</span>
            {entities.map((entity, idx) => (
              <span key={idx} className="bg-yellow-100 px-2 py-0.5 rounded text-xs">
                {entity.id} ({entity.type})
              </span>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-500 text-center mt-2">
          AI models can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
});

export default MessageInput;
