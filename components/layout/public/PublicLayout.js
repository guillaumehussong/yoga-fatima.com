import { HeadMeta } from '../HeadMeta';
import { FooterLayout } from './FooterLayout';
import { NavigationLayout } from './NavigationLayout';

export function PublicLayout({ children, pathname, padNavbar, title }) {

  return (
    <div className="d-flex flex-column min-vh-100">
      <HeadMeta title={`${title} - Yoga Sof`} />

      <NavigationLayout pathname={pathname} />

      {padNavbar && (
        <div style={{ height: '56px' }} />
      )}

      {children}

      <FooterLayout />
    </div>
  );
}
