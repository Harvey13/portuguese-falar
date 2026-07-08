import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Volume2, Shuffle, Upload, Check, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  defaultThemes,
  diffWords,
  flattenThemeSentences,
  loadThemeSentencesFromFiles,
  parseThemeSentencesFile,
  type Sentence,
  type ThemeSentences,
  type WordDiff,
} from "@/lib/sentences";
import { createRecognizer, isSpeechSupported, speak } from "@/lib/speech";
import { toast } from "sonner";

function pickRandom(list: Sentence[], avoidIdx: number) {
  if (list.length <= 1) return 0;
  let n = avoidIdx;
  while (n === avoidIdx) n = Math.floor(Math.random() * list.length);
  return n;
}

function FrBrFlag() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-sm overflow-hidden border border-border shadow-sm" aria-label="Français vers portugais brésilien">
      {/* French flag */}
      <span className="flex h-5 w-7">
        <span className="w-1/3 bg-[#0055A4]" />
        <span className="w-1/3 bg-white" />
        <span className="w-1/3 bg-[#EF4135]" />
      </span>
      <span className="text-xs text-muted-foreground px-0.5">→</span>
      {/* Brazilian flag (stylized) */}
      <span className="relative flex h-5 w-7 bg-[#009C3B] items-center justify-center">
        <span className="absolute inset-y-0.5 inset-x-1 bg-[#FFDF00] [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]" />
        <span className="relative h-2 w-2 rounded-full bg-[#002776]" />
      </span>
    </span>
  );
}

function DiffLine({ words }: { words: WordDiff[] }) {
  return (
    <p className="text-lg leading-relaxed">
      {words.map((w, i) => {
        const cls =
          w.status === "ok"
            ? "text-foreground"
            : w.status === "missing"
            ? "text-destructive line-through decoration-2"
            : w.status === "extra"
            ? "text-amber-600 dark:text-amber-400 underline decoration-dotted"
            : "text-destructive";
        return (
          <span key={i} className={cls}>
            {w.word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}

export function PracticeCard() {
  const [themeGroups, setThemeGroups] = useState<ThemeSentences[]>(defaultThemes);
  const [idx, setIdx] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [validated, setValidated] = useState(false);
  const [revealPt, setRevealPt] = useState(false);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [supported, setSupported] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const sentences = useMemo(() => flattenThemeSentences(themeGroups), [themeGroups]);
  const current = sentences[idx];

  useEffect(() => {
    setHydrated(true);
    setSupported(isSpeechSupported());
    setIdx(Math.floor(Math.random() * sentences.length));
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, [sentences.length]);

  const handleReveal = () => {
    setRevealPt(true);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = setTimeout(() => setRevealPt(false), 2000);
  };

  const handleNext = () => {
    setIdx((i) => pickRandom(sentences, i));
    setTranscript("");
    setValidated(false);
    setRevealPt(false);
  };

  const startListening = () => {
    if (!supported) {
      toast.error("La reconnaissance vocale n'est pas supportée sur ce navigateur. Essayez Chrome.");
      return;
    }
    const rec = createRecognizer("pt-BR");
    if (!rec) return;
    recRef.current = rec;
    setTranscript("");
    setValidated(false);
    setListening(true);
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      toast.error(`Erreur micro: ${e.error ?? "inconnue"}`);
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const validate = () => setValidated(true);

  const onFile = async (files: File[]) => {
    try {
      const selectedFiles = files.filter((file) => [".json", ".txt", ".csv"].some((ext) => file.name.toLowerCase().endsWith(ext)));
      if (!selectedFiles.length) throw new Error("Aucun fichier JSON, TXT ou CSV sélectionné");

      const parsed = await loadThemeSentencesFromFiles(selectedFiles);
      if (!parsed.length) throw new Error("Aucune phrase trouvée");

      setThemeGroups(parsed);
      setIdx(0);
      setTranscript("");
      setValidated(false);
      toast.success(`${parsed.reduce((sum, group) => sum + group.sentences.length, 0)} phrases chargées depuis ${parsed.length} thème(s)`);
    } catch (e: any) {
      toast.error(`Import impossible: ${e.message ?? e}`);
    }
  };

  const diff = validated && transcript ? diffWords(current.pt, transcript) : null;

  const handleExport = () => {
    try {
      const json = JSON.stringify(themeGroups, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phrases-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${sentences.length} phrases exportées`);
    } catch (e: any) {
      toast.error(`Export impossible: ${e.message ?? e}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Card className="p-8 space-y-6 border-2 border-[oklch(0.75_0.18_140)]/40 shadow-[0_10px_40px_-15px_oklch(0.78_0.17_85/0.5)] bg-gradient-to-br from-[oklch(0.99_0.03_140)] via-background to-[oklch(0.99_0.05_85)] dark:from-[oklch(0.22_0.05_140)] dark:via-background dark:to-[oklch(0.22_0.06_85)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FrBrFlag />
            <Badge className="font-mono text-xs bg-[oklch(0.6_0.2_140)] text-white hover:bg-[oklch(0.55_0.2_140)]">
              FR → PT
            </Badge>
          </div>
          <span className="text-xs font-semibold text-[oklch(0.45_0.18_140)] dark:text-[oklch(0.8_0.18_85)]">
            {idx + 1} / {sentences.length}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Phrase en français</p>
            <Badge variant="outline" className="font-medium">
              {current.theme ?? "Général"}
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-medium leading-snug text-foreground">
            {current.fr}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={listening ? stopListening : startListening}
            variant={listening ? "destructive" : "default"}
            size="lg"
            className="gap-2"
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? "Arrêter" : "Parler en portugais"}
          </Button>
          <Button onClick={validate} variant="outline" size="lg" className="gap-2" disabled={!transcript}>
            <Check className="h-4 w-4" /> Valider
          </Button>
          <Button onClick={handleNext} variant="ghost" size="lg" className="gap-2">
            <Shuffle className="h-4 w-4" /> Suivante
          </Button>
          <Button onClick={handleReveal} variant="secondary" size="lg" className="gap-2" disabled={revealPt}>
            <Eye className="h-4 w-4" /> {revealPt ? "Révélé" : "Révéler"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {revealPt ? "Phrase en portugais" : "Votre réponse"}
          </p>
          {revealPt ? (
            <div className="min-h-24 rounded-md border border-border bg-muted/60 p-4 text-lg text-foreground animate-in fade-in">
              {current.pt}
            </div>
          ) : (
            <Textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setValidated(false);
              }}
              placeholder={
                !hydrated || supported
                  ? "Cliquez sur le micro ou tapez ici…"
                  : "Tapez votre réponse en portugais ici…"
              }
              className="min-h-24 text-lg"
            />
          )}
        </div>

        {diff && (
          <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Feedback</p>
              <Badge variant={diff.score >= 90 ? "default" : diff.score >= 60 ? "secondary" : "destructive"}>
                {diff.score}%
              </Badge>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Attendu</p>
              <DiffLine words={diff.expected} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Vous avez dit</p>
              {diff.actual.length ? (
                <DiffLine words={diff.actual} />
              ) : (
                <p className="text-muted-foreground italic">—</p>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={() => speak(current.pt)} className="gap-2">
              <Volume2 className="h-4 w-4" /> Écouter la bonne prononciation
            </Button>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 hover:text-[oklch(0.5_0.2_140)] transition-colors">
            <Upload className="h-4 w-4" />
            Importer
            <input
              type="file"
              accept=".json,.txt,.csv"
              multiple
              webkitdirectory=""
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) onFile(files);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={handleExport}
            className="inline-flex cursor-pointer items-center gap-2 hover:text-[oklch(0.55_0.18_85)] transition-colors"
          >
            <Download className="h-4 w-4" />
            Exporter JSON
          </button>
        </div>
        <span className="text-xs">Format: <code>JSON par thème</code> ou <code>fr | pt</code> par ligne. Vous pouvez aussi sélectionner un dossier contenant plusieurs fichiers JSON.</span>
      </div>
    </div>
  );
}
