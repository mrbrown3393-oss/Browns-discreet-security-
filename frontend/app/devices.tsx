import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Dialog, Notice } from '../src/components/ui';
import { AppShell, Choices, Empty, Field, Heading, Loading, QueryError } from '../src/components/security-ui';
import { useSecurityMutation, useSecurityQuery } from '../src/security/hooks';
import { Device, DeviceInput } from '../src/security/types';
import { fonts, makeStyles, useTheme } from '../src/theme';

const blank: DeviceInput = { name: '', owner: '', platform: 'Windows', mfa: false, encrypted: false, updated: false, access: 'review' };
export default function Devices() {
  const s = useStyles(); const { colors } = useTheme(); const query = useSecurityQuery<Device[]>('devices'); const mutation = useSecurityMutation();
  const [form, setForm] = useState<DeviceInput>(blank); const [editing, setEditing] = useState<string | null>(null); const [open, setOpen] = useState(false); const [remove, setRemove] = useState(false);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all');
  const devices = (query.data || []).filter(d => (filter === 'all' || d.access === filter) && `${d.name} ${d.owner} ${d.platform}`.toLowerCase().includes(search.toLowerCase()));
  function edit(device?: Device) { setForm(device || { ...blank }); setEditing(device?.id || null); setRemove(false); mutation.reset(); setOpen(true); }
  function save() { mutation.mutate({ path: editing ? `devices/${editing}` : 'devices', body: form }, { onSuccess: () => setOpen(false) }); }
  return <AppShell testID="devices-screen" active="Devices">
    <Heading title="DEVICE INVENTORY" eyebrow="DEVICE & ACCESS" action={<Pressable testID="add-device-button" accessibilityRole="button" accessibilityLabel="Register device" onPress={() => edit()} style={s.add}><Ionicons name="add" color={colors.onBrand} size={25} /></Pressable>} />
    <Field testID="device-search-input" label="Search name, platform or owner" value={search} onChange={setSearch} /><Choices testID="device-filter" values={['all', 'review', 'allowed', 'denied']} value={filter} onChange={setFilter} />
    <Text testID="device-registry-notice" style={s.note}>Record device controls and access decisions. This registry does not scan devices or enforce network access.</Text>
    {query.isLoading && <Loading />}{query.error && <QueryError error={query.error} retry={() => void query.refetch()} />}
    {!query.isLoading && !query.error && !devices.length && <Empty title={query.data?.length ? 'No matching devices' : 'Your inventory starts here.'} text="Tap + to register a device, record its security controls and review access." />}
    {devices.map(device => <Pressable testID={`device-row-${device.id}`} key={device.id} accessibilityRole="button" onPress={() => edit(device)} style={s.device}>
      <View style={s.row}><View style={s.icon}><Ionicons name={['Android', 'iOS'].includes(device.platform) ? 'phone-portrait-outline' : 'laptop-outline'} color={colors.onSurfaceTertiary} size={24} /></View><View style={s.grow}><Text testID={`device-name-${device.id}`} style={s.name}>{device.name}</Text><Text style={s.description}>{device.platform}{device.owner ? ` · ${device.owner}` : ''}</Text></View><Ionicons name="chevron-forward" color={colors.muted} size={17} /></View>
      <View style={s.deviceFooter}><Text testID={`device-controls-${device.id}`} style={s.controls}>{[device.mfa, device.encrypted, device.updated].filter(Boolean).length}/3 controls recorded</Text><Text testID={`device-access-${device.id}`} style={s.access}>{device.access.toUpperCase()}</Text></View>
    </Pressable>)}
    <Dialog visible={open} testID="device-form-dialog" title={editing ? 'Edit device' : 'Register a device'} onClose={() => !mutation.isPending && setOpen(false)}>
      <Field testID="device-name-input" label="Device name" value={form.name} onChange={name => setForm({ ...form, name })} /><Field testID="device-owner-input" label="Owner or team (optional)" value={form.owner} onChange={owner => setForm({ ...form, owner })} />
      <Text style={s.label}>PLATFORM</Text><Choices testID="device-platform" values={['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Other']} value={form.platform} onChange={platform => setForm({ ...form, platform: platform as DeviceInput['platform'] })} />
      {(['mfa', 'encrypted', 'updated'] as const).map(key => <View key={key} style={s.toggle}><Text style={s.toggleText}>{key === 'mfa' ? 'MFA enabled' : key === 'encrypted' ? 'Disk encryption enabled' : 'Security updates current'}</Text><Switch testID={`device-${key}-switch`} accessibilityLabel={key} value={form[key]} onValueChange={value => setForm({ ...form, [key]: value })} trackColor={{ false: colors.borderStrong, true: colors.brand }} thumbColor={colors.onSurface} /></View>)}
      <Text style={s.label}>RECORDED ACCESS DECISION</Text><Choices testID="device-access" values={['review', 'allowed', 'denied']} value={form.access} onChange={access => setForm({ ...form, access: access as DeviceInput['access'] })} />
      {mutation.error && <Notice testID="device-save-error" error text={mutation.error.message} />}<Button testID="device-save-button" title="Save device" disabled={!form.name.trim()} loading={mutation.isPending} onPress={save} />
      {editing && <Button testID="device-remove-button" title={remove ? 'Confirm removal from registry' : 'Remove device'} secondary disabled={mutation.isPending} onPress={() => remove ? mutation.mutate({ path: `devices/${editing}/remove` }, { onSuccess: () => setOpen(false) }) : setRemove(true)} />}
      {remove && <Notice testID="device-remove-notice" text="This removes the registry entry and resolves its control-check alert. It does not change the actual device." />}
    </Dialog>
  </AppShell>;
}
const useStyles = makeStyles(c => ({
  add: { backgroundColor: c.brand, width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }, note: { fontFamily: fonts.body, color: c.muted, fontSize: 11, lineHeight: 18, marginBottom: 20 }, device: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 14, borderRadius: 4 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, grow: { flex: 1 }, icon: { width: 38, height: 44, justifyContent: 'center' }, name: { color: c.onSurface, fontFamily: fonts.medium, fontSize: 16 }, description: { color: c.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 5 }, deviceFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: c.border, marginTop: 16, paddingTop: 14 }, controls: { color: c.muted, fontFamily: fonts.body, fontSize: 11 }, access: { fontFamily: fonts.medium, color: c.brand, fontSize: 10, letterSpacing: 1 }, label: { color: c.muted, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1 }, toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 12 }, toggleText: { color: c.onSurfaceTertiary, fontFamily: fonts.body, fontSize: 13, flex: 1 },
}));