import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Target, DollarSign, GraduationCap, Heart, Wallet, Zap,
  Navigation, Trophy, StickyNote, ThumbsUp, ThumbsDown, Eye, HelpCircle,
  CalendarDays, CheckSquare, Plus, Trash2, Check, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { College } from "@/types/college";

export type StructuredNotes = {
  tags: string[];
  general: string;
  pros: string[];
  cons: string[];
  campusVisit: string;
  questionsForAdmissions: string[];
  timeline: { label: string; date: string }[];
  checklist: {
    campusVisited: boolean;
    applied: boolean;
    accepted: boolean;
    topChoice: boolean;
  };
};

const emptyNotes: StructuredNotes = {
  tags: [],
  general: "",
  pros: [""],
  cons: [""],
  campusVisit: "",
  questionsForAdmissions: [""],
  timeline: [],
  checklist: { campusVisited: false, applied: false, accepted: false, topChoice: false },
};

export function parseNotes(raw: string): StructuredNotes {
  if (!raw) return { ...emptyNotes, pros: [""], cons: [""], questionsForAdmissions: [""] };
  try {
    const parsed = JSON.parse(raw);
    return {
      ...emptyNotes,
      ...parsed,
      pros: parsed.pros?.length ? parsed.pros : [""],
      cons: parsed.cons?.length ? parsed.cons : [""],
      questionsForAdmissions: parsed.questionsForAdmissions?.length ? parsed.questionsForAdmissions : [""],
      checklist: { ...emptyNotes.checklist, ...parsed.checklist },
    };
  } catch {
    // Legacy plain-text notes
    return { ...emptyNotes, general: raw, pros: [""], cons: [""], questionsForAdmissions: [""] };
  }
}

const TAG_OPTIONS = [
  { label: "Favorite", icon: Heart, color: "text-rose-500 bg-rose-50 border-rose-200" },
  { label: "Affordable", icon: Wallet, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { label: "Strong Program", icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { label: "Good Location", icon: Navigation, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { label: "Big Sports Culture", icon: Trophy, color: "text-purple-600 bg-purple-50 border-purple-200" },
];

const CHECKLIST_ITEMS: { key: keyof StructuredNotes["checklist"]; label: string }[] = [
  { key: "campusVisited", label: "Campus Visited" },
  { key: "applied", label: "Applied" },
  { key: "accepted", label: "Accepted" },
  { key: "topChoice", label: "Top Choice" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  college: College;
  collegeName: string;
  notes: StructuredNotes;
  onSave: (notes: StructuredNotes) => void;
};

export default function CollegeNotesPanel({ open, onClose, college, collegeName, notes, onSave }: Props) {
  const [local, setLocal] = useState<StructuredNotes>(notes);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocal(notes); }, [notes]);

  const triggerSave = useCallback((updated: StructuredNotes) => {
    setSaveStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  }, [onSave]);

  const update = useCallback((patch: Partial<StructuredNotes>) => {
    setLocal(prev => {
      const next = { ...prev, ...patch };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const toggleTag = (tag: string) => {
    const tags = local.tags.includes(tag) ? local.tags.filter(t => t !== tag) : [...local.tags, tag];
    update({ tags });
  };

  const updateListItem = (field: "pros" | "cons" | "questionsForAdmissions", idx: number, val: string) => {
    const list = [...local[field]];
    list[idx] = val;
    update({ [field]: list });
  };

  const addListItem = (field: "pros" | "cons" | "questionsForAdmissions") => {
    update({ [field]: [...local[field], ""] });
  };

  const removeListItem = (field: "pros" | "cons" | "questionsForAdmissions", idx: number) => {
    const list = local[field].filter((_, i) => i !== idx);
    update({ [field]: list.length ? list : [""] });
  };

  const addTimelineEvent = () => {
    update({ timeline: [...local.timeline, { label: "", date: "" }] });
  };

  const updateTimeline = (idx: number, patch: Partial<{ label: string; date: string }>) => {
    const timeline = local.timeline.map((t, i) => i === idx ? { ...t, ...patch } : t);
    update({ timeline });
  };

  const removeTimeline = (idx: number) => {
    update({ timeline: local.timeline.filter((_, i) => i !== idx) });
  };

  const toggleChecklist = (key: keyof StructuredNotes["checklist"]) => {
    update({ checklist: { ...local.checklist, [key]: !local.checklist[key] } });
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-border shadow-elevated z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-card shrink-0">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground truncate">{collegeName}</h2>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{college.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Save indicator */}
                  <AnimatePresence mode="wait">
                    {saveStatus === "saving" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                      </motion.div>
                    )}
                    {saveStatus === "saved" && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Check className="h-3 w-3" /> Saved
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground truncate">{college.acceptanceRate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                  <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground truncate">{college.netPrice}</span>
                </div>
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                  <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground truncate">{college.setting}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Tags */}
              <Section icon={Heart} title="Quick Tags">
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => {
                    const Icon = tag.icon;
                    const active = local.tags.includes(tag.label);
                    return (
                      <button
                        key={tag.label}
                        onClick={() => toggleTag(tag.label)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active ? tag.color + " ring-1 ring-offset-1" : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Separator className="bg-border/50" />

              {/* General Notes */}
              <Section icon={StickyNote} title="General Notes">
                <Textarea
                  placeholder="Write your thoughts about this school..."
                  value={local.general}
                  onChange={e => update({ general: e.target.value })}
                  className="min-h-[100px] bg-muted/30 border-border/50 focus:bg-card resize-y"
                />
              </Section>

              <Separator className="bg-border/50" />

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ListSection
                  icon={ThumbsUp}
                  title="Pros"
                  items={local.pros}
                  placeholder="Add a positive..."
                  iconColor="text-emerald-600"
                  onUpdate={(idx, val) => updateListItem("pros", idx, val)}
                  onAdd={() => addListItem("pros")}
                  onRemove={(idx) => removeListItem("pros", idx)}
                />
                <ListSection
                  icon={ThumbsDown}
                  title="Cons"
                  items={local.cons}
                  placeholder="Add a concern..."
                  iconColor="text-rose-500"
                  onUpdate={(idx, val) => updateListItem("cons", idx, val)}
                  onAdd={() => addListItem("cons")}
                  onRemove={(idx) => removeListItem("cons", idx)}
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Campus Visit */}
              <Section icon={Eye} title="Campus Visit Impressions">
                <Textarea
                  placeholder="Record your impressions after visiting the campus..."
                  value={local.campusVisit}
                  onChange={e => update({ campusVisit: e.target.value })}
                  className="min-h-[80px] bg-muted/30 border-border/50 focus:bg-card resize-y"
                />
              </Section>

              <Separator className="bg-border/50" />

              {/* Questions for Admissions */}
              <ListSection
                icon={HelpCircle}
                title="Questions for Admissions"
                items={local.questionsForAdmissions}
                placeholder="Add a question..."
                iconColor="text-primary"
                onUpdate={(idx, val) => updateListItem("questionsForAdmissions", idx, val)}
                onAdd={() => addListItem("questionsForAdmissions")}
                onRemove={(idx) => removeListItem("questionsForAdmissions", idx)}
              />

              <Separator className="bg-border/50" />

              {/* Timeline */}
              <Section icon={CalendarDays} title="Timeline">
                <div className="space-y-3">
                  {local.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Event (e.g., Campus Tour)"
                        value={event.label}
                        onChange={e => updateTimeline(idx, { label: e.target.value })}
                        className="flex-1 bg-muted/30 border-border/50 focus:bg-card text-sm"
                      />
                      <Input
                        type="date"
                        value={event.date}
                        onChange={e => updateTimeline(idx, { date: e.target.value })}
                        className="w-[140px] bg-muted/30 border-border/50 focus:bg-card text-sm"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeTimeline(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTimelineEvent} className="gap-1.5 text-xs">
                    <Plus className="h-3 w-3" /> Add Event
                  </Button>
                </div>
              </Section>

              <Separator className="bg-border/50" />

              {/* Checklist */}
              <Section icon={CheckSquare} title="Status Checklist">
                <div className="grid grid-cols-2 gap-3">
                  {CHECKLIST_ITEMS.map(item => (
                    <button
                      key={item.key}
                      onClick={() => toggleChecklist(item.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
                        local.checklist[item.key]
                          ? "bg-primary/5 border-primary/30 text-primary"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        local.checklist[item.key] ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {local.checklist[item.key] && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {item.label}
                    </button>
                  ))}
                </div>
              </Section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Reusable section wrapper
function Section({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Reusable list section (pros, cons, questions)
function ListSection({ icon: Icon, title, items, placeholder, iconColor, onUpdate, onAdd, onRemove }: {
  icon: typeof Heart;
  title: string;
  items: string[];
  placeholder: string;
  iconColor: string;
  onUpdate: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 group">
            <Input
              placeholder={placeholder}
              value={item}
              onChange={e => onUpdate(idx, e.target.value)}
              className="flex-1 bg-muted/30 border-border/50 focus:bg-card text-sm h-9"
            />
            {items.length > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => onRemove(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={onAdd} className="gap-1 text-xs text-muted-foreground hover:text-primary h-7 px-2">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
    </div>
  );
}
