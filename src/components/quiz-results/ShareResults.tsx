import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Recommendations } from "@/types/college";

interface ShareResultsProps {
  recommendations: Recommendations;
  personalityName: string;
  firstName?: string;
}

const ShareResults = ({ recommendations, personalityName, firstName }: ShareResultsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const colleges = recommendations.colleges || [];
  const topNames = colleges.slice(0, 3).map((c) => c.name).join(", ");

  const shareText = `I got the '${personalityName}' college personality on Collegra 🎓\n\nMy top matches were ${colleges.length >= 3 ? `${colleges[0].name}, ${colleges[1].name}, and ${colleges[2].name}` : topNames}.\n\nTake the quiz and see your results:\nhttps://getcollegra.com`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Collegra College Personality", text: shareText, url: window.location.href });
      } catch {
        // user cancelled
      }
    } else {
      await handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast({ title: "Copied!", description: "Your results have been copied to clipboard." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Could not copy", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    // Generate a simple text card for download
    const lines = [
      `🎓 Collegra College Personality Results`,
      ``,
      firstName ? `Student: ${firstName}` : "",
      `Personality: ${personalityName}`,
      ``,
      `Top College Matches:`,
      ...colleges.slice(0, 5).map((c, i) => `  ${i + 1}. ${c.name} — ${c.fitScore}% fit (${c.fitCategory})`),
      ``,
      `Take the quiz: getcollegra.lovable.app`,
    ].filter(Boolean);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collegra-results.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Your results card has been saved." });
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-background">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-semibold mb-3"
          >
            <Share2 className="w-4 h-4" />
            Share Your Results
          </motion.div>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 sm:mb-3">
            Show off your personality
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Share your college personality and top matches with friends and family
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              onClick={handleShare}
              size="lg"
              className="rounded-full gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-bold shadow-card"
            >
              <Share2 className="w-4 h-4" />
              Share My Personality
            </Button>
            <Button
              onClick={handleCopy}
              size="lg"
              variant="outline"
              className="rounded-full gap-2 border-primary/30 text-primary font-semibold"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy My Results"}
            </Button>
            <Button
              onClick={handleDownload}
              size="lg"
              variant="outline"
              className="rounded-full gap-2 border-border text-foreground font-semibold"
            >
              <Download className="w-4 h-4" />
              Download Card
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ShareResults;
