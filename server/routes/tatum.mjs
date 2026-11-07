import { Router } from 'express'
import { tatumFetch, tatumRpc, MissingApiKeyError } from '../tatum-client.mjs'

const router = Router()

// Walrus Memory storage state
// The user specifies secrets MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID for Walrus Memory access.
// When unset, we report configured: false so the UI clearly prompts the user.
function getWalrusConfig() {
  const privateKey = process.env.MEMWAL_PRIVATE_KEY
  const accountId = process.env.MEMWAL_ACCOUNT_ID
  return {
    configured: Boolean(privateKey && accountId),
    hasPrivateKey: Boolean(privateKey),
    hasAccountId: Boolean(accountId),
    accountId: accountId || null
  }
}

// In-memory runtime cache for real picks loaded from Walrus or created during session
let runtimePicks = []
let lastWalrusSync = null

// System status: Tatum RPC connectivity & Walrus credentials check
router.get('/status', async (_req, res) => {
  const walrus = getWalrusConfig()
  let tatumConnected = false
  let latestBlock = null

  if (process.env.TATUM_API_KEY) {
    try {
      const rpcRes = await tatumRpc('ethereum', {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
      const rpcData = await rpcRes.json()
      if (rpcData?.result) {
        latestBlock = parseInt(rpcData.result, 16)
        tatumConnected = true
      }
    } catch {
      tatumConnected = false
    }
  }

  res.json({
    status: tatumConnected ? 'connected' : 'offline',
    tatumApiKeySet: Boolean(process.env.TATUM_API_KEY),
    latestBlock,
    walrusConfigured: walrus.configured,
    walrusDetails: {
      hasPrivateKey: walrus.hasPrivateKey,
      hasAccountId: walrus.hasAccountId,
      accountId: walrus.accountId ? `${walrus.accountId.substring(0, 6)}...` : null
    }
  })
})

// Helper to compute win rate & confidence patterns strictly from user's real picks
function computePatterns(picks) {
  const total = picks.length
  const settled = picks.filter(p => p.status === 'won' || p.status === 'lost')
  const wins = picks.filter(p => p.status === 'won').length

  const highConfPicks = settled.filter(p => p.confidence >= 7)
  const highConfWins = highConfPicks.filter(p => p.status === 'won').length
  const highConfWinRate = highConfPicks.length > 0
    ? Math.round((highConfWins / highConfPicks.length) * 100)
    : null

  const lowConfPicks = settled.filter(p => p.confidence < 7)
  const lowConfWins = lowConfPicks.filter(p => p.status === 'won').length
  const lowConfWinRate = lowConfPicks.length > 0
    ? Math.round((lowConfWins / lowConfPicks.length) * 100)
    : null

  // Breakdown by sport
  const sportStats = {}
  settled.forEach(p => {
    if (!sportStats[p.sport]) {
      sportStats[p.sport] = { sport: p.sport, won: 0, total: 0 }
    }
    sportStats[p.sport].total++
    if (p.status === 'won') sportStats[p.sport].won++
  })

  let bestSport = null
  let maxRate = -1
  Object.values(sportStats).forEach(s => {
    const rate = Math.round((s.won / s.total) * 100)
    if (s.total >= 1 && rate > maxRate) {
      maxRate = rate
      bestSport = { sport: s.sport, winRate: rate, record: `${s.won}-${s.total - s.won}` }
    }
  })

  const insights = []

  // High confidence pattern
  if (highConfPicks.length > 0 && highConfWinRate !== null) {
    insights.push({
      title: 'High Confidence Calibration',
      stat: `${highConfWinRate}%`,
      description: `You're ${highConfWinRate}% right when confidence is 7 or above (${highConfWins}/${highConfPicks.length} settled picks).`,
      sampleSize: highConfPicks.length,
      type: highConfWinRate >= 60 ? 'positive' : 'warning'
    })
  } else {
    insights.push({
      title: 'High Confidence Calibration',
      stat: '—',
      description: 'Log and settle picks with confidence ≥ 7 to compute your high-conviction win rate.',
      sampleSize: 0,
      type: 'neutral'
    })
  }

  // Low confidence check
  if (lowConfPicks.length > 0 && lowConfWinRate !== null) {
    insights.push({
      title: 'Low Confidence Discipline (Conf < 7)',
      stat: `${lowConfWinRate}%`,
      description: `Lower confidence picks hit at ${lowConfWinRate}% (${lowConfWins}/${lowConfPicks.length}). Consider sizing down or passing.`,
      sampleSize: lowConfPicks.length,
      type: lowConfWinRate <= 50 ? 'warning' : 'neutral'
    })
  } else {
    insights.push({
      title: 'Low Confidence Discipline',
      stat: '—',
      description: 'No low-confidence picks logged yet. Used to detect whether lower-rated plays hurt your ROI.',
      sampleSize: 0,
      type: 'neutral'
    })
  }

  // Sport breakdown
  if (bestSport) {
    insights.push({
      title: 'Top Sport Efficiency',
      stat: `${bestSport.sport} (${bestSport.winRate}%)`,
      description: `Best recorded strike rate is in ${bestSport.sport} with a ${bestSport.record} record across ${settled.length} settled plays.`,
      sampleSize: settled.length,
      type: 'positive'
    })
  } else {
    insights.push({
      title: 'Top Sport Efficiency',
      stat: '—',
      description: 'Sport edge analysis will display as soon as picks in different leagues are marked won or lost.',
      sampleSize: 0,
      type: 'neutral'
    })
  }

  return {
    stats: {
      total,
      settled: settled.length,
      wins,
      overallWinRate: settled.length > 0 ? Math.round((wins / settled.length) * 100) : 0
    },
    insights
  }
}

// Fetch all real saved picks from Walrus Memory & storage
router.get('/picks', async (_req, res) => {
  const walrus = getWalrusConfig()

  // Sync with Walrus Storage API if credentials / Tatum API key available
  try {
    const tatumRes = await tatumFetch('/v4/data/storage/uploads?limit=50')
    if (tatumRes.ok) {
      const walrusUploads = await tatumRes.json()
      // Filter uploads that match sportspick journals
      const pickUploads = (Array.isArray(walrusUploads) ? walrusUploads : []).filter(u =>
        u.filename && (u.filename.startsWith('sportspick_') || u.filename.startsWith('pick_'))
      )

      // Merge new remote Walrus certified blobs if not already in runtime cache
      for (const upload of pickUploads) {
        const alreadyExists = runtimePicks.some(
          p => (upload.jobId && p.walrusJobId === upload.jobId) || (upload.blobId && p.walrusBlobId === upload.blobId)
        )
        if (!alreadyExists && upload.downloadUrlByQuiltId) {
          try {
            const fetchContent = await fetch(upload.downloadUrlByQuiltId, { signal: AbortSignal.timeout(3000) })
            if (fetchContent.ok) {
              const pickData = await fetchContent.json()
              // Ensure we don't insert duplicate pick by id or blob
              if (!runtimePicks.some(p => p.id === pickData.id || p.walrusBlobId === upload.blobId)) {
                runtimePicks.push({
                  ...pickData,
                  walrusBlobId: upload.blobId,
                  walrusJobId: upload.jobId,
                  status: pickData.status || 'pending',
                  verifiedOnchain: true
                })
              }
            }
          } catch {
            // Ignore individual fetch failure
          }
        }
      }
      lastWalrusSync = new Date().toISOString()
    }
  } catch (err) {
    // If Tatum API key missing or error, continue with runtime state
  }

  const { stats, insights } = computePatterns(runtimePicks)

  res.json({
    picks: runtimePicks,
    stats,
    insights,
    walrusConfigured: walrus.configured,
    lastWalrusSync
  })
})

// Store a new pick into Walrus Memory on Mainnet
router.post('/picks', async (req, res) => {
  const { game, sport, pick, odds, confidence, why } = req.body

  if (!game || !pick || confidence === undefined || !why) {
    return res.status(400).json({ error: 'Please provide game, pick, confidence, and why.' })
  }

  const walrus = getWalrusConfig()
  if (!walrus.configured) {
    return res.status(400).json({
      error: 'Walrus Memory credentials missing: Please configure MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID secrets in workspace environment.'
    })
  }

  // Anchor pick to Ethereum onchain block via Tatum RPC
  let blockNumber = null
  try {
    const rpcRes = await tatumRpc('ethereum', {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    })
    const rpcData = await rpcRes.json()
    if (rpcData?.result) {
      blockNumber = parseInt(rpcData.result, 16)
    }
  } catch (rpcErr) {
    // Tatum block fetch failure
  }

  const timestamp = new Date().toISOString()
  const cleanPickPayload = {
    id: `pick_${Date.now()}`,
    game: game.trim(),
    sport: sport || 'NFL',
    pick: pick.trim(),
    odds: odds?.trim() || '-110',
    confidence: Number(confidence),
    why: why.trim(),
    status: 'pending',
    createdAt: timestamp,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    onchainAnchorBlock: blockNumber
  }

  // Upload pick file directly to Walrus decentralized storage on Mainnet via Tatum Storage API
  const filename = `sportspick_${cleanPickPayload.id}.json`
  const jsonContent = JSON.stringify(cleanPickPayload, null, 2)
  const boundary = `----WalrusStorageFormBoundary${Date.now()}`

  let body = `--${boundary}\r\n`
  body += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`
  body += `Content-Type: application/json\r\n\r\n`
  body += `${jsonContent}\r\n`
  body += `--${boundary}--\r\n`

  let walrusBlobId = null
  let walrusJobId = null

  try {
    const uploadRes = await tatumFetch('/v4/data/storage/upload', {
      method: 'POST',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      body
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      return res.status(uploadRes.status).json({
        error: `Walrus storage upload failed on Mainnet (${uploadRes.status}): ${errText}`
      })
    }

    const uploadData = await uploadRes.json()
    walrusBlobId = uploadData.blobId
    walrusJobId = uploadData.jobId
  } catch (storageErr) {
    if (storageErr instanceof MissingApiKeyError) {
      return res.status(401).json({
        error: 'TATUM_API_KEY is missing or inactive for Walrus Mainnet storage.'
      })
    }
    return res.status(500).json({
      error: `Walrus Memory upload failed: ${storageErr.message}`
    })
  }

  const storedPick = {
    ...cleanPickPayload,
    walrusBlobId,
    walrusJobId,
    verifiedOnchain: blockNumber !== null
  }

  runtimePicks.unshift(storedPick)

  res.status(201).json({
    success: true,
    pick: storedPick
  })
})

// Update pick status (won / lost / pending)
router.patch('/picks/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['won', 'lost', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be won, lost, or pending' })
  }

  const target = runtimePicks.find(p => p.id === id)
  if (!target) {
    return res.status(404).json({ error: 'Pick not found' })
  }

  target.status = status
  res.json({ success: true, pick: target })
})

export default router
