/**
 * Lazy lab-guide registry. Each guide is its own chunk, loaded only by the
 * lab route that shows it.
 */

import type { LabId } from '@/data/lessons/types'
import type { LabGuide } from './types'

type Loader = () => Promise<{ default: LabGuide }>

export const LAB_GUIDES: Record<LabId, Loader> = {
  'kind-knative': () => import('./kind-knative'),
  'first-service': () => import('./first-service'),
  autoscaling: () => import('./autoscaling'),
  'traffic-split': () => import('./traffic-split'),
  'broker-trigger': () => import('./broker-trigger'),
  'knative-functions': () => import('./knative-functions'),
  'de-setup': () => import('./de-setup'),
  'de-local-function': () => import('./de-local-function'),
  'de-schedule-pipeline': () => import('./de-schedule-pipeline'),
  'de-element-trigger': () => import('./de-element-trigger'),
  'de-revisions-observability': () => import('./de-revisions-observability'),
}

export type { LabGuide }
