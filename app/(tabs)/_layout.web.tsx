import { Slot } from 'expo-router';

/**
 * The web chrome now lives at the root so it wraps every signed-in route, not
 * just the tab group. This layout only has to hand its routes through.
 */
export default function WebTabLayout() {
  return <Slot />;
}
