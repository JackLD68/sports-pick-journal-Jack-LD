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
  AlertTriangle,
  KeyRound,
  Database,
  ChevronDown
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

interface WalrusStatus {
  configured: boolean
  hasPrivateKey: boolean
  hasAccountId: boolean
  accountId?: string | null
}

export default function App() {
  const [picks, setPicks] = useState<PickItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [insights, setInsights] = useState<PatternInsight[]>([])
  const [stats, setStats] = useState<StatsSummary>({ total: 0, settled: 0, wins: 0, overallWinRate: 0 })
  const [walrusStatus, setWalrusStatus] = useState<WalrusStatus>({
    configured: false,
    hasPrivateKey: false,
    hasAccountId: false
  })
  const [syncStatus, setSyncStatus] = useState<string>('Syncing Walrus Memory...')
  const [latestBlock, setLatestBlock] = useState<number | null>(null)
  const [filterSport, setFilterSport] = useState<string>('ALL')

  // Form inputs
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
        setWalrusStatus(prev => ({
          ...prev,
          configured: Boolean(data.walrusConfigured)
        }))
      }
    } catch (e) {
      console.error('Failed to fetch picks from Walrus Memory', e)
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
          setSyncStatus('Onchain Gateway Offline')
        }
        if (data.walrusDetails) {
          setWalrusStatus({
            configured: data.walrusConfigured,
            hasPrivateKey: data.walrusDetails.hasPrivateKey,
            hasAccountId: data.walrusDetails.hasAccountId,
            accountId: data.walrusDetails.accountId
          })
        }
      }
    } catch (e) {
      setSyncStatus('Walrus Memory Mode')
    }
  }

  useEffect(() => {
    fetchPicksAndPatterns()
    fetchStatus()
  }, [])

  const handleCreatePick = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!game.trim() || !pick.trim() || !why.trim()) {
      setFormError('Please fill in game matchup, pick, and your rationale.')
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

      const data = await res.json()
      if (res.ok) {
        setFormSuccess(true)
        setGame('')
        setPick('')
        setWhy('')
        setConfidence(8)
        fetchPicksAndPatterns()
        setTimeout(() => setFormSuccess(false), 3000)
      } else {
        setFormError(data.error || 'Failed to save pick to Walrus Memory.')
      }
    } catch (err: any) {
      setFormError(err.message || 'Network communication error with Walrus.')
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

  const sportsList = ['ALL', 'NFL', 'NBA', 'EPL', 'MLB', 'NHL']
  const filteredPicks = filterSport === 'ALL'
    ? picks
    : picks.filter(p => p.sport === filterSport)

  return (
    <div className="min-h-screen bg-secondary text-primary">
      {/* 1. Page Header (guidelines/layout-dashboard.md) */}
      <header className="flex flex-col gap-lg border-b border-secondary bg-primary p-xl lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-md min-w-0">
          {/* Featured icon sm (guidelines/components/featured-icon.md) */}
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-utility-brand-50 border border-utility-brand-200">
            <Trophy className="size-5 shrink-0 text-utility-brand-600" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-xs">
              <h1 className="text-heading-xs font-semibold text-primary">SportsPick Journal</h1>
              {/* Badge (guidelines/components/badge.md) */}
              <span className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium text-utility-brand-700">
                Walrus Memory Mainnet
              </span>
            </div>
            <p className="mt-xs text-sm text-tertiary">
              Persistent pick logging, pattern calibration & Tatum onchain proofs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-sm">
          {/* Status badge */}
          <span className="inline-flex items-center gap-xs rounded-full border border-secondary bg-primary px-md py-xxs text-xs font-medium text-secondary">
            <span
              className={`size-2 shrink-0 rounded-full ${walrusStatus.configured ? 'bg-success-primary' : 'bg-warning-primary'}`}
              aria-hidden="true"
            />
            {syncStatus}
          </span>
          {/* Button secondary (guidelines/components/button.md) */}
          <button
            type="button"
            onClick={() => {
              fetchPicksAndPatterns()
              fetchStatus()
            }}
            className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <RefreshCw className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
            Sync Walrus
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto p-xl lg:p-4xl space-y-3xl">
        {/* 2. Alert Component (guidelines/components/alert.md) */}
        {!walrusStatus.configured && (
          <div className="flex gap-lg rounded-xl bg-utility-warning-50 p-xl">
            <KeyRound className="mt-xxs size-5 shrink-0 text-utility-warning-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-utility-warning-600">Walrus Memory Secrets Required</p>
              <p className="mt-xxs text-sm text-tertiary">
                To store and certify picks on Walrus Memory Mainnet, configure the workspace secrets{' '}
                <span className="font-mono text-primary font-semibold">MEMWAL_PRIVATE_KEY</span> and{' '}
                <span className="font-mono text-primary font-semibold">MEMWAL_ACCOUNT_ID</span>.
              </p>
            </div>
          </div>
        )}

        {/* 3. Summary Cards (guidelines/components/card.md) */}
        <section className="space-y-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs">
              <Sparkles className="size-5 shrink-0 text-fg-brand-primary" aria-hidden="true" />
              <h2 className="text-heading-xs font-semibold text-primary">Walrus Memory Patterns</h2>
            </div>
            <span className="text-xs text-quaternary">
              Record: {stats.wins}-{stats.settled - stats.wins} ({stats.overallWinRate}% hit rate across {stats.settled} settled picks)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {insights.map((insight, idx) => (
              <section key={idx} className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-tertiary">{insight.title}</span>
                  {/* Badge */}
                  <span
                    className={`inline-flex items-center gap-xs rounded-full px-md py-xxs text-xs font-medium border ${
                      insight.type === 'positive'
                        ? 'bg-utility-brand-50 text-utility-brand-700 border-utility-brand-200'
                        : insight.type === 'warning'
                        ? 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200'
                        : 'bg-utility-gray-50 text-utility-gray-700 border-secondary'
                    }`}
                  >
                    {insight.sampleSize > 0 ? `n = ${insight.sampleSize} picks` : 'Awaiting data'}
                  </span>
                </div>
                <div className="flex items-baseline gap-xs">
                  <p
                    className={`text-heading-lg font-bold ${
                      insight.type === 'positive'
                        ? 'text-brand-primary'
                        : insight.type === 'warning'
                        ? 'text-warning-primary'
                        : 'text-primary'
                    }`}
                  >
                    {insight.stat}
                  </p>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {insight.description}
                </p>
              </section>
            ))}
          </div>
        </section>

        {/* 2-Column Dashboard Grid: Logger Form & Picks History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl">
          {/* 4. Left Column: Input Form (guidelines/components/input.md & button.md) */}
          <section className="lg:col-span-5 rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl self-start">
            <div className="border-b border-secondary pb-md flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <PlusCircle className="size-5 shrink-0 text-fg-brand-primary" aria-hidden="true" />
                <h3 className="text-heading-xs font-semibold text-primary">Log New Sports Pick</h3>
              </div>
              <span className="text-xs text-tertiary">
                {latestBlock ? `Tatum Block #${latestBlock}` : 'Onchain Verified'}
              </span>
            </div>

            {/* Alert success */}
            {formSuccess && (
              <div className="flex gap-lg rounded-xl bg-utility-success-50 p-xl">
                <CheckCircle2 className="mt-xxs size-5 shrink-0 text-utility-success-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-utility-success-600">Pick recorded</p>
                  <p className="mt-xxs text-sm text-tertiary">Stored and certified in Walrus Memory.</p>
                </div>
              </div>
            )}

            {/* Alert error */}
            {formError && (
              <div className="flex gap-lg rounded-xl bg-utility-error-50 p-xl">
                <XCircle className="mt-xxs size-5 shrink-0 text-utility-error-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-utility-error-600">Pick save failed</p>
                  <p className="mt-xxs text-sm text-tertiary">{formError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreatePick} className="space-y-lg">
              {/* Select & Input in row (guidelines/components/select.md & input.md) */}
              <div className="grid grid-cols-2 gap-md items-end">
                <div className="flex flex-col gap-sm">
                  <label className="text-sm font-medium text-secondary">Sport / League</label>
                  <div className="relative">
                    <select
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      className="w-full appearance-none rounded-md bg-primary px-lg py-sm text-sm text-primary border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring pr-8"
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
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                  </div>
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

              {/* Game input */}
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Game / Matchup</label>
                <input
                  type="text"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder="e.g. Chiefs vs Ravens"
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              {/* Pick input */}
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">My Pick</label>
                <input
                  type="text"
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  placeholder="e.g. Chiefs -3.5 or Over 47.5"
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              {/* Confidence control */}
              <div className="rounded-lg bg-secondary p-md space-y-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-secondary">Confidence Level</span>
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

              {/* Why textarea */}
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Why (Analysis & Edge)</label>
                <textarea
                  rows={3}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="Injury updates, rest advantage, scheme mismatch..."
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring resize-none"
                />
              </div>

              {/* Button primary (guidelines/components/button.md) */}
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              >
                <Brain className="size-4 shrink-0 text-fg-white" aria-hidden="true" />
                {saving ? 'Storing in Walrus Memory...' : 'Store Pick in Walrus Memory'}
              </button>
            </form>
          </section>

          {/* 5. Right Column: History & Tabs (guidelines/components/tabs.md) */}
          <section className="lg:col-span-7 space-y-lg">
            {/* Filter Tabs Header */}
            <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <Database className="size-5 shrink-0 text-fg-brand-primary" aria-hidden="true" />
                  <h3 className="text-heading-xs font-semibold text-primary">Walrus Memory Picks</h3>
                </div>
                {/* Badge */}
                <span className="inline-flex items-center gap-xs rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                  {filteredPicks.length} saved
                </span>
              </div>

              {/* Tabs Component (guidelines/components/tabs.md) */}
              <div className="flex gap-lg border-b border-secondary overflow-x-auto">
                {sportsList.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterSport(s)}
                    className={`border-b-2 px-md py-sm text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring ${
                      filterSport === s
                        ? 'border-brand text-brand-primary'
                        : 'border-transparent text-tertiary hover:text-secondary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Picks List or Empty State */}
            {loading ? (
              <div className="rounded-xl border border-secondary bg-primary p-3xl text-center text-sm text-tertiary">
                Loading saved picks from Walrus Memory...
              </div>
            ) : filteredPicks.length === 0 ? (
              /* Empty state with Featured Icon (guidelines/components/featured-icon.md) */
              <section className="rounded-xl border border-secondary bg-primary p-3xl text-center space-y-md shadow-xs">
                <div className="flex justify-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
                    <Target className="size-6 shrink-0 text-fg-secondary" aria-hidden="true" />
                  </span>
                </div>
                <div className="space-y-xs">
                  <h4 className="text-heading-xs font-semibold text-primary">No picks stored yet</h4>
                  <p className="text-sm text-tertiary max-w-sm mx-auto">
                    Log your first pick using the form. All picks are stored in Walrus Memory and patterns are calculated strictly from your real submissions.
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
                          {/* Badge */}
                          <span className="inline-flex items-center gap-xs rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
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
                        {/* Confidence badge */}
                        <span
                          className={`inline-flex items-center gap-xs rounded-full px-md py-xxs text-xs font-medium border ${
                            item.confidence >= 7
                              ? 'border-utility-brand-200 bg-utility-brand-50 text-utility-brand-700'
                              : 'border-utility-gray-200 bg-utility-gray-50 text-utility-gray-700'
                          }`}
                        >
                          Conf: {item.confidence}/10
                        </span>

                        {/* Result action group: secondary & tinted button styles */}
                        <div className="flex items-center gap-xxs">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'won')}
                            className={`inline-flex items-center rounded-md px-sm py-xxs text-xs font-semibold border transition-colors ${
                              item.status === 'won'
                                ? 'bg-utility-success-50 text-utility-success-700 border-utility-success-200'
                                : 'bg-primary text-secondary border-primary hover:bg-primary-hover'
                            }`}
                          >
                            Won
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'lost')}
                            className={`inline-flex items-center rounded-md px-sm py-xxs text-xs font-semibold border transition-colors ${
                              item.status === 'lost'
                                ? 'bg-utility-error-50 text-utility-error-700 border-error-subtle'
                                : 'bg-primary text-secondary border-primary hover:bg-primary-hover'
                            }`}
                          >
                            Lost
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'pending')}
                            className={`inline-flex items-center rounded-md px-sm py-xxs text-xs font-semibold border transition-colors ${
                              item.status === 'pending'
                                ? 'bg-utility-gray-50 text-utility-gray-700 border-utility-gray-200'
                                : 'bg-primary text-tertiary border-primary hover:bg-primary-hover'
                            }`}
                          >
                            Pending
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning callout */}
                    <div className="p-md bg-secondary rounded-lg text-xs text-secondary italic">
                      "{item.why}"
                    </div>

                    {/* Proof & metadata footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-tertiary pt-xs border-t border-secondary gap-xs">
                      <div className="flex items-center gap-xs">
                        <ShieldCheck className="size-4 shrink-0 text-fg-success-primary" aria-hidden="true" />
                        <span className="font-mono truncate max-w-xs">
                          {item.walrusBlobId ? `Blob: ${item.walrusBlobId}` : 'Walrus Certified'}
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
