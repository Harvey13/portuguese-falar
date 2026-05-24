import { createFileRoute } from "@tanstack/react-router";
import { PracticeCard } from "@/components/PracticeCard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Falar — Révision de phrases en portugais" },
      {
        name: "description",
        content:
          "Application de révision pour s'entraîner à prononcer des phrases en portugais à partir de leur traduction française.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.06_140)] via-[oklch(0.98_0.05_85)] to-[oklch(0.96_0.07_240)] dark:from-[oklch(0.2_0.08_140)] dark:via-[oklch(0.18_0.05_240)] dark:to-[oklch(0.2_0.08_85)]">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
        <header className="mb-12 text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[oklch(0.5_0.2_140)] dark:text-[oklch(0.8_0.18_85)]">
            🇫🇷 Português · prática diária 🇧🇷
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[oklch(0.55_0.22_140)] via-[oklch(0.7_0.18_85)] to-[oklch(0.45_0.2_240)] bg-clip-text text-transparent">
            Falar
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Lisez la phrase en français, prononcez-la en portugais, et recevez un feedback instantané. 🎉
          </p>
        </header>
        <PracticeCard />
      </div>
      <Toaster position="top-center" />
    </main>
  );
}
