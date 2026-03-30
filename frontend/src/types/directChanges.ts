// Shared Direct Changes type interfaces (DELTA_BY_UNIQUE_ID render mode)
// Extracted from store/scenariosSlice.ts for reuse across Analysis runtime and Admin preview

export interface DirectChangesColumnDefinitionFe {
  dataAttribute: string;
  type: string;
  display: string;
  isEntityId?: boolean;
}

export interface DirectChangesDataSectionFe {
  dataType: string;
  dataTypeTitle?: string;
  header: string;
  externalLink: string | null;
  totalDataChanges: number;
  renderState: 'ROWS' | 'OVERFLOW' | 'NO_DATA';
  columnDefinitions: DirectChangesColumnDefinitionFe[];
  data: Record<string, unknown>[] | null;
  groupByEntityIdColumn?: boolean;
}

export interface DirectChangesRuntimeResponse {
  dataChanged: DirectChangesDataSectionFe[];
}
