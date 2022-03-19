import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { BsCalendarEvent, BsPencil, BsPlusLg, BsXOctagon } from 'react-icons/bs';
import Link from 'next/link';
import { CancelCourseConfirmDialog, CourseStatusBadge } from '../../../../../components';
import { ContentLayout, PrivateLayout } from '../../../../../components/layout/admin';
import { adaptColumn, cancelRegistrationColumn, StaticPaginatedTable, userLinkColumn } from '../../../../../components/table';
import { displayDatetime, displayCourseName } from '../../../../../lib/common';
import { usePromiseEffect } from '../../../../../hooks';
import { breadcrumbForCoursePlanning } from '../../../../../lib/client';
import { getCourse } from '../../../../../lib/client/api';

function CourseViewLayout({ id }) {
  const { isLoading, isError, data, error } = usePromiseEffect(() => getCourse(id, { include: ['registrations.user'] }), []);

  const registrationDateColumn = {
    title: `Date d'inscription`,
    render: ({ createdAt }) => displayDatetime(createdAt),
  };

  const sortedRegistrations = useMemo(() => data && data.registrations.slice().sort(({ createdAt: t1 }, { createdAt: t2 }) => new Date(t2).getTime() - new Date(t1).getTime()), [data]);
  const [notCanceledRegistrations, canceledRegistrations] = useMemo(
    () => (sortedRegistrations ? [sortedRegistrations.filter(({ isUserCanceled }) => !isUserCanceled), sortedRegistrations.filter(({ isUserCanceled }) => isUserCanceled)] : []),
    [sortedRegistrations],
  );

  const isFuture = data && !data.isCanceled && new Date().getTime() < new Date(data.dateEnd).getTime();

  return (
    <ContentLayout
      title={
        data && (
          <>
            {displayCourseName(data)}
            <CourseStatusBadge course={data} className="ms-2" />
          </>
        )
      }
      icon={BsCalendarEvent}
      headTitle={data && displayCourseName(data)}
      breadcrumb={data && breadcrumbForCoursePlanning(data)}
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      <div className="mb-4">
        <Link href={`/administration/seances/planning/${id}/edition`} passHref>
          <Button className="me-2">
            <BsPencil className="icon me-2" />
            Modifier mes notes
          </Button>
        </Link>
        {isFuture && (
          <CancelCourseConfirmDialog
            course={data}
            triggerer={clickHandler => ( // eslint-disable-line react/no-unstable-nested-components
              <Button variant="outline-danger" onClick={clickHandler}>
                <BsXOctagon className="icon me-2" />
                Annuler cette séance
              </Button>
            )}
          />
        )}
      </div>

      {data && data.cancelationReason && (
        <>
          <h2 className="h5">Motif de l'annulation</h2>
          <p>{data.cancelationReason}</p>
        </>
      )}

      {data && data.notes && (
        <>
          <h2 className="h5">Notes</h2>
          <p>{data.notes}</p>
        </>
      )}

      <h2 className="h5">
        Participants
        <Badge bg="secondary" className="ms-2">
          {data && notCanceledRegistrations.length}
          {' '}
          /
          {' '}
          {data && data.slots}
        </Badge>
      </h2>

      <p>Liste des utilisateurs inscrits à cette séance et n'ayant pas annulé.</p>

      <StaticPaginatedTable
        rows={data && notCanceledRegistrations}
        columns={[userLinkColumn, registrationDateColumn, adaptColumn(registration => ({ ...registration, course: data }))(cancelRegistrationColumn)]}
        renderEmpty={() => 'Personne ne participe pour le moment.'}
      />

      {isFuture && (
        <div className="text-center">
          <Link href={{ pathname: '/administration/inscriptions/creation', query: { courseId: data && data.id } }} passHref>
            <Button variant="success">
              <BsPlusLg className="icon me-2" />
              Inscrire un utilisateur
            </Button>
          </Link>
        </div>
      )}

      <h2 className="h5">Annulations</h2>

      <p>Historique des annulations pour cette séance.</p>

      <StaticPaginatedTable
        rows={data && canceledRegistrations}
        columns={[
          userLinkColumn,
          registrationDateColumn,
          {
            title: `Date d'annulation`,
            render: ({ canceledAt }) => displayDatetime(canceledAt),
          },
        ]}
        renderEmpty={() => `Aucun utilisateur n'a annulé.`}
      />
    </ContentLayout>
  );
}

export default function CourseView() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <PrivateLayout>
      <CourseViewLayout id={id} />
    </PrivateLayout>
  );
}
