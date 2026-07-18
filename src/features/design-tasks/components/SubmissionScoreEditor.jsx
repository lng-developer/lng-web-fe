import { useState } from 'react'
import { Button, FormControl, MenuItem, Select, TextField, Typography } from '@mui/material'

import { StatusBadge } from '@/components/operations'

const SCORE_LEVELS = ['BASIC', 'STANDARD', 'HARD', 'BONUS']

export default function SubmissionScoreEditor({
  submission,
  canReview,
  isSubmitting,
  onOverride,
  onVoid,
}) {
  const score = submission.score
  const canEdit = canReview && submission.status === 'APPROVED' && score?.status === 'ACTIVE'
  const [mode, setMode] = useState(null)
  const [points, setPoints] = useState(score?.finalPoints ?? '')
  const [scoreLevel, setScoreLevel] = useState(score?.scoreLevel || '')
  const [reason, setReason] = useState('')

  if (!score)
    return (
      <Typography variant="body2" className="text-ink-muted">
        No score
      </Typography>
    )

  if (score.status === 'VOIDED') {
    return (
      <div className="grid gap-1">
        <StatusBadge tone="danger">Voided</StatusBadge>
        <Typography variant="caption" className="text-ink-muted">
          {score.voidReason || 'No void reason recorded'}
        </Typography>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="body2" className="font-semibold text-ink-strong">
          {score.finalPoints} pts
        </Typography>
        <StatusBadge tone="info">{score.scoreLevel || 'STANDARD'}</StatusBadge>
        {score.override ? (
          <Typography variant="caption" className="text-ink-muted">
            Override: {score.override.reason}
          </Typography>
        ) : null}
      </div>

      {canEdit && !mode ? (
        <div className="flex flex-wrap gap-2">
          <Button size="small" variant="outlined" onClick={() => setMode('override')}>
            Override score
          </Button>
          <Button size="small" color="error" variant="outlined" onClick={() => setMode('void')}>
            Void score
          </Button>
        </div>
      ) : null}

      {canEdit && mode === 'override' ? (
        <div className="grid gap-2 sm:grid-cols-[120px_150px_minmax(180px,1fr)_auto]">
          <TextField
            size="small"
            label="Points"
            type="number"
            inputProps={{ min: 0, step: 0.25 }}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
          />
          <FormControl size="small">
            <Select
              value={scoreLevel}
              onChange={(event) => setScoreLevel(event.target.value)}
              displayEmpty
            >
              <MenuItem value="">Keep level</MenuItem>
              {SCORE_LEVELS.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Override reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={isSubmitting || points === '' || !reason.trim()}
            onClick={() =>
              onOverride({ scoreId: score.id, points, scoreLevel, overrideReason: reason })
            }
          >
            Save
          </Button>
        </div>
      ) : null}

      {canEdit && mode === 'void' ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
          <TextField
            size="small"
            label="Void reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button
            color="error"
            variant="contained"
            disabled={isSubmitting || !reason.trim()}
            onClick={() => onVoid(reason)}
          >
            Void score
          </Button>
        </div>
      ) : null}
    </div>
  )
}
