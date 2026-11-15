import { router, type Href } from 'expo-router';

/** Goes back when there is history (e.g. a modal opened from a screen), otherwise to a sensible screen. */
export function goBack(fallback: Href = '/discover') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
