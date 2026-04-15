import type { Recommendations } from "@/types/college";

/**
 * Generates a polished, branded Collegra personality & results PDF.
 * Royal blue (#1172C4) palette matching the website identity.
 */
export async function generateCollegraReport(
  recommendations: Recommendations,
  personalityName: string,
  personalityEmoji: string,
  personalityDescription: string,
  traits: { label: string; value: number }[],
  firstName?: string,
) {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentW = pageW - margin * 2;

  // ── Brand colours ──
  const navy: [number, number, number] = [17, 24, 39];
  const brand: [number, number, number] = [17, 114, 196]; // #1172C4
  const brandLight: [number, number, number] = [219, 234, 254];
  const white: [number, number, number] = [255, 255, 255];
  const slate: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [241, 245, 249];
  const fitColors: Record<string, [number, number, number]> = {
    Safety: [22, 163, 74],
    Match: [17, 114, 196],
    Reach: [234, 88, 12],
  };

  let y = 0;

  // ─── HEADER BAR ───
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 80, "F");

  // Accent stripe
  doc.setFillColor(...brand);
  doc.rect(0, 80, pageW, 4, "F");

  // Logo text
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Collegra", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 220);
  doc.text("Your College Personality Report", margin, 60);

  // Date right-aligned
  doc.setFontSize(9);
  doc.setTextColor(150, 170, 190);
  doc.text(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), pageW - margin, 42, { align: "right" });
  if (firstName) {
    doc.text(`Prepared for ${firstName}`, pageW - margin, 60, { align: "right" });
  }

  y = 108;

  // ─── PERSONALITY HERO CARD ───
  const cardH = 180;
  // Card shadow
  doc.setFillColor(200, 210, 230);
  doc.roundedRect(margin + 3, y + 3, contentW, cardH, 10, 10, "F");
  // Card bg – gradient effect via two rects
  doc.setFillColor(...brandLight);
  doc.roundedRect(margin, y, contentW, cardH, 10, 10, "F");
  // Left accent block
  doc.setFillColor(...brand);
  doc.roundedRect(margin, y, 6, cardH, 3, 3, "F");

  // Emoji circle
  const emojiCenterX = margin + 50;
  const emojiCenterY = y + 45;
  doc.setFillColor(...white);
  doc.circle(emojiCenterX, emojiCenterY, 28, "F");
  doc.setFillColor(...brand);
  doc.circle(emojiCenterX, emojiCenterY, 26, "F");
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.text(personalityEmoji, emojiCenterX, emojiCenterY + 8, { align: "center" });

  // Personality name
  const nameX = margin + 90;
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(personalityName, nameX, y + 38);

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...slate);
  const descLines = doc.splitTextToSize(personalityDescription, contentW - 100);
  doc.text(descLines, nameX, y + 56);

  // ── Trait bars inside the card ──
  const barStartY = y + 100;
  const barH = 10;
  const barW = contentW - 50;

  traits.forEach((trait, i) => {
    const ty = barStartY + i * 24;
    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...navy);
    doc.text(trait.label, margin + 20, ty - 2);

    // Percentage
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.text(`${trait.value}%`, margin + barW + 10, ty - 2);

    // Track
    doc.setFillColor(230, 235, 245);
    doc.roundedRect(margin + 20, ty + 2, barW - 30, barH, 5, 5, "F");

    // Fill
    doc.setFillColor(...brand);
    const fillW = Math.max(8, ((trait.value / 100) * (barW - 30)));
    doc.roundedRect(margin + 20, ty + 2, fillW, barH, 5, 5, "F");
  });

  y += cardH + 28;

  // ─── STUDENT PROFILE ───
  const profile = recommendations.studentProfile;
  if (profile) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...navy);
    doc.text("Your Student Profile", margin, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slate);
    const summaryLines = doc.splitTextToSize(profile.summary, contentW);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13 + 6;

    if (profile.topPriorities?.length) {
      // Priorities as pills
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brand);
      let px = margin;
      profile.topPriorities.forEach((p) => {
        const tw = doc.getTextWidth(p) + 16;
        if (px + tw > pageW - margin) { px = margin; y += 18; }
        doc.setFillColor(...brandLight);
        doc.roundedRect(px, y - 8, tw, 16, 8, 8, "F");
        doc.text(p, px + 8, y + 2);
        px += tw + 6;
      });
      y += 22;
    }
  }

  // ─── DIVIDER ───
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  // ─── COLLEGE MATCHES ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...navy);
  doc.text("Your Top College Matches", margin, y);
  y += 26;

  const colleges = recommendations.colleges || [];

  colleges.forEach((college, idx) => {
    // Pre-calculate card dimensions
    const whyLines = college.whyFit ? doc.splitTextToSize(`"${college.whyFit}"`, contentW - 36) : [];
    const stats = [
      { label: "Acceptance", value: college.acceptanceRate },
      { label: "Net Price", value: college.netPrice },
      { label: "Setting", value: college.setting },
      { label: "Students", value: college.studentBody },
    ].filter((s) => s.value && s.value !== "Premium");

    let cardHeight = 50;
    if (stats.length) cardHeight += 26;
    if (whyLines.length) cardHeight += whyLines.length * 11 + 6;
    if (college.topPrograms?.length) cardHeight += 14;
    cardHeight += 6;

    // Page break check
    if (y + cardHeight > pageH - 60) {
      doc.addPage();
      y = margin;
      // Mini header on new pages
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageW, 36, "F");
      doc.setFillColor(...brand);
      doc.rect(0, 36, pageW, 3, "F");
      doc.setTextColor(...white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Collegra — College Matches (cont.)", margin, 24);
      y = 58;
    }

    const cardTop = y;
    const fitColor = fitColors[college.fitCategory] || slate;

    // Card background
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, cardTop, contentW, cardHeight, 6, 6, "F");

    // Left accent bar
    doc.setFillColor(...fitColor);
    doc.roundedRect(margin, cardTop, 5, cardHeight, 2, 2, "F");

    // Rank circle
    doc.setFillColor(...fitColor);
    doc.circle(margin + 24, cardTop + 22, 13, "F");
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${idx + 1}`, margin + 24, cardTop + 26, { align: "center" });

    // Name + fit badge
    const cx = margin + 46;
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(college.name, cx, cardTop + 20);

    // Fit score pill
    const fitText = `${college.fitScore}% fit`;
    const fitTW = doc.getTextWidth(fitText) + 14;
    const fitPillX = cx + doc.getTextWidth(college.name) + 8;
    if (fitPillX + fitTW < pageW - margin) {
      doc.setFillColor(...fitColor);
      doc.roundedRect(fitPillX, cardTop + 10, fitTW, 16, 8, 8, "F");
      doc.setTextColor(...white);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(fitText, fitPillX + 7, cardTop + 21);
    }

    // Location + fit category
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(`${college.location}  ·  ${college.fitCategory}`, cx, cardTop + 34);

    let innerY = cardTop + 50;

    // Stats grid
    if (stats.length) {
      const statW = (contentW - 20) / stats.length;
      stats.forEach((stat, si) => {
        const sx = margin + 16 + si * statW;
        doc.setFontSize(7);
        doc.setTextColor(160, 165, 180);
        doc.setFont("helvetica", "normal");
        doc.text(stat.label.toUpperCase(), sx, innerY);
        doc.setFontSize(9);
        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.text(stat.value, sx, innerY + 11);
      });
      innerY += 26;
    }

    // Why it fits
    if (whyLines.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(90, 100, 120);
      doc.text(whyLines, margin + 16, innerY);
      innerY += whyLines.length * 11 + 6;
    }

    // Top programs
    if (college.topPrograms?.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...brand);
      doc.text(`Programs: ${college.topPrograms.slice(0, 4).join(" · ")}`, margin + 16, innerY);
    }

    y = cardTop + cardHeight + 10;
  });

  // ─── FOOTER ───
  if (y > pageH - 80) {
    doc.addPage();
    y = pageH - 70;
  }

  // Footer bar
  const footerY = pageH - 50;
  doc.setFillColor(...navy);
  doc.rect(0, footerY, pageW, 50, "F");
  doc.setFillColor(...brand);
  doc.rect(0, footerY, pageW, 3, "F");

  doc.setTextColor(180, 195, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("© 2026 Collegra™. All rights reserved.", margin, footerY + 22);
  doc.text("getcollegra.com", margin, footerY + 36);

  doc.setTextColor(140, 160, 190);
  doc.setFontSize(8);
  doc.text("This report is personalized and not a guarantee of admission.", pageW - margin, footerY + 22, { align: "right" });
  doc.text(new Date().toLocaleDateString(), pageW - margin, footerY + 36, { align: "right" });

  doc.save("collegra-personality-report.pdf");
}
