import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Lock, ArrowRight, User, Calendar, Clock, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

type Step = 'intro' | 'form' | 'preview'

export function Astrology() {
  const [step, setStep] = useState<Step>('intro')
  const [form, setForm] = useState({ name: '', date: '', time: '', location: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('preview')
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-padding container-narrow">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cosmos-accent/10 border border-cosmos-accent/20 text-cosmos-glow text-sm font-medium mb-8">
                <Lock className="w-3.5 h-3.5" /> Premium Experience
              </div>
              <h1 className="text-display-sm md:text-display-md font-semibold text-cosmos-pure mb-4">Your personal cosmic profile</h1>
              <p className="text-cosmos-silver max-w-lg mx-auto mb-12 leading-relaxed">
                Enter your birth details to generate a personalized astrology experience.
              </p>
              <button onClick={() => setStep('form')} className="btn-primary text-base px-8 py-3.5">
                <Sparkles className="w-4 h-4" /> Begin Your Chart <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="text-display-sm font-semibold text-cosmos-pure mb-2 text-center">Birth Information</h2>
              <p className="text-cosmos-silver text-center mb-10 text-sm">Accuracy improves with exact birth time and location.</p>
              <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm text-cosmos-silver mb-2"><User className="w-3.5 h-3.5" /> Name</label>
                  <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-cosmos-night/60 border border-white/10 text-cosmos-pure focus:outline-none focus:border-cosmos-accent/50" placeholder="Your name" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-cosmos-silver mb-2"><Calendar className="w-3.5 h-3.5" /> Date of Birth</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-cosmos-night/60 border border-white/10 text-cosmos-pure focus:outline-none focus:border-cosmos-accent/50" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-cosmos-silver mb-2"><Clock className="w-3.5 h-3.5" /> Exact Birth Time</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-cosmos-night/60 border border-white/10 text-cosmos-pure focus:outline-none focus:border-cosmos-accent/50" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-cosmos-silver mb-2"><MapPin className="w-3.5 h-3.5" /> Birth Location</label>
                  <input required type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-cosmos-night/60 border border-white/10 text-cosmos-pure focus:outline-none focus:border-cosmos-accent/50" placeholder="City, Country" />
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3.5 mt-4">Generate Chart Preview</button>
                <button type="button" onClick={() => setStep('intro')} className="btn-ghost w-full justify-center text-sm">Back</button>
              </form>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="card-premium p-8 md:p-12 max-w-lg mx-auto mb-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full border-2 border-cosmos-accent/40 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-cosmos-star" />
                </div>
                <h2 className="text-xl font-semibold text-cosmos-pure mb-2">Chart for {form.name || 'You'}</h2>
                <p className="text-sm text-cosmos-silver mb-6">{form.date} \u00b7 {form.location}</p>
                <div className="space-y-3 text-left mb-8">
                  {['Sun in Leo', 'Moon in Scorpio', 'Rising in Gemini', 'Venus in Virgo'].map((item) => (
                    <div key={item} className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-cosmos-silver">{item.split(' in ')[0]}</span>
                      <span className="text-sm text-cosmos-pure font-medium">{item.split(' in ')[1]}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-cosmos-void/50 border border-cosmos-accent/20">
                  <p className="text-sm text-cosmos-silver mb-4">Full interpretations are available with Lumen Premium.</p>
                  <Link to="/pricing" className="btn-primary w-full justify-center">Unlock Full Profile</Link>
                </div>
              </div>
              <p className="text-xs text-cosmos-silver/60">Astrology is offered as personalized entertainment and self-reflection, not scientific fact.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
