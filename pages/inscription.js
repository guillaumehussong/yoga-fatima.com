import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { BsArrowLeft, BsArrowRight, BsCheckLg, BsInfoCircleFill } from 'react-icons/bs';
import Link from 'next/link';
import { Form as FinalForm } from 'react-final-form';

import { PublicLayout } from '../components/layout/public';
import { ErrorMessage } from '../components';
import { StaticPaginatedTable } from '../components/table';
import {
  EMAIL_CONTACT, formatDayRange,
  IS_REGISTRATION_DISABLED,
  SESSIONS_NAMES,
  YOGA_ADULT,
} from '../lib/common';
import { usePromiseCallback, usePromiseEffect } from '../hooks';
import { getSelfRegistrations, getCoursesSchedule, postSelfRegistrationBatch } from '../lib/client/api';
import { useNotificationsContext, useRefreshContext } from '../state';

const REGISTRATION_SESSION_TYPE = YOGA_ADULT;

function RegistrationFormLayout({ sessionData, scheduleData, selfRegistrations }) {
  const [{ isLoading: isSubmitting, isError: isSubmitError, data: submitResult }, submitDispatch] = usePromiseCallback(data => postSelfRegistrationBatch(data), []);
  const { notify } = useNotificationsContext();
  const refresh = useRefreshContext();

  const onSubmit = useCallback(data => {
    const { isStateConfirm, ...dataToSubmit } = data;

    submitDispatch(dataToSubmit);
  }, [submitDispatch]);

  useEffect(() => {
    if (submitResult) {
      notify({
        title: 'Inscriptions confirmées',
        body: 'Vos inscriptions ont été prises en compte.',
        icon: BsCheckLg,
        delay: 10,
      });
    }
  }, [submitResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const isUserAlreadyRegisteredToCourse = id => selfRegistrations.some(({ course: { id: courseId }, isUserCanceled }) => courseId === id && !isUserCanceled);

  const renderForm = ({ handleSubmit, values, form: { mutators: { setValue } } }) => {
    const handleCourseSelect = id => {
      if (isUserAlreadyRegisteredToCourse(id)) {
        return;
      }
      const course = scheduleData.courses.filter(({ id: thatId }) => thatId === id)[0];
      if (course.registrations >= course.slots) {
        return;
      }
      const isSelected = values.courses.includes(id);
      const newCourses = isSelected ? values.courses.filter(courseId => courseId !== id) : values.courses.concat([id]);
      setValue('courses', newCourses);
    };

    const courseOrdinal = id => new Date(scheduleData.courses.filter(({ id: thatId }) => thatId === id)[0].dateStart).getTime();

    return !isSubmitting ? (
      <Form onSubmit={handleSubmit}>
        {!values.isStateConfirm ? (
          <>
            <p>
              Sélectionnez les séances pour lesquelles vous souhaitez vous inscrire :
            </p>

            <StaticPaginatedTable
              rows={scheduleData.courses}
              columns={[
                {
                  title: 'Type de séance',
                  render: ({ type }) => SESSIONS_NAMES[type],
                  props: {
                    className: 'text-center',
                  },
                },
                {
                  title: 'Date et horaire',
                  render: ({ dateStart, dateEnd }) => (
                    <>
                      {formatDayRange(dateStart, dateEnd)}
                    </>
                  ),
                  props: {
                    className: 'text-center',
                  },
                },
                {
                  title: 'Places restantes',
                  render: ({ slots, registrations }) => (
                    <>
                      <span className={slots >= registrations ? 'text-success' : 'text-danger'}>{slots - registrations}</span>
                      {' '}
                      /
                      {' '}
                      {slots}
                    </>
                  ),
                  props: {
                    className: 'text-center',
                  },
                },
                {
                  title: 'Inscription ?',
                  render: ({ id, slots, registrations }) => (
                    <Form.Check
                      type="checkbox"
                      id={`check-${id}`}
                      disabled={registrations >= slots || isUserAlreadyRegisteredToCourse(id)}
                      checked={isUserAlreadyRegisteredToCourse(id) ? true : values.courses.includes(id)}
                      onClick={() => handleCourseSelect(id)}
                      onChange={() => null}
                    />
                  ),
                  props: {
                    className: 'text-center justify-content-center',
                  },
                },
              ]}
              rowProps={({ id }) => ({
                onClick: () => handleCourseSelect(id),
                style: {
                  opacity: isUserAlreadyRegisteredToCourse(id) ? 0.3 : null,
                  cursor: isUserAlreadyRegisteredToCourse(id) ? null : 'pointer',
                },
              })}
              striped={false}
            />

            <div className="text-center mb-2">
              <small>
                <strong>{values.courses.length}</strong>
                {' '}
                séance
                {values.courses.length > 1 ? 's' : ''}
                {' '}
                sélectionnée
                {values.courses.length > 1 ? 's' : ''}
              </small>
            </div>

            {selfRegistrations.length > 0 && (
              <p className="text-center">
                Les séances grisées correspondent à celles pour lesquelles vous êtes déjà inscrit(e).
              </p>
            )}

            <div className="text-center">
              <Button size="lg" className="shadow" onClick={() => setValue('isStateConfirm', true)} disabled={values.courses.length === 0}>
                Étape suivante
                <BsArrowRight className="icon ms-2" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {isSubmitError && (
              <ErrorMessage>
                Une erreur est survenue lors de votre inscription aux séances sélectionnées, veuillez réessayer.
              </ErrorMessage>
            )}

            {submitResult && (
              <Alert variant="success">
                <BsCheckLg className="icon me-2" />
                Vos inscriptions ont bien été prises en compte, vous pouvez les retrouver sur
                {' '}
                <Link href="/mes-inscriptions" passHref><Alert.Link>votre page personnelle</Alert.Link></Link>
                .
                Si vous souhaitez vous inscrire à d'autres séances,
                {' '}
                <Alert.Link
                  href="/inscription"
                  onClick={e => {
                    e.preventDefault();
                    refresh();
                  }}
                >
                  cliquez ici
                </Alert.Link>
                .
                {' '}
                À bientôt !
              </Alert>
            )}

            <Row xs={1} xl={2}>
              <Col>
                <h2 className="h4">Récapitulatif de vos inscriptions</h2>

                <Table bordered>
                  <thead>
                    <tr className="text-center">
                      <th>Type de séance</th>
                      <th>Date et horaire</th>
                      <th>Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.courses.slice().sort((a, b) => courseOrdinal(a) - courseOrdinal(b)).map((id, i) => (
                      <tr key={id}>
                        {i === 0 && (
                        <td rowSpan={values.courses.length} className="align-middle text-center">
                          {SESSIONS_NAMES[REGISTRATION_SESSION_TYPE]}
                        </td>
                        )}
                        <td>
                          {scheduleData.courses.filter(({ id: idOther }) => idOther === id).map(({ dateStart, dateEnd }) => formatDayRange(dateStart, dateEnd))[0]}
                        </td>
                        <td className="text-center">
                          {scheduleData.courses.filter(({ id: idOther }) => idOther === id).map(({ price }) => `${price} €`)[0]}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: 'solid black 2px' }} className="table-secondary">
                      <td colSpan={2} className="text-center">
                        <strong>{values.courses.length}</strong>
                        {' '}
                        séance
                        {values.courses.length > 1 ? 's' : ''}
                        {' '}
                        au total
                      </td>
                      <td className="text-center">
                        <strong>
                          {values.courses.map(id => scheduleData.courses.filter(({ id: idOther }) => idOther === id)[0].price).reduce((a, b) => a + b)}
                          {' '}
                          €
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </Table>
                <p className="mt-2">
                  Le règlement d'une séance s'effectue le jour-même sur place.
                  Il est également possible de régler toutes les séances en une fois.
                </p>
              </Col>
              <Col>
                <h4>Vos informations</h4>
                <Table bordered>
                  <tbody>
                    <tr>
                      <th>Nom</th>
                      <td>{sessionData.displayName}</td>
                    </tr>
                    <tr>
                      <th>Adresse e-mail</th>
                      <td>{sessionData.displayEmail}</td>
                    </tr>
                  </tbody>
                </Table>
                <p>
                  Vous pouvez modifier ces informations depuis votre page personnelle.
                  Votre adresse e-mail nous permet notamment de vous informer en cas d'annulation de séance.
                </p>
              </Col>
            </Row>

            {!submitResult && (
              <div className="text-center">
                <Button size="lg" variant="secondary" className="m-2" onClick={() => setValue('isStateConfirm', false)}>
                  <BsArrowLeft className="icon me-2" />
                  Retour
                </Button>
                <Button type="submit" size="lg" className="m-2 shadow" onClick={() => setValue('isStateConfirm', true)}>
                  <BsCheckLg className="icon me-2" />
                  Valider ces inscriptions
                </Button>
              </div>
            )}
          </>
        )}
      </Form>
    ) : (
      <div className="text-center my-2">
        <Spinner animation="border" />
      </div>
    );
  };

  return (
    <FinalForm
      onSubmit={onSubmit}
      initialValuesEqual={() => true} // Important: this prevents remounting
      initialValues={{
        courses: [],
        isStateConfirm: false,
      }}
      mutators={{ setValue: ([field, value], state, { changeValue }) => changeValue(state, field, () => value) }}
      render={renderForm}
    />
  );
}

function RegistrationCard({ sessionData }) {
  const { isLoading, isError, data } = usePromiseEffect(() => Promise.all([getCoursesSchedule(), getSelfRegistrations()]), []);

  return (
    <Card>
      <Card.Body>
        {!isLoading ? (
          !isError ? (
            data[0].courses.length > 0 ? (
              <RegistrationFormLayout sessionData={sessionData} scheduleData={data[0]} selfRegistrations={data[1]} />
            ) : (
              <Alert variant="info" className="mb-0">
                <BsInfoCircleFill className="icon me-2" />
                Il n'y a pas de séance disponible à venir. Les séances sont planifiées au fur et à mesure, mais vous pouvez toujours nous envoyer un e-mail pour nous indiquer vos disponibilités.
              </Alert>
            )
          ) : (
            <ErrorMessage noMargin>
              Une erreur est survenue lors du chargement des horaires, essayez de recharger la page.
            </ErrorMessage>
          )
        ) : (
          <div className="text-center my-2">
            <Spinner animation="border" />
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default function Inscription() {
  const { data: sessionData, status } = useSession();
  const isSessionLoading = useMemo(() => status === 'loading', [status]);

  return (
    <PublicLayout padNavbar title="Inscription">
      <Container className="py-4">
        <h1>Inscription à une ou plusieurs séance(s) de Yoga adulte</h1>
        <ul>
          <li>
            Les inscriptions aux séances de Yoga adulte se font via le formulaire ci-dessous.
            <br />
            Pour une inscription à des séances de Yoga enfant et Yoga parent-enfant,
            {' '}
            <a href={`mailto:${EMAIL_CONTACT}`}>veuillez nous envoyer un e-mail</a>
            .
          </li>
          <li>La première séance vous est offerte, à la date de votre choix.</li>
        </ul>

        {!IS_REGISTRATION_DISABLED ? (
          !isSessionLoading ? (
            sessionData ? (
              <RegistrationCard sessionData={sessionData} />
            ) : (
              <Alert variant="info">
                <BsInfoCircleFill className="icon me-2" />
                Vous devez être connecté pour accéder au formulaire d'inscription.
                {' '}
                <Link href="/connexion" passHref>
                  <Alert.Link>M'inscrire ou me connecter</Alert.Link>
                </Link>
              </Alert>
            )
          ) : (
            <div className="text-center my-3">
              <Spinner animation="border" />
            </div>
          )
        ) : (
          <Alert variant="info">
            <BsInfoCircleFill className="icon me-2" />
            Le formulaire d'inscription n'est pas ouvert pour le moment. Vous pouvez
            {' '}
            <Alert.Link href={`mailto:${EMAIL_CONTACT}`}>nous écrire</Alert.Link>
            {' '}
            pour obtenir plus de renseignements.
          </Alert>
        )}

      </Container>
    </PublicLayout>
  );
}
