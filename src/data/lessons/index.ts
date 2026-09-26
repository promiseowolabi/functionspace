/**
 * Lesson registry — functionspace content source of truth.
 *
 * Knative half:    f0 (The Function Contract), k1 (Serving), k2 (Eventing),
 *                  k3 (Functions).
 * DataEngine half: d1 (Foundations), d2 (In Depth).
 * Synthesis:       x1 (Two Platforms, One Model).
 *
 * A track whose array is shorter than its `lessons` count in
 * src/lib/tracks.ts renders the remainder as stubs; `npm run report` prints
 * the gap.
 */

import type { Lesson, TrackId } from './types'
import { ORDERED_LESSON_IDS } from './manifest'

// F0 — The Function Contract
import f0l1 from './f0/what-a-function-is'
import f0l2 from './f0/cloudevents-the-envelope'
import f0l3 from './f0/cold-start-arithmetic'
import f0l4 from './f0/kubernetes-for-functions'

// K1 — Knative Serving
import k1l1 from './k1/service-configuration-revision-route'
import k1l2 from './k1/the-request-path'
import k1l3 from './k1/the-autoscaler'
import k1l4 from './k1/scale-to-zero'
import k1l5 from './k1/traffic-and-rollouts'
import k1l6 from './k1/tuning-a-service'

// K2 — Knative Eventing
import k2l1 from './k2/sources-sinks-addressables'
import k2l2 from './k2/broker-and-trigger'
import k2l3 from './k2/channels-and-subscriptions'
import k2l4 from './k2/delivery-and-dead-letters'
import k2l5 from './k2/kafka-backed-eventing'
import k2l6 from './k2/replies-sequences-parallel'

// K3 — Knative Functions
import k3l1 from './k3/func-create'
import k3l2 from './k3/builders'
import k3l3 from './k3/cloudevent-functions'
import k3l4 from './k3/from-func-to-ksvc'

// D1 — DataEngine Foundations
import d1l1 from './d1/compute-next-to-data'
import d1l2 from './d1/the-object-model'
import d1l3 from './d1/the-vastde-cli'
import d1l4 from './d1/the-function-runtime'
import d1l5 from './d1/triggers'
import d1l6 from './d1/pipelines'

// D2 — DataEngine in Depth
import d2l1 from './d2/the-event-broker'
import d2l2 from './d2/element-triggers-end-to-end'
import d2l3 from './d2/revisions-and-rollouts'
import d2l4 from './d2/observability'
import d2l5 from './d2/failure-retries-idempotency'

// X1 — Two Platforms, One Model
import x1l1 from './x1/the-mapping'
import x1l2 from './x1/sizing-concurrency'
import x1l3 from './x1/exactly-once-is-a-design'
import x1l4 from './x1/architecture-patterns'

// @lesson-imports

export const LESSONS_BY_TRACK: Record<TrackId, Lesson[]> = {
  f0: [f0l1, f0l2, f0l3, f0l4],
  k1: [k1l1, k1l2, k1l3, k1l4, k1l5, k1l6],
  k2: [k2l1, k2l2, k2l3, k2l4, k2l5, k2l6],
  k3: [k3l1, k3l2, k3l3, k3l4],
  d1: [d1l1, d1l2, d1l3, d1l4, d1l5, d1l6],
  d2: [d2l1, d2l2, d2l3, d2l4, d2l5],
  x1: [x1l1, x1l2, x1l3, x1l4],
}

export const TRACK_IDS: TrackId[] = ['f0', 'k1', 'k2', 'k3', 'd1', 'd2', 'x1']

/** All lessons in curriculum order. */
export const ALL_LESSONS: Lesson[] = TRACK_IDS.flatMap((id) => LESSONS_BY_TRACK[id])

const byIdMap = new Map<string, Lesson>()
for (const l of ALL_LESSONS) {
  byIdMap.set(l.id, l)
  byIdMap.set(l.slug, l)
}

/** Resolve a lesson by canonical id (`k1.l1`) or slug (`service-configuration-revision-route`). */
export function lessonById(idOrSlug: string | undefined): Lesson | undefined {
  if (!idOrSlug) return undefined
  return byIdMap.get(idOrSlug)
}

export function lessonsForTrack(trackId: string): Lesson[] {
  return LESSONS_BY_TRACK[trackId as TrackId] ?? []
}

/** Next lesson in curriculum order — crosses track boundaries. */
export function nextLesson(lesson: Lesson): Lesson | undefined {
  const i = ORDERED_LESSON_IDS.indexOf(lesson.id)
  return i >= 0 ? lessonById(ORDERED_LESSON_IDS[i + 1]) : undefined
}

/** Previous lesson in curriculum order — crosses track boundaries. */
export function prevLesson(lesson: Lesson): Lesson | undefined {
  const i = ORDERED_LESSON_IDS.indexOf(lesson.id)
  return i > 0 ? lessonById(ORDERED_LESSON_IDS[i - 1]) : undefined
}

/* ---------------------- light re-exports ---------------------- */

/*
 * Metadata and track prose live in modules that do NOT import the corpus, so a
 * list page costs kilobytes. They are re-exported here for callers that already
 * hold a full Lesson.
 */
export * from './manifest'
export * from './track-extras'
export type { Lesson, ContentBlock } from './types'
