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

function generatePdf(recommendations: Recommendations, personalityName: string, firstName?: string) {
  import("jspdf").then(({ jsPDF }) => {
    import("jspdf-autotable").then(() => {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const colleges = recommendations.colleges || [];
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      // --- Header banner ---
      doc.setFillColor(30, 58, 95); // deep navy
      doc.rect(0, 0, pageW, 100, "F");
      doc.setFillColor(59, 130, 246); // accent blue stripe
      doc.rect(0, 95, pageW, 5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("Collegra Results", margin, 50);
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      const subtitle = firstName ? `${firstName}'s College Personality: ${personalityName}` : `College Personality: ${personalityName}`;
      doc.text(subtitle, margin, 75);

      y = 125;

      // --- Student profile summary ---
      const profile = recommendations.studentProfile;
      if (profile) {
        doc.setTextColor(30, 58, 95);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Your Student Profile", margin, y);
        y += 18;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const summaryLines = doc.splitTextToSize(profile.summary, contentW);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 13 + 8;

        if (profile.topPriorities?.length) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Top priorities: ${profile.topPriorities.join(" · ")}`, margin, y);
          y += 20;
        }
      }

      // --- Divider ---
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 20;

      // --- College cards ---
      doc.setTextColor(30, 58, 95);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Your Top College Matches", margin, y);
      y += 24;

      const fitColors: Record<string, [number, number, number]> = {
        Likely: [34, 197, 94],
        Match: [59, 130, 246],
        Reach: [249, 115, 22],
      };

      colleges.forEach((college, idx) => {
        // Pre-calculate card height
        const whyLines = college.whyFit ? doc.splitTextToSize(`"${college.whyFit}"`, contentW - 28) : [];
        const stats = [
          { label: "Acceptance", value: college.acceptanceRate },
          { label: "Net Price", value: college.netPrice },
          { label: "Setting", value: college.setting },
          { label: "Students", value: college.studentBody },
        ].filter(s => s.value && s.value !== "Premium");
        
        let cardH = 52; // header area
        if (stats.length) cardH += 28;
        if (whyLines.length) cardH += whyLines.length * 12 + 6;
        if (college.topPrograms?.length) cardH += 14;
        cardH += 8; // bottom padding

        if (y + cardH > 720) {
          doc.addPage();
          y = margin;
        }

        const cardTop = y;

        // Card background first
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, cardTop, contentW, cardH, 6, 6, "F");
        
        // Left accent bar
        const badgeColor = fitColors[college.fitCategory] || [100, 100, 100];
        doc.setFillColor(...badgeColor);
        doc.roundedRect(margin, cardTop, 4, cardH, 2, 2, "F");

        // Rank badge
        doc.setFillColor(...badgeColor);
        doc.circle(margin + 24, cardTop + 22, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${idx + 1}`, margin + 24, cardTop + 27, { align: "center" });

        // College name
        const nameX = margin + 46;
        doc.setTextColor(30, 58, 95);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(college.name, nameX, cardTop + 20);

        // Location & fit
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`${college.location}  ·  ${college.fitScore}% fit  ·  ${college.fitCategory}`, nameX, cardTop + 34);

        let innerY = cardTop + 52;

        // Stats row
        if (stats.length) {
          doc.setFontSize(8);
          const statW = contentW / stats.length;
          stats.forEach((stat, si) => {
            const sx = margin + si * statW + 16;
            doc.setTextColor(130, 130, 130);
            doc.setFont("helvetica", "normal");
            doc.text(stat.label, sx, innerY);
            doc.setTextColor(30, 58, 95);
            doc.setFont("helvetica", "bold");
            doc.text(stat.value, sx, innerY + 11);
          });
          innerY += 28;
        }

        // Why it's a good fit
        if (whyLines.length) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text(whyLines, margin + 16, innerY);
          innerY += whyLines.length * 12 + 6;
        }

        // Top programs
        if (college.topPrograms?.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(59, 130, 246);
          doc.text(`Programs: ${college.topPrograms.slice(0, 4).join(" · ")}`, margin + 16, innerY);
        }

        y = cardTop + cardH + 12;
      });

      // --- Footer ---
      if (y > 700) {
        doc.addPage();
        y = margin;
      }
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 16;
      doc.setTextColor(140, 140, 140);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Generated by Collegra · getcollegra.com", margin, y);
      doc.text(new Date().toLocaleDateString(), pageW - margin, y, { align: "right" });

      doc.save("collegra-results.pdf");
    });
  });
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
    generatePdf(recommendations, personalityName, firstName);
    toast({ title: "Downloading PDF!", description: "Your results card is being generated." });
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
              Download PDF
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ShareResults;
