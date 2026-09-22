import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Dialog, Notice } from '../src/components/ui';
import { AppShell, Choices, Empty, Field, Heading, Loading, QueryError } from '../src/components/security-ui';
import { useSecurityMutation, useSecurityQuery } from '../src/security/hooks';
import { Alert } from '../src/security/types';
import { fonts, makeStyles, useTheme } from '../src/theme';

export default function Alerts() {
  const s = useStyles(); const { colors } = useTheme(); const query = useSecurityQuery<Alert[]>('alerts'); const mutation = useSecurityMutation();
  const [filter, setFilter] = useState('open'); const [create, setCreate] = useState(false); const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [severity, setSeverity] = useState('medium');
  const selectedAlert = query.data?.find(a => a.id === selected); const alerts = (query.data || []).filter(a => filter === 'all' || a.status === filter);
  return <AppShell active="Alerts" testID="alerts-screen">
    <Heading title="INCIDENT CENTER" eyebrow="ALERTS & RESPONSE" action={<Pressable testID="add-alert-button" accessibilityLabel="Report an incident" accessibilityRole="button" onPress={() => { setTitle(''); setDescription(''); mutation.reset(); setCreate(true); }} style={s.add}><Ionicons name="add" size={25} color={colors.onBrand} /></Pressable>} />
    <Choices testID="alert-filter" values={['open', 'resolved', 'all']} value={filter} onChange={setFilter} /><Text testID="alerts-source-notice" style={s.note}>Reported incidents and inventory-control checks. Refreshes every 30 seconds; no endpoint monitoring is connected.</Text>
    {query.isLoading && <Loading />}{query.error && <QueryError error={query.error} retry={() => void query.refetch()} />}
    {!query.isLoading && !query.error && !alerts.length && <Empty title="No incidents in this view." text="Record a security concern with +. Devices with missing declared controls also create review alerts." />}
    {alerts.map(a => <Pressable testID={`alert-row-${a.id}`} key={a.id} onPress={() => { mutation.reset(); setSelected(a.id); }} style={s.card}>
      <View style={s.row}><Text testID={`alert-severity-${a.id}`} style={[s.severity, ['high', 'critical'].includes(a.severity) && { color: colors.error }]}>{a.severity.toUpperCase()}</Text><Text style={s.date}>{new Date(a.updated_at).toLocaleDateString()}</Text></View>
      <Text testID={`alert-title-${a.id}`} style={s.title}>{a.title}</Text><Text numberOfLines={2} style={s.description}>{a.description}</Text><View style={s.footer}><Text style={s.source}>{a.source === 'control_check' ? 'Inventory check' : 'Manual report'}</Text><Text testID={`alert-status-${a.id}`} style={s.source}>{a.status.toUpperCase()}</Text></View>
    </Pressable>)}
    <Dialog testID="alert-create-dialog" visible={create} title="Report an incident" onClose={() => !mutation.isPending && setCreate(false)}>
      <Field testID="alert-title-input" label="Incident title" value={title} onChange={setTitle} /><Field testID="alert-description-input" label="What happened? (avoid passwords or sensitive data)" value={description} onChange={setDescription} multiline /><Text style={s.note}>SEVERITY</Text><Choices testID="alert-severity" values={['low', 'medium', 'high', 'critical']} value={severity} onChange={setSeverity} />
      {mutation.error && <Notice testID="alert-create-error" text={mutation.error.message} error />}<Button testID="alert-create-submit" title="Save incident" disabled={!title.trim()} loading={mutation.isPending} onPress={() => mutation.mutate({ path: 'alerts', body: { title, description, severity } }, { onSuccess: () => { setCreate(false); setFilter('open'); } })} />
    </Dialog>
    <Dialog testID="alert-detail-dialog" visible={!!selectedAlert} title="Incident details" onClose={() => !mutation.isPending && setSelected(null)}>
      <Text testID="alert-detail-title" style={s.title}>{selectedAlert?.title}</Text><Text testID="alert-detail-description" style={s.description}>{selectedAlert?.description || 'No additional details recorded.'}</Text><Text style={s.note}>Source: {selectedAlert?.source === 'control_check' ? 'Declared inventory controls' : 'User report'} · {selectedAlert?.severity}</Text>
      {selectedAlert?.source === 'control_check' && <Notice testID="alert-control-notice" text="Resolving acknowledges this finding. Update the device’s controls to fix the underlying inventory gap; editing an insecure device can reopen this alert." />}
      {mutation.error && <Notice testID="alert-update-error" text={mutation.error.message} error />}<Button testID="alert-toggle-status-button" title={selectedAlert?.status === 'open' ? 'Mark resolved' : 'Reopen incident'} loading={mutation.isPending} onPress={() => selectedAlert && mutation.mutate({ path: `alerts/${selectedAlert.id}`, body: { status: selectedAlert.status === 'open' ? 'resolved' : 'open' } }, { onSuccess: () => setSelected(null) })} />
    </Dialog>
  </AppShell>;
}
const useStyles = makeStyles(c => ({
  add: { width: 46, height: 46, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center', borderRadius: 4 }, note: { fontFamily: fonts.body, fontSize: 11, color: c.muted, lineHeight: 18, marginBottom: 16 }, card: { backgroundColor: c.surfaceSecondary, padding: 18, borderWidth: 1, borderColor: c.border, borderRadius: 4, marginBottom: 14 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, severity: { fontFamily: fonts.medium, fontSize: 10, color: c.warning, letterSpacing: 1 }, date: { color: c.muted, fontFamily: fonts.body, fontSize: 10 }, title: { color: c.onSurface, fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 }, description: { color: c.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 20, marginTop: 6 }, footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }, source: { color: c.muted, fontFamily: fonts.medium, fontSize: 10 },
}));