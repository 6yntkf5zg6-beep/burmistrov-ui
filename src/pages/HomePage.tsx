import { Header } from "../components/Header";
import { AboutAuthor } from "./home/AboutAuthor";
import { Hero } from "./home/Hero";
import { Patents } from "./home/Patents";
import { Publications } from "./home/Publications";
import { SiteEditingProvider } from "./home/siteEditing";
import { Technology } from "./home/Technology";

export function HomePage() {
  return (
    <SiteEditingProvider>
      <div className="relative bg-offwhite">
        <div className="absolute inset-x-0 top-0 z-10">
          <Header />
        </div>
        <Hero />
        <AboutAuthor />
        <Technology />
        <Patents />
        <Publications />
      </div>
    </SiteEditingProvider>
  );
}
