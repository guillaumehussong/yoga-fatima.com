import {
  BREADCRUMB_SESSION_PLANNING_CREATE,
} from '../../../../components';
import { SessionBatchCreateForm } from '../../../../components/form';
import { ContentLayout, PrivateLayout } from '../../../../components/layout/admin';

export default function AdminSeancePlanningCreate({ pathname }) {

  return (
    <PrivateLayout pathname={pathname}>
      <ContentLayout pathname={pathname} title="Planification de nouvelles séances" breadcrumb={BREADCRUMB_SESSION_PLANNING_CREATE}>

        <SessionBatchCreateForm />

      </ContentLayout>
    </PrivateLayout>
  );
}

AdminSeancePlanningCreate.getInitialProps = ({ pathname })  => {
  return { pathname };
}
