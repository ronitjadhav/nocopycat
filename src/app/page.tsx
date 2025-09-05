"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Neo‑Brutalist No‑Duplicate List — with delete + paste-safe + export/import
export default function App() {
  const [items, setItems] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<{
    kind: "idle" | "dup" | "added" | "batch" | "empty" | "preview" | "error";
    msg: string;
  }>({ kind: "idle", msg: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalization for comparisons
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

  // Fast lookup for existing items
  const setLookup = useMemo(() => new Set(items.map(norm)), [items]);

  // Load & persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nocopycat_items");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    // Focus input on load
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("nocopycat_items", JSON.stringify(items));
    } catch {}
  }, [items]);

  // Helpers
  const exists = (s: string) => setLookup.has(norm(s));

  // Tokenizer used for both paste and submit and import
  const tokenize = (text: string): string[] =>
    text
      .split(/[\n,]+/g)
      .map((t) => t.trim())
      .flatMap((t) => t.split(/\s+/g))
      .map((t) => t.trim())
      .filter(Boolean);

  // Submit adds items (single or batch), never on paste
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tokens = tokenize(value);
    if (tokens.length === 0) {
      setStatus({ kind: "empty", msg: "Type something first." });
      inputRef.current?.focus();
      return;
    }

    const uniques: string[] = [];
    const dups: string[] = [];

    const batchSeen = new Set<string>();
    for (const t of tokens) {
      const n = norm(t);
      if (!batchSeen.has(n)) {
        batchSeen.add(n);
        if (!exists(t)) uniques.push(t);
        else dups.push(t);
      } else {
        dups.push(t);
      }
    }

    if (uniques.length) setItems((prev) => [...uniques, ...prev]);

    let msg = "";
    if (tokens.length === 1) {
      msg = uniques.length
        ? `Added "${tokens[0]}".`
        : `"${tokens[0]}" is already in the list.`;
      setStatus({ kind: uniques.length ? "added" : "dup", msg });
    } else {
      const parts: string[] = [];
      if (uniques.length) parts.push(`added ${uniques.length}`);
      if (dups.length)
        parts.push(`${dups.length} duplicate${dups.length > 1 ? "s" : ""}`);
      setStatus({ kind: "batch", msg: `Batch: ${parts.join(", ")}.` });
    }

    setValue("");
    inputRef.current?.focus();
  };

  // Paste should NOT add anything. It only fills the input and previews duplicates/new counts.
  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    // Let the browser paste normally, then in the next tick, analyze the full input value
    setTimeout(() => {
      const val = (inputRef.current?.value ?? "").trim();
      if (!val) {
        setStatus({ kind: "idle", msg: "" });
        return;
      }
      const tokens = tokenize(val);
      if (tokens.length === 1) {
        const t = tokens[0];
        setStatus({
          kind: exists(t) ? "dup" : "idle",
          msg: exists(t) ? `"${t}" is already in the list.` : "",
        });
      } else {
        const batchSeen = new Set<string>();
        let newCount = 0,
          dupCount = 0;
        for (const t of tokens) {
          const n = norm(t);
          if (batchSeen.has(n)) {
            dupCount++;
            continue;
          }
          batchSeen.add(n);
          if (exists(t)) dupCount++;
          else newCount++;
        }
        setStatus({
          kind: "preview",
          msg: `Batch ready: ${newCount} new, ${dupCount} duplicate${
            dupCount !== 1 ? "s" : ""
          }.`,
        });
      }
    }, 0);
  };

  const isDuplicateLive = (() => {
    const tokens = tokenize(value);
    if (tokens.length !== 1) return false; // live duplicate indicator only for single word
    return !!tokens[0] && exists(tokens[0]);
  })();

  const deleteItem = (word: string) => {
    setItems((prev) => prev.filter((it) => it !== word));
    setStatus({ kind: "idle", msg: `Deleted "${word}".` });
    inputRef.current?.focus();
  };

  // Export / Import
  const exportJSON = useCallback(() => {
    const payload = {
      type: "nocopycat-list",
      version: 1,
      items,
      exported: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = `nocopycat-list-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [items]);

  const exportTXT = useCallback(() => {
    const blob = new Blob([items.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = `nocopycat-list-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [items]);

  const startImport = useCallback(() => fileInputRef.current?.click(), []);

  const onImportFile: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let tokens: string[] = [];

      if (file.name.endsWith(".json")) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) tokens = data as string[]; // raw list
          else if (Array.isArray(data?.items))
            tokens = data.items as string[]; // wrapped
          else throw new Error("JSON does not contain an array of items");
        } catch (err) {
          setStatus({
            kind: "error",
            msg: `Invalid JSON: ${(err as Error).message}`,
          });
          e.target.value = "";
          return;
        }
      } else {
        // Treat as plain text — one or many words
        tokens = tokenize(text);
      }

      // Clean + dedupe within file
      const cleaned = Array.from(
        new Set(tokens.map((t) => t.trim()).filter(Boolean))
      );

      // Merge with existing, skipping duplicates
      const uniques: string[] = [];
      let dupCount = 0;
      for (const t of cleaned) {
        if (!exists(t) && !uniques.map(norm).includes(norm(t))) uniques.push(t);
        else dupCount++;
      }

      if (uniques.length) setItems((prev) => [...uniques, ...prev]);

      setStatus({
        kind: "batch",
        msg: `Import complete: added ${
          uniques.length
        }, skipped ${dupCount} duplicate${dupCount !== 1 ? "s" : ""}.`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: `Import failed: ${(err as Error).message}`,
      });
    } finally {
      // Reset the input so the same file can be chosen again later
      e.target.value = "";
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to export
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        exportJSON();
      }
      // Ctrl/Cmd + O to import
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        startImport();
      }
      // Escape to clear input
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setValue("");
        setStatus({ kind: "idle", msg: "" });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exportJSON, startImport]);

  return (
    <div className="min-h-screen bg-[#F7F7F1]">
      {/* Navbar */}
      <nav className="bg-white border-b-4 border-black shadow-[0_4px_0_0_#000] sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-[#FFEC48] to-[#FFD700] px-4 py-2 border-3 border-black shadow-[4px_4px_0_0_#000] transform hover:scale-105 transition-transform duration-200">
              NoCopyCat
            </h1>
            <div className="inline-block px-3 py-1 bg-[#7CFFB2] border-2 border-black font-bold text-sm shadow-[4px_4px_0_0_#000]">
              🚫 Zero Duplicates
            </div>
          </div>
        </div>
      </nav>

      <div className="p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <header className="mb-12 text-center">
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-[#A5B4FC] to-[#8B9DFC] border-4 border-black shadow-[6px_6px_0_0_#000] mb-6 transform hover:scale-105 transition-all duration-200">
              <span className="text-2xl mr-2">🎯</span>
              <span className="font-black text-lg">Smart List Builder</span>
            </div>
            <p className="text-lg md:text-xl text-neutral-700 font-medium leading-relaxed max-w-2xl mx-auto">
              The smart way to build duplicate-free lists. <br /> Paste to preview, submit to save. Every entry is
              unique, guaranteed.
            </p>
          </header>

          {/* Quick Stats */}
          <div className="flex flex-col sm:flex-row justify-center items-center mb-8 gap-6">
            <div className="bg-gradient-to-br from-white to-blue-50 border-4 border-black shadow-[6px_6px_0_0_#000] p-6 text-center hover:shadow-[8px_8px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 min-w-[180px] group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                📊
              </div>
              <div className="font-black text-4xl text-[#6366F1] mb-2 group-hover:text-[#4F46E5] transition-colors">
                {items.length}
              </div>
              <div className="font-bold text-base text-neutral-600 uppercase tracking-wide">
                Total Items
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-green-50 border-4 border-black shadow-[6px_6px_0_0_#000] p-6 text-center hover:shadow-[8px_8px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 min-w-[180px] group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                {items.length > 0 ? "💾" : "📂"}
              </div>
              <div
                className={`font-black text-3xl mb-2 transition-colors ${
                  items.length > 0
                    ? "text-[#10B981] group-hover:text-[#059669]"
                    : "text-neutral-400 group-hover:text-neutral-500"
                }`}
              >
                {items.length > 0 ? "SAVED" : "EMPTY"}
              </div>
              <div className="font-bold text-base text-neutral-600 uppercase tracking-wide">
                Auto-Saved
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mb-8 bg-white border-4 border-black shadow-[6px_6px_0_0_#000] p-6 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                Quick Actions
              </h3>
              <div className="text-sm text-neutral-600 font-medium">
                Export & Import Tools
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={exportJSON}
                variant="neutral"
                size="lg"
                className="group bg-white hover:bg-gray-50 flex-1 sm:flex-none"
                title="Export as JSON (Ctrl+S)"
              >
                <span className="group-hover:scale-110 transition-transform mr-2">
                  📄
                </span>
                Export JSON
              </Button>
              <Button
                onClick={exportTXT}
                variant="default"
                size="lg"
                className="group bg-[#FFEC48] hover:bg-[#FFD700] flex-1 sm:flex-none"
                title="Export as TXT"
              >
                <span className="group-hover:scale-110 transition-transform mr-2">
                  📋
                </span>
                Export TXT
              </Button>
              <Button
                onClick={startImport}
                variant="default"
                size="lg"
                className="group bg-[#A5B4FC] hover:bg-[#8B9DFC] flex-1 sm:flex-none"
                title="Import from file (Ctrl+O)"
              >
                <span className="group-hover:scale-110 transition-transform mr-2">
                  📁
                </span>
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,text/plain,application/json"
                className="hidden"
                onChange={onImportFile}
              />
            </div>
          </div>

          {/* Main Input Section */}
          <div className="mb-8 bg-gradient-to-br from-white to-gray-50 border-4 border-black shadow-[8px_8px_0_0_#000] p-6 rounded-none">
            <div className="mb-4">
              <h3 className="font-black text-xl flex items-center gap-2 mb-2">
                <span className="text-2xl">✍️</span>
                Add New Items
              </h3>
              <p className="text-sm text-neutral-600 font-medium">
                Type individual items or paste multiple entries separated by
                commas, spaces, or line breaks
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onPaste={onPaste}
                    placeholder="Type or paste words, phrases, or lists…"
                    aria-label="Word input"
                    className={[
                      "w-full px-6 py-5 text-lg md:text-xl font-semibold rounded-none",
                      "border-4 border-black focus:outline-none focus:ring-4 focus:ring-[#FFEC48] focus:ring-opacity-50",
                      "shadow-[8px_8px_0_0_#000] transition-all duration-200",
                      "placeholder:text-neutral-500",
                      isDuplicateLive
                        ? "bg-[#FFE5E5] border-red-500"
                        : "bg-white hover:shadow-[10px_10px_0_0_#000]",
                    ].join(" ")}
                  />

                  <div className="absolute -bottom-10 left-2 text-sm font-bold select-none">
                    {value.trim() ? (
                      isDuplicateLive ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6B6B] text-white border-2 border-black shadow-[4px_4px_0_0_#000] animate-pulse">
                          ⚠️ Already exists
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#7CFFB2] text-black border-2 border-black shadow-[4px_4px_0_0_#000]">
                          ✅ Ready to add
                        </span>
                      )
                    ) : null}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!value.trim()}
                  variant="default"
                  size="lg"
                  className="bg-gradient-to-r from-[#6EE0FF] to-[#5DD4FF] hover:from-[#5DD4FF] hover:to-[#3BC9FF] text-lg md:text-xl uppercase tracking-wide whitespace-nowrap lg:px-8"
                >
                  <span
                    className={!value.trim() ? "mr-2" : "animate-bounce mr-2"}
                  >
                    ➕
                  </span>
                  Add to List
                </Button>
              </div>
            </form>
          </div>

          <StatusBar status={status} />

          <section className="mt-8">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#000] p-6 rounded-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
                  <span className="text-3xl">📝</span>
                  Your List
                </h2>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-[#FFEC48] to-[#FFD700] border-3 border-black font-bold shadow-[4px_4px_0_0_#000] text-lg">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </div>
                  {items.length > 0 && (
                    <Button
                      onClick={() => setItems([])}
                      variant="noShadow"
                      size="sm"
                      className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                      title="Clear all items"
                    >
                      🗑️ Clear All
                    </Button>
                  )}
                </div>
              </div>

              {items.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((it, i) => (
                    <li
                      key={i}
                      className="group relative bg-gradient-to-br from-white to-gray-50 border-4 border-black p-4 font-bold shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <span className="flex-1 pr-3 break-words text-sm md:text-base leading-relaxed">
                          {it}
                        </span>
                        <Button
                          onClick={() => deleteItem(it)}
                          variant="reverse"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 bg-[#FF6B6B] hover:bg-red-500 text-white border-2 rounded-full w-8 h-8"
                          aria-label={`Delete ${it}`}
                          title="Delete"
                        >
                          🗑️
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-30 transition-opacity duration-200 text-xs font-bold text-neutral-400">
                        #{i + 1}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mt-12">
            <h2 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-3">
              <span className="text-3xl">❓</span>
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  How does duplicate detection work?
                </AccordionTrigger>
                <AccordionContent>
                  NoCopyCat uses smart normalization to detect duplicates. It
                  compares items after trimming whitespace, converting to
                  lowercase, and normalizing spaces. This means &quot;Hello
                  World&quot;, &quot;hello world&quot;, and &quot; HELLO WORLD
                  &quot; are all considered the same item.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  What happens when I paste content?
                </AccordionTrigger>
                <AccordionContent>
                  Pasting never automatically adds items to your list. Instead,
                  it fills the input field and shows you a preview of what would
                  be added vs. what&apos;s already a duplicate. You can review
                  the batch before submitting by clicking &quot;Add to
                  List&quot; or pressing Enter.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  How can I add multiple items at once?
                </AccordionTrigger>
                <AccordionContent>
                  You can separate multiple items using spaces, commas, or
                  newlines. For example: &quot;apple, banana, orange&quot; or
                  &quot;apple banana orange&quot; will be processed as three
                  separate items. The app will show you how many are new vs.
                  duplicates.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>
                  Are there keyboard shortcuts?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Use Ctrl+S (Cmd+S on Mac) to export as JSON, Ctrl+O
                  (Cmd+O on Mac) to import a file, and Esc to clear the input
                  field. The input field is automatically focused after most
                  actions for seamless keyboard navigation.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>
                  Is my data saved automatically?
                </AccordionTrigger>
                <AccordionContent>
                  Yes, your list is automatically saved to your browser&apos;s
                  local storage every time you make changes. Your data will be
                  restored when you return to the app, even after closing your
                  browser. For backup or sharing, use the export feature.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <footer className="mt-12 border-t-4 border-black pt-8">
            <div className="bg-gradient-to-r from-[#F7F7F1] to-[#EEEEEE] border-4 border-black p-6 shadow-[6px_6px_0_0_#000]">
              <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <span>💡</span>
                Pro Tips & Shortcuts
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm font-medium text-neutral-700">
                <div>
                  <strong>Input Methods:</strong> Separate items with spaces,
                  commas, or newlines for batch processing.
                </div>
                <div>
                  <strong>Smart Processing:</strong> Paste to preview, submit to
                  save. Only unique items are added.
                </div>
                <div>
                  <strong>Keyboard Shortcuts:</strong> Ctrl+S to export JSON,
                  Ctrl+O to import, Esc to clear input.
                </div>
                <div>
                  <strong>Data Portability:</strong> Export/Import your lists as
                  JSON or TXT to sync across devices.
                </div>
              </div>
            </div>
            <div className="text-center mt-6 text-neutral-500 font-medium">
              Built with ❤️ using Next.js & Tailwind CSS
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ status }: { status: { kind: string; msg: string } }) {
  if (!status.msg) return null;
  const base =
    "inline-block px-4 py-3 border-4 border-black font-bold shadow-[6px_6px_0_0_#000] rounded-none animate-in slide-in-from-left duration-300";
  const cls =
    {
      dup: `${base} bg-[#FFEC48] text-black`,
      added: `${base} bg-[#7CFFB2] text-black`,
      batch: `${base} bg-[#A5B4FC] text-black`,
      preview: `${base} bg-[#E0E7FF] text-black border-blue-500`,
      empty: `${base} bg-white text-black`,
      idle: `${base} bg-white text-black`,
      error: `${base} bg-[#FF6B6B] text-white animate-pulse`,
    }[status.kind as keyof typeof StatusKinds] || base;

  const getIcon = () => {
    switch (status.kind) {
      case "dup":
        return "⚠️";
      case "added":
        return "✅";
      case "batch":
        return "📦";
      case "preview":
        return "👀";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  return (
    <div aria-live="polite" className="mb-6">
      <span className={cls}>
        <span className="mr-2">{getIcon()}</span>
        {status.msg}
      </span>
    </div>
  );
}
const StatusKinds = {
  dup: true,
  added: true,
  batch: true,
  preview: true,
  empty: true,
  idle: true,
  error: true,
} as const;

function EmptyState() {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border-4 border-black p-8 shadow-[8px_8px_0_0_#000] text-center">
      <div className="text-6xl mb-4 animate-bounce">📝</div>
      <h3 className="text-xl font-black mb-2">
        Ready to Start Adding Words to the List?
      </h3>
      <p className="text-base font-medium text-gray-700 mb-4">
        Your list is empty. Add your first item above and start creating your
        duplicate-free collection!
      </p>
      <div className="text-sm text-gray-500 font-medium">
        💡 Tip: Try pasting multiple items at once to see the batch preview
        feature
      </div>
    </div>
  );
}

function bump(el?: HTMLElement | null) {
  if (!el) return;
  el.animate(
    [
      { transform: "translate(0,0)" },
      { transform: "translate(2px,0)" },
      { transform: "translate(-2px,0)" },
      { transform: "translate(0,0)" },
    ],
    { duration: 120, iterations: 2 }
  );
}
