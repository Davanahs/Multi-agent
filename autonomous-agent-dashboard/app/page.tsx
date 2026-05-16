'use client';

import { HeroSection } from '@/components/landing/hero-section';
import { FeatureCards } from '@/components/landing/feature-cards';
import { CTASection } from '@/components/landing/cta-section';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <HeroSection />
      <FeatureCards />
      <CTASection />
    </main>
  );
}
