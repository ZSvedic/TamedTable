export type TourAction =
  | { kind: 'load-file';    filename: string }
  | { kind: 'prefill-chat'; text: string    }
  | { kind: 'show-golden'                   }
  | { kind: 'display'                       }

export interface TourStep     { keyword: string; text: string; action: TourAction }
export interface TourScenario { name: string; steps: TourStep[] }

export function parseTours(_source: string): TourScenario[] {
  throw new Error('parseTours: not implemented');
}
