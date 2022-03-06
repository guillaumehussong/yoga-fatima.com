import Link from 'next/link';
import { Button } from 'react-bootstrap';
import { BsCalendarDate, BsEyeFill, BsPerson, BsXOctagon } from 'react-icons/bs';
import { displayCourseName } from '../../lib/common';
import { CancelRegistrationConfirmDialog } from '../CancelRegistrationConfirmDialog';
import { CourseStatusBadge } from '../CourseStatusBadge';
import { StarIndicator } from '../StarIndicator';

const compose = f => g => x => f(g(x));

export const adaptColumn = f => ({ render, ...column }) => ({
  render: data => compose(render)(f)(data),
  ...column,
});

export const idColumn = {
  title: '#',
  render: ({ id }) => id,
};

export const userLinkColumn = {
  title: 'Utilisateur',
  render: ({ userId, user: { name } }) => (
    <Link href={`/administration/utilisateurs/${userId}`} passHref>
      <a>
        <BsPerson className="icon me-2" />
        {name}
      </a>
    </Link>
  ),
};

export const plannedCourseLinkColumn = {
  title: 'Séance',
  render: ({ courseId, course }) => (
    <Link href={`/administration/seances/planning/${courseId}`} passHref>
      <a>
        <BsCalendarDate className="icon me-2" />
        {displayCourseName(course)}
        <CourseStatusBadge course={course} className="ms-2" />
      </a>
    </Link>
  ),
};

export const cancelRegistrationColumn = {
  title: 'Désinscription',
  render: registration => !registration.course.isCanceled
    && !registration.isUserCanceled && (
      <CancelRegistrationConfirmDialog
        registration={registration}
        triggerer={clickHandler => ( // eslint-disable-line react/no-unstable-nested-components
          <Button size="sm" variant="danger" onClick={clickHandler}>
            <BsXOctagon className="icon" />
          </Button>
        )}
      />
  ),
  props: { className: 'text-center' },
};

export const detailsColumnFor = urlFor => ({
  title: 'Détails',
  render: ({ id }) => (
    <Link href={urlFor(id)} passHref>
      <Button variant="secondary" size="sm">
        <BsEyeFill className="icon" />
      </Button>
    </Link>
  ),
  props: { className: 'text-center' },
});

// eslint-disable-next-line
export const renderEmailCompare = emailOther => function (email) {
  return (
    <>
      <span className="font-monospace">{email}</span>
      {emailOther != null && emailOther === email && <StarIndicator text="Il s'agit de votre compte" />}
    </>
  );
};

export const renderEmail = renderEmailCompare(null);
