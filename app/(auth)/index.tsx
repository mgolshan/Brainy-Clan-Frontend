import { Redirect } from 'expo-router';

/**
 * Signed-out entry. When the auth guard sends a signed-out user to the `(auth)` group, the
 * router lands on the group's index; without this screen that is an unmatched route on web and,
 * on native, the router falls back to another reachable screen (in dev: the theme preview).
 */
export default function AuthIndex() {
  return <Redirect href="/welcome" />;
}
