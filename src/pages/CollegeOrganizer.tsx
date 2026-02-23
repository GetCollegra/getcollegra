import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CollegeOrganizer = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-16 flex-1">
        <iframe
          src="/college-organizer.html"
          title="College Organizer"
          className="w-full border-0"
          style={{ minHeight: "calc(100vh - 8rem)" }}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CollegeOrganizer;
