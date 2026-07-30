"use client";

import React, { useState } from "react";

export default function ContactForm({ cafeName }: { cafeName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill out all input fields.");
      return;
    }
    setError("");
    setSubmitting(true);

    // Mock API submission timeout
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    }, 800);
  };

  if (submitted) {
    return (
      <div className="border-3 border-black bg-warning p-6 text-black shadow-[4px_4px_0px_0px_#000] text-center animate-pop">
        <span className="text-4xl">⚡</span>
        <h3 className="font-display font-black text-xl uppercase tracking-tight mt-2">
          Message Received!
        </h3>
        <p className="text-xs font-bold uppercase tracking-wider text-black/75 mt-1">
          We will get back to you via email shortly.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 px-4 py-2 bg-black text-white text-xs font-bold uppercase border-2 border-black hover:bg-zinc-800 transition-colors"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-3 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000] space-y-4">
      <h3 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black border-b-2 border-black pb-2 mb-4">
        Send Feedback / Query
      </h3>

      {error && (
        <div className="border-2 border-black bg-danger/10 text-danger p-2 text-xs font-bold uppercase">
          ⚠️ {error}
        </div>
      )}

      {/* Name Input */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-tight text-black">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className="w-full px-3 py-2 border-2 border-black bg-white text-black font-sans text-sm focus:outline-none focus:bg-zinc-50"
        />
      </div>

      {/* Email Input */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-tight text-black">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. rahul@example.com"
          className="w-full px-3 py-2 border-2 border-black bg-white text-black font-sans text-sm focus:outline-none focus:bg-zinc-50"
        />
      </div>

      {/* Message textarea */}
      <div className="space-y-1">
        <label className="block text-xs font-black uppercase tracking-tight text-black">
          Your Message
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write your query regarding ${cafeName} or the platform...`}
          className="w-full px-3 py-2 border-2 border-black bg-white text-black font-sans text-sm focus:outline-none focus:bg-zinc-50 resize-y"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-warning text-black font-display font-black text-sm uppercase border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Submit Feedback"}
      </button>
    </form>
  );
}
