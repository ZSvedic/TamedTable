// #TableView
// React entry point: kept separate so the main entry (pagination model)
// stays React-free; `react` is a peer dependency of this entry only.

export {
  TableView,
  type TableViewProps,
  type CellSelection,
} from './TableView.tsx';
export { Pagination } from './Pagination.tsx';
