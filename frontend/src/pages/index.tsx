import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../auth/context/AuthContext';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-200 selection:text-emerald-900 overflow-x-hidden">
      <Head>
        <title>AgroNavis | Field Intelligence for Smart Farming</title>
        <meta name="description" content="AI-powered plant disease detection, precise fertilizer calculations, and real-time farm mapping." />
      </Head>

      {/* Navbar */}
      <nav className="fixed w-full z-50 transition-all duration-300 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-emerald-500/30 shadow-lg">
                A
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">
                AgroNavis
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {mounted && !loading && (
                user ? (
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all shadow-md hover:shadow-emerald-500/20 active:scale-95"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <button 
                    onClick={() => router.push('/auth/login')}
                    className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all shadow-md active:scale-95"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none -z-10">
          <div className="absolute top-[10%] left-[10%] w-[40rem] h-[40rem] bg-emerald-200/40 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob"></div>
          <div className="absolute top-[20%] right-[10%] w-[35rem] h-[35rem] bg-teal-200/40 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-6 border border-emerald-100 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            AgroNavis AI 2.0 is Live
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 text-slate-900 max-w-4xl mx-auto leading-[1.1]">
            Intelligence for the <br className="hidden lg:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Modern Farm
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Diagnose plant diseases instantly, calculate precise fertilizer needs, and map your fields with AI. Built for offline resilience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => router.push(user ? '/dashboard' : '/auth/login')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg transition-all shadow-xl shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              {user ? 'Open Dashboard' : 'Get Started Free'}
            </button>
            <button 
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-lg transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              View Demo
            </button>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-24 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Fertilizer Precision</h3>
              <p className="text-slate-600 leading-relaxed">
                Calculate the exact NPK requirements and costs per acre based on specific crop needs and regional soil data.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <circle cx="12" cy="12" r="4"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">CropScan AI</h3>
              <p className="text-slate-600 leading-relaxed">
                Upload a photo of a sick leaf. Our edge-optimized ResNet model diagnoses 87 distinct plant diseases instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">GPS Field Mapping</h3>
              <p className="text-slate-600 leading-relaxed">
                Draw your field boundaries on the map to accurately calculate acreage. Integrates seamlessly with weather and soil APIs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
            A
          </div>
          <span className="font-bold text-lg text-white">AgroNavis</span>
        </div>
        <p>© 2026 AgroNavis. All rights reserved.</p>
      </footer>
    </div>
  );
}