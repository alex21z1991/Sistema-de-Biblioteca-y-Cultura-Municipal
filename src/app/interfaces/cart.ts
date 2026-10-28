export interface CartResult {
  ok: boolean;
  errors: string[];
}

export enum CartViewState {
  Loading = 'loading',
  Empty = 'empty',
  Ready = 'ready',
  Error = 'error'
}
