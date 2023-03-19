import React, { useState } from 'react';
import { AsyncGrid } from '../AsyncGrid';
import { trpc } from '../../../common/trpc';
import { userColumn } from './common';
import { formatDateDDsmmYYYY } from '../../../common/date';
import { TransactionTypeNames } from '../../../common/transaction';
import { TransactionType, OrderPayment } from '@prisma/client';
import { GridRowParams } from '@mui/x-data-grid';
import { GridActionsCellItemTooltip } from '../../GridActionsCellItemTooltip';
import { Visibility } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { RouterOutput } from '../../../server/controllers/types';

interface OrderGridProps {
  userId?: number;
}

export const OrderGrid: React.FunctionComponent<OrderGridProps> = ({ userId }) => {
  const router = useRouter();

  const columns = [
    {
      field: 'details',
      type: 'actions',
      minWidth: 50,
      getActions: ({ row }: GridRowParams) => [
        <GridActionsCellItemTooltip icon={<Visibility />} label="Consulter" onClick={() => router.push(`/administration/paiements/commandes/${row.id}`)} />,
      ],
    },
    ...(userId === undefined ? [userColumn({
      field: 'user',
      flex: 1,
    })] : []),
    {
      field: 'articles',
      headerName: 'Articles',
      renderCell: ({ row }: { row: RouterOutput['order']['findAll'][0] }) => {
        const totalCourses = row.usedCouponCourseRegistrations.length + row.trialCourseRegistrations.length + row.replacementCourseRegistrations.length + row.purchasedCourseRegistrations.length;
        const totalCoupons = row.purchasedCoupons.length;
        const totalMemberships = row.purchasedMemberships.length;
        const categories = [[totalMemberships, 'adhésion'], [totalCoupons, 'carte'], [totalCourses, 'séance']];
        return categories.filter(([count]) => count > 0).map(([count, name]) => `${count} ${name}${count > 1 ? 's' : ''}`).join(', ');
      },
      minWidth: 150,
      flex: 1.5,
    },
    {
      field: 'payment.amount',
      headerName: 'Montant payé',
      valueGetter: ({ row: { payment } }: { row: { payment: OrderPayment | null } }) => payment?.amount,
      valueFormatter: ({ value }: { value: number | null }) => `${value ?? 0} €`,
      minWidth: 100,
      flex: 1,
    },
    {
      field: 'payment.type',
      headerName: 'Moyen de paiement',
      valueGetter: ({ row: { payment } }: { row: { payment: OrderPayment | null } }) => payment?.type,
      valueFormatter: ({ value }: { value: TransactionType | null }) => value !== null ? TransactionTypeNames[value] : undefined,
      minWidth: 200,
      flex: 1,
    },
    {
      field: 'date',
      headerName: 'Date de la commande',
      valueFormatter: ({ value }: { value: Date }) => formatDateDDsmmYYYY(value),
      minWidth: 200,
      flex: 1,
    },
    {
      field: 'notes',
      headerName: 'Notes',
      minWidth: 500,
      flex: 1,
    },
  ];

  return (
    <AsyncGrid
      columns={columns}
      procedure={trpc.order.findAll}
      input={{ userId }}
      initialSort={{ field: 'date', sort: 'asc' }}
    />
  );
};
