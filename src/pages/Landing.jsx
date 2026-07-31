import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import InterestLearning from "@/components/landing/InterestLearning";
import LevelAssessment from "@/components/landing/LevelAssessment";
import LandingPricing from "@/components/landing/LandingPricing";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body">
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <InterestLearning />
        <LevelAssessment />
        <LandingPricing />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}