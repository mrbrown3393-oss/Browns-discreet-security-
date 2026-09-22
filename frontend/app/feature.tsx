import { Redirect, useLocalSearchParams } from 'expo-router';
export default function FeatureRedirect() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  return <Redirect href={kind === 'assistant' ? '/assistant' : '/reports'} />;
}