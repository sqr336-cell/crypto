import { Redirect } from 'expo-router';
import { useMyProfile } from '../data/queries';
import { useSession } from '../state/session';

/** Entry: sends people where they belong. */
export default function Index() {
  const session = useSession((s) => s.session);
  const me = useMyProfile();
  if (!session) return <Redirect href="/welcome" />;
  if (!me.data?.onboardedAt) return <Redirect href="/onboarding" />;
  return <Redirect href="/discover" />;
}
