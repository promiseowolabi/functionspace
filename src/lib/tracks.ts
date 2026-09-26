/**
 * Shared curriculum metadata — functionspace (how functions work, on Knative
 * and on VAST DataEngine). Same TrackMeta contract the platform components
 * consume.
 *
 * Two halves plus a synthesis, deliberately visible in the registry:
 *   f0, k1–k3  the Knative half     — run it on a kind cluster you own.
 *   d1–d2      the DataEngine half  — run it on your VAST cluster.
 *   x1         the synthesis        — one model across both.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Cable,
  Database,
  FunctionSquare,
  Gauge,
  GitMerge,
  Radio,
  Workflow,
} from 'lucide-react'
import type { Level, TrackId } from '@/data/lessons/types'

export type Half = 'knative' | 'dataengine' | 'synthesis'

export interface TrackMeta {
  code: string
  /** `capstone` is not a content track — it has no lessons of its own. */
  id: TrackId | 'capstone'
  name: string
  color: string
  glyph: LucideIcon
  promise: string
  lessons: number
  exercises: number
  hours: number
  half: Half
  level: Level
}

export const TRACKS: TrackMeta[] = [
  {
    code: 'F0',
    id: 'f0',
    name: 'The Function Contract',
    color: '#A3E635',
    glyph: FunctionSquare,
    promise:
      'A function is three things — an image, an event contract and a scaler. Everything else in this course is one of those three, done well.',
    lessons: 4,
    exercises: 4,
    hours: 2,
    half: 'knative',
    level: 200,
  },
  {
    code: 'K1',
    id: 'k1',
    name: 'Knative Serving',
    color: '#22D3EE',
    glyph: Gauge,
    promise:
      'Revisions, routes, the activator and the autoscaler: the request path from ingress to your container, and how it reaches zero and comes back.',
    lessons: 6,
    exercises: 6,
    hours: 4,
    half: 'knative',
    level: 300,
  },
  {
    code: 'K2',
    id: 'k2',
    name: 'Knative Eventing',
    color: '#5CA8FF',
    glyph: Radio,
    promise:
      'Sources, brokers, triggers and dead letters: how an event finds a function, and what happens when the function is not there.',
    lessons: 6,
    exercises: 6,
    hours: 4,
    half: 'knative',
    level: 300,
  },
  {
    code: 'K3',
    id: 'k3',
    name: 'Knative Functions',
    color: '#A78BFA',
    glyph: Boxes,
    promise:
      'From `func create` to a running Knative Service: templates, builders, the CloudEvents handler, and what the tooling writes on your behalf.',
    lessons: 4,
    exercises: 4,
    hours: 2.5,
    half: 'knative',
    level: 300,
  },
  {
    code: 'D1',
    id: 'd1',
    name: 'DataEngine Foundations',
    color: '#FB923C',
    glyph: Database,
    promise:
      'Functions, triggers and pipelines on a VAST cluster: compute that runs next to the data it reacts to, driven from the `vastde` CLI.',
    lessons: 6,
    exercises: 6,
    hours: 4,
    half: 'dataengine',
    level: 300,
  },
  {
    code: 'D2',
    id: 'd2',
    name: 'DataEngine in Depth',
    color: '#FB7185',
    glyph: Cable,
    promise:
      'The event broker, S3 element triggers end to end, revisions, logs, metrics, traces — and designing a handler for redelivery.',
    lessons: 5,
    exercises: 5,
    hours: 3.5,
    half: 'dataengine',
    level: 400,
  },
  {
    code: 'X1',
    id: 'x1',
    name: 'Two Platforms, One Model',
    color: '#FBBF24',
    glyph: GitMerge,
    promise:
      'Map DataEngine onto Knative, size concurrency with Little\'s law, make at-least-once safe, and choose the pattern before the platform.',
    lessons: 4,
    exercises: 4,
    hours: 2.5,
    half: 'synthesis',
    level: 400,
  },
]

export const CAPSTONE: TrackMeta = {
  code: 'F*',
  id: 'capstone',
  name: 'Capstone: Same Function, Two Platforms',
  color: '#FDE047',
  glyph: Workflow,
  promise:
    'One object-processing function, deployed as a Knative Service behind a broker and as a DataEngine pipeline behind an S3 trigger — measured, compared, defended.',
  lessons: 0,
  exercises: 0,
  hours: 3,
  half: 'synthesis',
  level: 400,
}

export const TOTAL_TRACK_LESSONS = TRACKS.reduce((n, t) => n + t.lessons, 0)

export function getTrack(id: string): TrackMeta | undefined {
  return TRACKS.find((t) => t.id === id)
}

export const KNATIVE_TRACKS = TRACKS.filter((t) => t.half === 'knative')
export const DATAENGINE_TRACKS = TRACKS.filter((t) => t.half === 'dataengine')
export const SYNTHESIS_TRACKS = TRACKS.filter((t) => t.half === 'synthesis')

export const HALF_LABEL: Record<Half, string> = {
  knative: 'Knative · open source · run it on kind',
  dataengine: 'VAST DataEngine · run it on your VAST cluster',
  synthesis: 'Synthesis · one model across both',
}

/** Ordered lesson ids across tracks for next-lesson selectors. */
export const ORDERED_LESSON_IDS: string[] = TRACKS.flatMap((t) =>
  Array.from({ length: t.lessons }, (_, i) => `${t.id}.l${i + 1}`),
)

/** TRACKS never contains the capstone, so its ids are always real TrackIds. */
export const CONTENT_TRACK_IDS = TRACKS.map((t) => t.id as TrackId)
