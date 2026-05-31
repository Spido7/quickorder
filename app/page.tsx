"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface MockItem {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description: string;
}

const MOCK_ITEMS: MockItem[] = [
  { id: "1", name: "Kullhad Tea", price: 20, category: "Drinks", emoji: "☕", description: "Traditional clay-cup cardamom milk tea." },
  { id: "2", name: "Filter Coffee", price: 40, category: "Drinks", emoji: "☕", description: "Authentic South Indian chicory blend." },
  { id: "3", name: "Bun Maska", price: 45, category: "Snacks", emoji: "🍞", description: "Warm toasted bun with loaded fresh butter." },
  { id: "4", name: "Samosa Pav", price: 30, category: "Snacks", emoji: "🥪", description: "Spicy potato samosa inside a soft buttered pav." },
  { id: "5", name: "Mango Lassi", price: 60, category: "Drinks", emoji: "🥛", description: "Chilled thick yogurt drink with mango pulp." },
  { id: "6", name: "Chocolate Brownie", price: 99, category: "Desserts", emoji: "🍰", description: "Rich fudge brownie served warm." },
];

export default function LandingPage() {
  // Demo State
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [demoCart, setDemoCart] = useState<Record<string, number>>({});
  
  // Contact Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    restaurant: "",
    message: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  // Scroll reveal intersection observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
      ".reveal-text-fill, .reveal-text-fill-accent, .reveal-slide-up, .reveal-card-pop"
    );
    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Demo Cart Functions
  const handleAddDemo = (id: string) => {
    setDemoCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveDemo = (id: string) => {
    setDemoCart((prev) => {
      const updated = { ...prev };
      if (updated[id] <= 1) {
        delete updated[id];
      } else {
        updated[id]--;
      }
      return updated;
    });
  };

  const getDemoCartTotal = () => {
    return Object.entries(demoCart).reduce((acc, [id, qty]) => {
      const item = MOCK_ITEMS.find((i) => i.id === id);
      return acc + (item ? item.price * qty : 0);
    }, 0);
  };

  const getDemoCartCount = () => {
    return Object.values(demoCart).reduce((acc, qty) => acc + qty, 0);
  };

  // Contact Form Handler
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setFormError("Please fill out all required fields.");
      return;
    }
    if (!formData.email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }
    setFormError("");
    setFormSubmitted(true);
  };

  // Plan Selection Handler
  const handleSelectPlan = (planName: string, messageText: string) => {
    setFormData((prev) => ({
      ...prev,
      message: messageText,
    }));
    setFormSubmitted(false);

    // Scroll smoothly to contact section
    const contactSection = document.getElementById("contact");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
      // Focus name field
      const nameInput = document.getElementById("contact-name");
      if (nameInput) {
        setTimeout(() => {
          (nameInput as HTMLInputElement).focus();
        }, 100);
      }
    }
  };

  const categories = ["All", "Drinks", "Snacks", "Desserts"];
  const filteredItems = selectedCategory === "All"
    ? MOCK_ITEMS
    : MOCK_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-warning selection:text-black antialiased">
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-background border-b-4 border-black no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center font-display font-black text-xl">
              ⚡
            </div>
            <Link href="/" className="font-display font-black text-2xl tracking-tight uppercase hover:text-accent transition-colors">
              QuickOrder <span className="text-accent">POS</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 font-black uppercase text-sm tracking-wider">
            <a href="#features" className="hover:text-accent transition-colors">Features</a>
            <a href="#demo" className="hover:text-accent transition-colors">Live Demo</a>
            <a href="#pricing" className="hover:text-accent transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-accent transition-colors">Contact Us</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-accent text-white font-black uppercase text-sm tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 border-b-4 border-black overflow-hidden bg-white">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 2px, transparent 2px)", backgroundSize: "24px 24px" }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-warning border-2 border-black shadow-[2px_2px_0px_0px_#000] font-black uppercase text-xs tracking-widest w-fit">
                ⚡ ZERO COMMISSION UPI PAYMENTS
              </div>
              <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl leading-none uppercase tracking-tight text-black">
                Digital Menus, <br />
                <span className="text-accent underline decoration-black decoration-wavy underline-offset-8">Instant Payments.</span>
              </h1>
              <p className="text-lg md:text-xl font-bold text-black/80 max-w-2xl leading-relaxed">
                Empower your cafe or restaurant. Let customers scan table-specific QR codes, browse your menu, place orders, and pay directly to your UPI ID. Zero gateway fees, zero wait times.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/setup"
                  className="px-8 py-4 bg-accent text-white font-black uppercase text-lg tracking-wider border-3 border-black shadow-[5px_5px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none text-center"
                >
                  Create Your Menu Free
                </Link>
                <a
                  href="#demo"
                  className="px-8 py-4 bg-warning text-black font-black uppercase text-lg tracking-wider border-3 border-black shadow-[5px_5px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none text-center"
                >
                  See Interactive Demo
                </a>
              </div>

              {/* Trust Strip */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-black/10">
                <div>
                  <p className="font-display font-black text-2xl sm:text-3xl text-black">₹0</p>
                  <p className="text-xs font-black uppercase text-black/60 tracking-wider">Transaction Fees</p>
                </div>
                <div>
                  <p className="font-display font-black text-2xl sm:text-3xl text-black">2 Min</p>
                  <p className="text-xs font-black uppercase text-black/60 tracking-wider">Onboarding Time</p>
                </div>
                <div>
                  <p className="font-display font-black text-2xl sm:text-3xl text-black">100%</p>
                  <p className="text-xs font-black uppercase text-black/60 tracking-wider">Direct UPI Settlement</p>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Graphic / Interactive Mini Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-[#f5f2eb] border-4 border-black shadow-[8px_8px_0px_0px_#000] p-4 relative">
                
                {/* Mock Phone Status Bar */}
                <div className="flex justify-between items-center pb-3 border-b-2 border-black/20 mb-3 text-xs font-black text-black/60">
                  <span>📶 QuickOrder Network</span>
                  <span>12:00 PM</span>
                  <span>🔋 99%</span>
                </div>

                {/* Cafe Mock Header */}
                <div className="bg-white border-2 border-black p-3 mb-4 shadow-[3px_3px_0px_0px_#000]">
                  <h3 className="font-display font-black text-lg text-black uppercase tracking-tight">☕ CAFE NIRVANA</h3>
                  <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Table 04 • UPI: cafe@upi</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 border-2 border-black text-xs font-black uppercase transition-all rounded-none shrink-0 ${
                        selectedCategory === cat
                          ? "bg-accent text-white shadow-none translate-x-[1px] translate-y-[1px]"
                          : "bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Menu list */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const qty = demoCart[item.id] || 0;
                    return (
                      <div key={item.id} className="bg-white border-2 border-black p-2.5 flex justify-between items-center shadow-[2px_2px_0px_0px_#000]">
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{item.emoji}</span>
                            <span className="font-black text-xs uppercase text-black">{item.name}</span>
                          </div>
                          <p className="text-[9px] text-black/60 font-medium leading-tight mt-0.5">{item.description}</p>
                          <p className="text-xs font-black text-accent mt-1">₹{item.price}</p>
                        </div>
                        
                        {/* Add/Remove Action */}
                        <div className="shrink-0">
                          {qty > 0 ? (
                            <div className="flex items-center border-2 border-black bg-warning">
                              <button
                                onClick={() => handleRemoveDemo(item.id)}
                                className="px-2 py-1 font-black text-xs hover:bg-black/10 border-r-2 border-black"
                              >
                                -
                              </button>
                              <span className="px-2 font-black text-xs">{qty}</span>
                              <button
                                onClick={() => handleAddDemo(item.id)}
                                className="px-2 py-1 font-black text-xs hover:bg-black/10 border-l-2 border-black"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddDemo(item.id)}
                              className="px-3 py-1 bg-warning font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sticky Cart Action Mock */}
                {getDemoCartCount() > 0 && (
                  <div className="mt-4 pt-3 border-t-2 border-black/20 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase text-black/60">Cart Value</p>
                      <p className="text-base font-black text-black">₹{getDemoCartTotal()}</p>
                    </div>
                    <button
                      onClick={() => alert("This is a demo menu preview! Setup your restaurant to experience real payments.")}
                      className="px-4 py-2 bg-accent text-white font-black text-xs uppercase border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                    >
                      Pay via UPI ({getDemoCartCount()})
                    </button>
                  </div>
                )}
                
                {/* Floating Demo Sticker */}
                <div className="absolute -top-3 -right-3 bg-warning text-black border-2 border-black px-2 py-1 font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#000] rotate-6 animate-pulse">
                  Try Clicking Me!
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background border-b-4 border-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black flex flex-wrap justify-center gap-x-3 gap-y-1">
              <span className="reveal-text-fill">Built</span>
              <span className="reveal-text-fill">for</span>
              <span className="bg-warning px-2 py-1 border-2 border-black inline-block -rotate-1 text-black reveal-slide-up">Speed</span>
              <span className="reveal-text-fill">&</span>
              <span className="reveal-text-fill-accent">Profitability</span>
            </h2>
            <p className="text-base sm:text-lg font-bold text-black/70 reveal-slide-up">
              Skip complex aggregates, expensive POS hardware, and payment delays. QuickOrder brings a lean digital setup direct to your cafe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-warning border-3 border-black p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between reveal-card-pop" style={{ transitionDelay: '0ms' }}>
              <div>
                <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-2xl font-black mb-6 shadow-[2px_2px_0px_0px_#000]">
                  💸
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tight mb-2 text-black">Direct UPI Routing</h3>
                <p className="text-sm font-bold text-black/85 leading-relaxed">
                  UPI payments go straight from customer to merchant. Zero intermediaries, meaning 0% commission fees.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-black/10 text-xs font-black uppercase text-black/60">
                100% Direct Settlement
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#d8f3dc] border-3 border-black p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between reveal-card-pop" style={{ transitionDelay: '100ms' }}>
              <div>
                <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-2xl font-black mb-6 shadow-[2px_2px_0px_0px_#000]">
                  🔔
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tight mb-2 text-black">Real-Time Kitchen</h3>
                <p className="text-sm font-bold text-black/85 leading-relaxed">
                  Incoming orders are pushed straight to your screen with instant audio bell alerts. Never miss an order during rush hour.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-black/10 text-xs font-black uppercase text-black/60">
                WebSocket Powered
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border-3 border-black p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between reveal-card-pop" style={{ transitionDelay: '200ms' }}>
              <div>
                <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-2xl font-black mb-6 shadow-[2px_2px_0px_0px_#000]">
                  🖨️
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tight mb-2 text-black">Instant QRs</h3>
                <p className="text-sm font-bold text-black/85 leading-relaxed">
                  Generate print-ready QR codes pre-configured for individual tables. Choose single print or batch download.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-black/10 text-xs font-black uppercase text-black/60">
                Table & Takeaway codes
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-surface-elevated border-3 border-black p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between reveal-card-pop" style={{ transitionDelay: '300ms' }}>
              <div>
                <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-2xl font-black mb-6 shadow-[2px_2px_0px_0px_#000]">
                  📲
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tight mb-2 text-black font-sans">No App Needed</h3>
                <p className="text-sm font-bold text-black/85 leading-relaxed">
                  PWA caching makes the customer menu load instantly. No app store downloads or sign-ups required to order.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-black/10 text-xs font-black uppercase text-black/60">
                PWA Enabled
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Demo Link/Interactivity Section */}
      <section id="demo" className="py-20 bg-white border-b-4 border-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-4 border-black bg-background p-8 lg:p-12 shadow-[8px_8px_0px_0px_#000] relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <span className="px-3 py-1 bg-accent text-white border-2 border-black font-black uppercase text-xs tracking-widest w-fit inline-block">
                  EXPERIENCE IT LIVE
                </span>
                <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black">
                  <span className="reveal-text-fill block sm:inline">Want to see the</span>{" "}
                  <span className="reveal-text-fill-accent block sm:inline">Customer Storefront?</span>
                </h2>
                <p className="text-base sm:text-lg font-bold text-black/80 reveal-slide-up">
                  Open the menu preview page to see the exact interface your customers will use when scanning a QR code. Test adding mock food items to the cart, opening the checkout drawer, and exploring receipt layouts.
                </p>
                <div className="pt-2">
                  <Link
                    href="/preview-menu"
                    className="inline-block px-6 py-3.5 bg-accent text-white font-black uppercase text-sm tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none"
                  >
                    Open Customer Menu Preview
                  </Link>
                </div>
              </div>
              
              <div className="lg:col-span-5 hidden lg:flex justify-center">
                {/* Visual Graphic representation of QR Scan */}
                <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000] text-center w-full max-w-sm reveal-card-pop">
                  <div className="bg-[#f5f2eb] border-2 border-black p-4 inline-block mb-4">
                    {/* Simulated QR Code SVG representation */}
                    <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="100" fill="white"/>
                      <rect x="5" y="5" width="25" height="25" fill="black" stroke="black" strokeWidth="2"/>
                      <rect x="10" y="10" width="15" height="15" fill="white"/>
                      <rect x="12" y="12" width="11" height="11" fill="black"/>
                      
                      <rect x="70" y="5" width="25" height="25" fill="black" stroke="black" strokeWidth="2"/>
                      <rect x="75" y="10" width="15" height="15" fill="white"/>
                      <rect x="77" y="12" width="11" height="11" fill="black"/>
                      
                      <rect x="5" y="70" width="25" height="25" fill="black" stroke="black" strokeWidth="2"/>
                      <rect x="10" y="75" width="15" height="15" fill="white"/>
                      <rect x="12" y="77" width="11" height="11" fill="black"/>
                      
                      {/* Random squares to simulate QR code data */}
                      <rect x="40" y="10" width="10" height="10" fill="black"/>
                      <rect x="50" y="20" width="10" height="5" fill="black"/>
                      <rect x="45" y="35" width="15" height="15" fill="black"/>
                      <rect x="15" y="45" width="10" height="10" fill="black"/>
                      <rect x="75" y="45" width="15" height="10" fill="black"/>
                      <rect x="45" y="70" width="15" height="15" fill="black"/>
                      <rect x="75" y="75" width="10" height="10" fill="black"/>
                      <rect x="40" y="50" width="5" height="10" fill="black"/>
                      <rect x="60" y="5" width="5" height="15" fill="black"/>
                      <rect x="65" y="85" width="10" height="5" fill="black"/>
                    </svg>
                  </div>
                  <h4 className="font-display font-black text-sm uppercase text-black">Scan Table 04</h4>
                  <p className="text-xs text-black/60 font-bold mt-1">Directly opens: quickorder.cafe/cafe-nirvana?table=4</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black flex flex-wrap justify-center gap-x-3 gap-y-1">
              <span className="reveal-text-fill">Simple,</span>{" "}
              <span className="bg-[#d8f3dc] px-2 py-1 border-2 border-black inline-block rotate-1 text-black reveal-slide-up">Flat-Rate</span>{" "}
              <span className="reveal-text-fill-accent">Pricing</span>
            </h2>
            <p className="text-base sm:text-lg font-bold text-black/70 reveal-slide-up">
              No tricky percentages, setup fees, or payment processing overrides. Pay a flat subscription rate, keep all your margins.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Plan 1 */}
            <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between relative reveal-card-pop" style={{ transitionDelay: '0ms' }}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/50">BASIC SETUP</span>
                  <h3 className="font-display font-black text-2xl uppercase tracking-tight text-black">Chai Tier</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-4xl text-black">₹159</span>
                    <span className="text-sm font-bold text-black/60 uppercase">/ month</span>
                  </div>
                  <p className="text-xs font-bold text-black/60">For micro-stalls and small taprooms.</p>
                </div>

                <ul className="space-y-3 text-sm font-bold text-black/90 pt-4 border-t border-black/10">
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Basic menu setup (up to 10 items)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Table & Counter QR codes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Standard UPI intent routing
                  </li>
                  <li className="flex items-center gap-2 text-black/40 line-through">
                    <span>✗</span> Real-time order push notifications
                  </li>
                  <li className="flex items-center gap-2 text-black/40 line-through">
                    <span>✗</span> Audio alerts on incoming tickets
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleSelectPlan("Chai Tier", "Hello! I want to set up my shop on the Chai Tier (₹159/month). Please help me with the setup.")}
                  className="block w-full py-3 bg-white text-black font-black uppercase text-sm tracking-widest text-center border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none cursor-pointer"
                >
                  Start Basic Setup
                </button>
              </div>
            </div>

            {/* Plan 2 */}
            <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between relative reveal-card-pop" style={{ transitionDelay: '100ms' }}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/50">GROWING CAFE</span>
                  <h3 className="font-display font-black text-2xl uppercase tracking-tight text-black">Filter Coffee</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-4xl text-black">₹259</span>
                    <span className="text-sm font-bold text-black/60 uppercase">/ month</span>
                  </div>
                  <p className="text-xs font-bold text-black/60">For growing cafes, food trucks & diners.</p>
                </div>

                <ul className="space-y-3 text-sm font-bold text-black/90 pt-4 border-t border-black/10">
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Up to 50 active menu items
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Custom table count configuration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Standard UPI routing + receipt print
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success text-base">✓</span> Real-time order monitoring dashboard
                  </li>
                  <li className="flex items-center gap-2 text-black/40 line-through">
                    <span>✗</span> Instant audio alerts on incoming orders
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleSelectPlan("Filter Coffee", "Hello! I want to set up my shop on the Filter Coffee Tier (₹259/month). Please help me with the setup.")}
                  className="block w-full py-3 bg-white text-black font-black uppercase text-sm tracking-widest text-center border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none cursor-pointer"
                >
                  Choose Starter
                </button>
              </div>
            </div>

            {/* Plan 3 (PRO) */}
            <div className="bg-[#fcbf49] border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000] flex flex-col justify-between relative transform lg:-translate-y-2 reveal-card-pop" style={{ transitionDelay: '200ms' }}>
              {/* Popular Sticker */}
              <div className="absolute -top-4 left-6 bg-accent text-white border-2 border-black px-3 py-1 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0px_0px_#000]">
                BEST VALUE
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black/60">ALL-INCLUSIVE PRO</span>
                  <h3 className="font-display font-black text-2xl uppercase tracking-tight text-black">Espresso Tier</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-4xl text-black">₹499</span>
                    <span className="text-sm font-bold text-black/85 uppercase">/ month</span>
                  </div>
                  
                  {/* Trial Promo Notification */}
                  <div className="bg-white border-2 border-black p-2 mt-2 shadow-[2px_2px_0px_0px_#000] text-[11px] font-black text-accent uppercase tracking-tight">
                    🔥 2 MONTHS FREE TRIAL! THEN Billed AT ₹259/MO FOR 1 YEAR
                  </div>
                </div>

                <ul className="space-y-3 text-sm font-bold text-black pt-4 border-t border-black/20">
                  <li className="flex items-center gap-2">
                    <span className="text-black text-base">✓</span> Unlimited active items & tables
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-black text-base">✓</span> Live WebSockets audio order alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-black text-base">✓</span> Advanced UPI transaction tracking (tr)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-black text-base">✓</span> Interactive POS kitchen screen
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-black text-base">✓</span> PWA offline support and manifest files
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleSelectPlan("Espresso Tier", "Hello! I want to set up my shop on the Espresso Tier (₹499/month, with the 2-month free trial promo). Please help me with the setup.")}
                  className="block w-full py-4 bg-accent text-white font-black uppercase text-sm tracking-widest text-center border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none cursor-pointer"
                >
                  Start 2-Month Free Trial
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white border-b-4 border-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12 space-y-4">
            <h2 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black reveal-text-fill">
              Get in Touch
            </h2>
            <p className="text-base sm:text-lg font-bold text-black/70 reveal-slide-up">
              Have questions about UPI merchant categories, printing layout configuration, or customized deployments? Drop us a line.
            </p>
          </div>

          <div className="bg-background border-4 border-black p-6 sm:p-10 shadow-[8px_8px_0px_0px_#000] reveal-card-pop">
            {formSubmitted ? (
              <div className="bg-[#d8f3dc] border-3 border-black p-8 text-center space-y-4">
                <span className="text-5xl">✉️</span>
                <h3 className="font-display font-black text-2xl uppercase tracking-tight text-black">Message Sent Successfully!</h3>
                <p className="font-bold text-black/80 max-w-md mx-auto">
                  Thanks for reaching out! A QuickOrder representative will contact you via email at <span className="underline font-black">{formData.email}</span> within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setFormData({ name: "", email: "", restaurant: "", message: "" });
                    setFormSubmitted(false);
                  }}
                  className="mt-4 px-6 py-2.5 bg-white text-black font-black uppercase text-xs tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-6">
                
                {formError && (
                  <div className="bg-accent/10 border-2 border-accent text-accent p-3 font-bold text-sm uppercase tracking-wide">
                    ⚠️ {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-black">Name *</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-white border-2 border-black p-3 font-bold text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-black">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. rahul@example.com"
                      className="w-full bg-white border-2 border-black p-3 font-bold text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-black">Restaurant / Cafe Name</label>
                  <input
                    type="text"
                    value={formData.restaurant}
                    onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                    placeholder="e.g. Chai Point Bangalore"
                    className="w-full bg-white border-2 border-black p-3 font-bold text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-black">Your Message *</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us what you need help with..."
                    className="w-full bg-white border-2 border-black p-3 font-bold text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3.5 bg-warning text-black font-black uppercase text-sm tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all rounded-none cursor-pointer"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-auto border-t-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center border-b-2 border-white/20 pb-8 mb-8">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="font-display font-black text-xl tracking-tight uppercase">QUICKORDER POS</span>
              </div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wide">
                Direct-to-bank UPI digital menus for Indian food hubs. Setup in minutes. Keep 100% of your earnings.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 font-black uppercase text-xs tracking-wider justify-start md:justify-center">
              <a href="#features" className="hover:text-accent transition-colors">Features</a>
              <a href="#demo" className="hover:text-accent transition-colors">Live Demo</a>
              <a href="#pricing" className="hover:text-accent transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-accent transition-colors">Contact</a>
            </div>

            <div className="text-left md:text-right space-y-1">
              <p className="text-xs font-black uppercase text-white/50 tracking-wider">ESTABLISHED IN INDIA</p>
              <p className="text-sm font-bold text-white/80">© {new Date().getFullYear()} QuickOrder POS. All rights reserved.</p>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] font-black uppercase text-white/40 tracking-widest gap-2">
            <div>
              Made with ☕ & Neo-Brutalism
            </div>
            <div>
              UPI Deep Link Specifications compliance • NPCI Merchant Category 5812
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
