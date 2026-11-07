import React, { useState, useEffect } from 'react'
import {
  Trophy,
  Brain,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Target,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Check
} from 'lucide-react'

export interface PickItem {
  id: string
  game: string
  sport: string
  pick: string
  odds?: string
  confidence: number // 1 - 10
  why: string
  status: 'pending' | 'won' | 'lost'
  createdAt: string
  walrusBlobId?: string
  walrusJobId?: string
  txDigest?: string
  onchainAnchorBlock?: number
  verifiedOnchain?: boolean
}

export interface PatternInsight {
  title: string
  stat: string
  description: string
  sampleSize: number
  type: 'positive' | 'warning' | 'neutral'
}

interface StatsSummary {
  total: number
  settled: number
  wins: number
  overallWinRate: number
}

export default function App() {
  const [picks, setPicks] = useState<PickItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [insights, setInsights] = useState<PatternInsight[]>([])
  const [stats, setStats] = useState<StatsSummary>({ total: 0, settled: 0, wins: 0, overallWinRate: 0 })
  const [syncStatus, setSyncStatus] = useState<string>('Syncing with Tatum & Walrus...')
  const [latestBlock, setLatestBlock] = useState<number | null>(null)
  const [filterSport, setFilterSport] = useState<string>('ALL')

  // Form states
  const [game, setGame] = useState('')
  const [sport, setSport] = useState('NFL')
  const [pick, setPick] = useState('')
  const [odds, setOdds] = useState('-110')
  const [confidence, setConfidence] = useState(8)
  const [why, setWhy] = useState('')
  const [formSuccess, setFormSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchPicksAndPatterns = async () => {
    try {
      const res = await fetch('/api/tatum/picks')
      if (res.ok) {
        const data = await res.json()
        setPicks(data.picks || [])
        setInsights(data.insights || [])
        setStats(data.stats || { total: 0, settled: 0, wins: 0, overallWinRate: 0 })
      }
    } catch (e) {
      console.error('Failed to fetch picks', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/tatum/status')
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'connected') {
          setLatestBlock(data.latestBlock)
          setSyncStatus(`Tatum RPC Block #${data.latestBlock}`)
        } else {
          setSyncStatus('Onchain Connection Offline')
        }
      }
    } catch (e) {
      setSyncStatus('Local Memory Mode')
    }
  }

  useEffect(() => {
    fetchPicksAndPatterns()
    fetchStatus()
  }, [])

  const handleCreatePick = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!game.trim() || !pick.trim() || !why.trim()) {
      setFormError('Please fill in game matchup, pick, and rationale.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/tatum/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          sport,
          pick,
          odds,
          confidence,
          why
        })
      })

      if (res.ok) {
        setFormSuccess(true)
        setGame('')
        setPick('')
        setWhy('')
        setConfidence(8)
        fetchPicksAndPatterns()
        setTimeout(() => setFormSuccess(false), 3000)
      } else {
        const err = await res.json()
        setFormError(err.error || 'Failed to record pick')
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: 'won' | 'lost' | 'pending') => {
    try {
      const res = await fetch(`/api/tatum/picks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchPicksAndPatterns()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredPicks = filterSport === 'ALL'
    ? picks
    : picks.filter(p => p.sport === filterSport)

  return (
    <div className="min-h-screen bg-secondary text-primary">
      {/* Top Header */}
      <header className="border-b border-secondary bg-primary">
        <div className="max-w-7xl mx-auto px-xl py-lg flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div className="flex items-center gap-md">
            <div className="p-sm bg-utility-brand-50 border border-utility-brand-200 rounded-lg text-brand-primary">
              <Trophy className="w-6 h-6 text-fg-brand-primary" />
            </div>
            <div>
              <div className="flex items-center gap-xs">
                <h1 className="text-heading-sm font-bold text-primary">SportsPick Journal</h1>
                <span className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium text-utility-brand-700">
                  Walrus Memory
                </span>
              </div>
              <p className="text-sm text-tertiary">
                Decentralized pick journal, confidence pattern analysis & Tatum onchain proofs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-xs px-md py-xs rounded-full bg-primary border border-secondary text-xs text-secondary">
              <span className="w-2 h-2 rounded-full bg-success-primary" />
              <span>{syncStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                fetchPicksAndPatterns()
                fetchStatus()
              }}
              className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <RefreshCw className="w-4 h-4 text-fg-quaternary" />
              Sync
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-xl py-2xl space-y-2xl">
        {/* Pattern Insights Bar */}
        <section className="space-y-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs">
              <Sparkles className="w-5 h-5 text-fg-brand-primary" />
              <h2 className="text-heading-xs font-semibold text-primary">Walrus Memory Insights</h2>
            </div>
            <span className="text-xs text-quaternary">
              Overall Record: {stats.wins}-{stats.settled - stats.wins} ({stats.overallWinRate}% hit rate)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {insights.map((insight, idx) => (
              <section key={idx} className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-tertiary">{insight.title}</span>
                  <span
                    className={`inline-flex items-center rounded-md px-xs py-xxs font-medium text-xs border ${
                      insight.type === 'positive'
                        ? 'bg-utility-brand-50 text-utility-brand-700 border-utility-brand-200'
                        : insight.type === 'warning'
                        ? 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200'
                        : 'bg-utility-gray-50 text-utility-gray-700 border-secondary'
                    }`}
                  >
                    n = {insight.sampleSize} picks
                  </span>
                </div>
                <div className="flex items-baseline gap-xs">
                  <span
                    className={`text-heading-lg font-bold ${
                      insight.type === 'positive'
                        ? 'text-brand-primary'
                        : insight.type === 'warning'
                        ? 'text-warning-primary'
                        : 'text-primary'
                    }`}
                  >
                    {insight.stat}
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {insight.description}
                </p>
              </section>
            ))}
          </div>
        </section>

        {/* 2-Column: Pick Logger & Journal Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl">
          {/* Left Column: Form */}
          <section className="lg:col-span-5 rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl self-start">
            <div className="border-b border-secondary pb-md flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <PlusCircle className="w-5 h-5 text-fg-brand-primary" />
                <h3 className="text-heading-xs font-semibold text-primary">Log New Sports Pick</h3>
              </div>
              <span className="text-xs text-tertiary">
                {latestBlock ? `Block #${latestBlock}` : 'Onchain proof'}
              </span>
            </div>

            {formSuccess && (
              <div className="p-md bg-utility-success-50 border border-utility-success-200 rounded-lg flex items-center gap-sm text-xs text-utility-success-700">
                <CheckCircle2 className="w-4 h-4 text-fg-success-primary" />
                <span>Pick logged and committed to Walrus Memory!</span>
              </div>
            )}

            {formError && (
              <div className="p-md bg-utility-error-50 border border-error-subtle rounded-lg flex items-center gap-sm text-xs text-utility-error-700">
                <XCircle className="w-4 h-4 text-fg-error-primary" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePick} className="space-y-lg">
              {/* Sport & Odds */}
              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-sm">
                  <label className="text-sm font-medium text-secondary">Sport / League</label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="rounded-md bg-primary px-lg py-sm text-sm text-primary border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <option value="NFL">NFL Football</option>
                    <option value="NBA">NBA Basketball</option>
                    <option value="MLB">MLB Baseball</option>
                    <option value="NHL">NHL Hockey</option>
                    <option value="EPL">Premier League</option>
                    <option value="UFC">UFC / MMA</option>
                    <option value="NCAAF">College Football</option>
                    <option value="NCAAB">College Basketball</option>
                  </select>
                </div>
                <div className="flex flex-col gap-sm">
                  <label className="text-sm font-medium text-secondary">Odds / Line</label>
                  <input
                    type="text"
                    value={odds}
                    onChange={(e) => setOdds(e.target.value)}
                    placeholder="e.g. -110, +135"
                    className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                  />
                </div>
              </div>

              {/* Game */}
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Game / Matchup</label>
                <input
                  type="text"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder="e.g. 49ers vs Rams"
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              {/* Pick */}
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">My Pick</label>
                <input
                  type="text"
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  placeholder="e.g. 49ers -3.5 or Over 44.5"
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              {/* Confidence Slider 1-10 */}
              <div className="p-md bg-secondary border border-secondary rounded-lg space-y-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-secondary">Confidence (1 - 10)</span>
                  <span className="font-bold text-sm px-sm py-xxs rounded bg-brand-solid text-primary-on-brand">
                    {confidence} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-xs text-tertiary">
                  <span>1 (Hunch)</span>
                  <span>7+ (High Edge)</span>
                  <span>10 (Max)</span>
                </div>
              </div>

              {/* Why / Rationale */}
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Why (Analysis & Edge)</label>
                <textarea
                  rows={3}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="Matchup mismatch, rest advantage, injury report, weather factor..."
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              >
                <Brain className="w-4 h-4 text-fg-white" />
                {saving ? 'Anchoring to Walrus...' : 'Save Pick to Journal'}
              </button>
            </form>
          </section>

          {/* Right Column: History & Pattern List */}
          <section className="lg:col-span-7 space-y-lg">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-md rounded-xl border border-secondary bg-primary p-md px-xl shadow-xs">
              <div className="flex items-center gap-sm">
                <BarChart3 className="w-5 h-5 text-fg-brand-primary" />
                <h3 className="text-heading-xs font-semibold text-primary">Picks Journal</h3>
                <span className="inline-flex items-center gap-xs rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                  {filteredPicks.length} items
                </span>
              </div>

              <div className="flex items-center gap-xs">
                {['ALL', 'NFL', 'NBA', 'EPL', 'MLB'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterSport(s)}
                    className={`px-sm py-xxs text-xs font-medium rounded-md transition-colors ${
                      filterSport === s
                        ? 'bg-brand-solid text-primary-on-brand'
                        : 'bg-secondary text-secondary hover:bg-primary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Picks List */}
            {filteredPicks.length === 0 ? (
              <section className="rounded-xl border border-secondary bg-primary p-3xl text-center space-y-md shadow-xs">
                <div className="inline-flex p-lg rounded-full bg-secondary text-fg-quaternary">
                  <Target className="w-8 h-8 text-fg-quaternary" />
                </div>
                <div className="space-y-xs">
                  <h4 className="text-heading-xs font-semibold text-primary">No picks found</h4>
                  <p className="text-sm text-tertiary max-w-sm mx-auto">
                    Record your sports picks using the logger to trigger pattern recognition in Walrus Memory.
                  </p>
                </div>
              </section>
            ) : (
              <div className="space-y-md">
                {filteredPicks.map((item) => (
                  <section
                    key={item.id}
                    className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-sm">
                      <div>
                        <div className="flex items-center gap-xs">
                          <span className="inline-flex items-center rounded-md px-xs py-xxs text-xs font-medium bg-utility-gray-50 text-utility-gray-700 border border-secondary">
                            {item.sport}
                          </span>
                          <span className="text-xs text-tertiary">{item.game}</span>
                        </div>
                        <h4 className="text-heading-xs font-bold text-primary mt-xxs">
                          {item.pick}
                        </h4>
                        {item.odds && (
                          <span className="text-xs text-tertiary font-mono">Odds: {item.odds}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-xs self-start">
                        <span
                          className={`inline-flex items-center rounded-md px-sm py-xxs text-xs font-semibold border ${
                            item.confidence >= 7
                              ? 'bg-utility-brand-50 text-utility-brand-700 border-utility-brand-200'
                              : 'bg-utility-gray-50 text-utility-gray-700 border-secondary'
                          }`}
                        >
                          Conf: {item.confidence}/10
                        </span>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center border border-secondary rounded-md overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'won')}
                            className={`px-sm py-xxs font-medium ${
                              item.status === 'won'
                                ? 'bg-success-primary text-primary-on-brand'
                                : 'bg-primary hover:bg-secondary text-secondary'
                            }`}
                          >
                            Won
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'lost')}
                            className={`px-sm py-xxs font-medium ${
                              item.status === 'lost'
                                ? 'bg-error-primary text-primary-on-brand'
                                : 'bg-primary hover:bg-secondary text-secondary'
                            }`}
                          >
                            Lost
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'pending')}
                            className={`px-sm py-xxs font-medium ${
                              item.status === 'pending'
                                ? 'bg-secondary text-primary font-semibold'
                                : 'bg-primary hover:bg-secondary text-tertiary'
                            }`}
                          >
                            Pending
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning Quote */}
                    <div className="p-md bg-secondary rounded-lg text-xs text-secondary italic">
                      "{item.why}"
                    </div>

                    {/* Metadata & Proof Anchor */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-tertiary pt-xs border-t border-secondary gap-xs">
                      <div className="flex items-center gap-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-fg-success-primary" />
                        <span className="font-mono truncate max-w-xs">
                          {item.walrusBlobId ? `Walrus: ${item.walrusBlobId}` : 'Memory Anchored'}
                        </span>
                        {item.onchainAnchorBlock && (
                          <span className="text-quaternary font-mono">
                            • Block #{item.onchainAnchorBlock}
                          </span>
                        )}
                      </div>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
