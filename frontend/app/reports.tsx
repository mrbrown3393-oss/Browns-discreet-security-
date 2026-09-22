import React, { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Dialog, Notice } from '../src/components/ui';
import { AppShell, Empty, Heading, Loading, PremiumGate, QueryError } from '../src/components/security-ui';
import { useSecurityMutation, useSecurityQuery } from '../src/security/hooks';
import { Report, Posture } from '../src/security/types';
import { fonts, makeStyles, useTheme } from '../src/theme';

export default function Reports() { return <AppShell testID="reports-screen" active="Reports"><Heading title="SECURITY AUDITS" eyebrow="ADVANCED REPORTS / PRO" /><PremiumGate><ReportContent /></PremiumGate></AppShell>; }
function ReportContent() {
  const s = useStyles(); const { colors } = useTheme(); const query = useSecurityQuery<Report[]>('reports'); const generate = useSecurityMutation<Report>();
  const [selected, setSelected] = useState<Report | null>(null); const [shareError, setShareError] = useState('');
  async function share(report: Report) {
    setShareError('');
    try { await Share.share({ title: report.title, message: reportText(report) }); }
    catch { setShareError('Sharing is unavailable here. You can select and copy the report text below.'); }
  }
  return <>
    <View style={s.generateCard}><Ionicons name="document-text-outline" color={colors.brand} size={30} /><Text style={s.generateTitle}>A record you can act on.</Text><Text style={s.body}>Save a dated snapshot of your declared controls, open incidents and prioritized recommendations.</Text><Button testID="generate-report-button" title="Generate audit report" loading={generate.isPending} onPress={() => generate.mutate({ path: 'reports' }, { onSuccess: report => { setSelected(report); setShareError(''); } })} /></View>
    {generate.error && <Notice testID="report-generate-error" error text={generate.error.message} />}
    <Text testID="report-methodology-notice" style={s.note}>Reports assess the device information you entered. They are not penetration tests, automated scans or compliance certifications.</Text>
    {query.isLoading && <Loading text="Loading saved reports…" />}{query.error && <QueryError error={query.error} retry={() => void query.refetch()} />}
    {!query.isLoading && !query.error && !query.data?.length && <Empty title="No saved reports yet." text="Register a device and generate your first security posture report." />}
    {(query.data || []).map(report => <Pressable key={report.id} testID={`report-row-${report.id}`} onPress={() => { setSelected(report); setShareError(''); }} style={s.reportRow}>
      <View style={s.grow}><Text style={s.reportTitle}>{report.title}</Text><Text style={s.date}>{new Date(report.created_at).toLocaleString()} · {report.workspace.sector}</Text><Text style={s.date}>{report.posture.device_count} devices · {report.posture.open_alerts} open incidents</Text></View><Text testID={`report-score-${report.id}`} style={s.score}>{report.posture.score ?? '—'}</Text>
    </Pressable>)}
    <Dialog testID="report-detail-dialog" visible={!!selected} title="Audit snapshot" onClose={() => setSelected(null)}>
      {selected && <><Text testID="report-detail-title" style={s.reportTitle}>{selected.title}</Text><View style={s.scoreHeader}><Text testID="report-detail-score" style={s.bigScore}>{selected.posture.score}</Text><Text style={s.body}>/100 inventory controls</Text></View><ControlBars posture={selected.posture} />
        <Text style={s.findingsTitle}>PRIORITIZED FINDINGS</Text>{selected.posture.findings.length ? selected.posture.findings.map((finding, index) => <View key={finding.title} testID={`report-finding-${index}`} style={s.finding}><Text style={s.reportTitle}>{finding.title}</Text><Text style={s.body}>{finding.detail}</Text></View>) : <Text testID="report-no-findings" style={s.body}>No gaps found in the declared controls. Continue regular reviews.</Text>}
        <Notice testID="report-scope-notice" text={selected.methodology} /><Button testID="report-share-button" title="Share report" secondary onPress={() => void share(selected)} />
        {shareError && <><Notice testID="report-share-error" text={shareError} /><Text testID="report-selectable-text" selectable style={s.body}>{reportText(selected)}</Text></>}
      </>}
    </Dialog>
  </>;
}
function ControlBars({ posture }: { posture: Posture }) {
  const s = useStyles(); return <View style={s.bars}>{[['MFA', posture.mfa_count], ['Encryption', posture.encrypted_count], ['Updates', posture.updated_count], ['Access reviewed', posture.reviewed_count]].map(([label, count]) => <View key={label}><View style={s.barLabel}><Text style={s.body}>{label}</Text><Text style={s.date}>{count}/{posture.device_count}</Text></View><View style={s.track}><View style={[s.barFill, { width: `${posture.device_count ? Number(count) / posture.device_count * 100 : 0}%` }]} /></View></View>)}</View>;
}
function reportText(report: Report) {
  const p = report.posture;
  return `${report.title}\nGenerated: ${new Date(report.created_at).toLocaleString()}\nSector: ${report.workspace.sector}\nInventory score: ${p.score}/100\nDevices: ${p.device_count}\nOpen incidents: ${p.open_alerts}\nMFA: ${p.mfa_count}/${p.device_count}\nEncryption: ${p.encrypted_count}/${p.device_count}\nCurrent updates: ${p.updated_count}/${p.device_count}\nAccess reviewed: ${p.reviewed_count}/${p.device_count}\n\nFindings:\n${p.findings.length ? p.findings.map(f => `[${f.priority}] ${f.title}: ${f.detail}`).join('\n') : 'No gaps recorded.'}\n\nMethodology: ${report.methodology}`;
}
const useStyles = makeStyles(c => ({
  generateCard: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, padding: 20, gap: 16, borderRadius: 4 }, generateTitle: { fontFamily: fonts.display, fontSize: 27, color: c.onSurface }, body: { fontFamily: fonts.body, fontSize: 12, lineHeight: 20, color: c.muted }, note: { fontFamily: fonts.body, fontSize: 11, lineHeight: 18, color: c.muted, marginVertical: 20 }, reportRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderBottomWidth: 1, borderColor: c.border }, grow: { flex: 1 }, reportTitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22, color: c.onSurface }, date: { fontFamily: fonts.body, fontSize: 10, lineHeight: 17, color: c.muted, marginTop: 5 }, score: { fontFamily: fonts.display, fontSize: 36, color: c.brand }, scoreHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 12 }, bigScore: { fontFamily: fonts.display, fontSize: 64, color: c.onSurface }, bars: { gap: 12 }, barLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, track: { height: 4, backgroundColor: c.borderStrong, marginTop: 8 }, barFill: { height: 4, backgroundColor: c.brand }, findingsTitle: { fontFamily: fonts.medium, color: c.muted, fontSize: 10, letterSpacing: 1.2, marginTop: 10 }, finding: { gap: 8, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 12 },
}));