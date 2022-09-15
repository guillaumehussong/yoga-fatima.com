import React from 'react';
import { GridColumns } from '@mui/x-data-grid/models/colDef/gridColDef';
import { AsyncGrid } from '../AsyncGrid';

export const AdminWhitelistGrid: React.FunctionComponent = () => {
  const columns: GridColumns = [
    {
      field: 'email',
      headerName: 'Adresse e-mail',
      minWidth: 250,
      flex: 1,
    },
  ];

  return (
    <AsyncGrid columns={columns} query={['adminWhitelist.findAll']} getRowId={({ email }) => email} initialSort={{ field: 'email', sort: 'asc' }} />
  );
};
