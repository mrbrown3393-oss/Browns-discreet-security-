import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Dialog, Notice } from '../src/components/ui';
import { AppShell, Choices, Empty, Field, Heading, Loading, QueryError } from '../src/components/security-ui';
import { useAuth } from '../src/auth/context';
import { useSecurityMutation, useSecurityQuery } from '../src/security/hooks';
import { categories, guides, Ticket } from '../src/support/content';
import { fonts, makeStyles, useTheme } from '../src/theme';

export default function Support() {
  const s = useStyles(); const { colors } = useTheme(); const { user } = useAuth();
  const [tab, setTab] = useState('Help'); const [search, setSearch] = useState(''); const [expanded, setExpanded] = useState<string | null>(null);
  const [compose, setCompose] = useState(false); const [selected, setSelected] = useState<string | null>(null); const [filter, setFilter] = useState('all');
  const [subject, setSubject] = useState(''); const [category, setCategory] = useState('Other'); const [message, setMessage] = useState(''); const [reply, setReply] = useState('');
  const staff = user?.support_staff === true;
  const list = useSecurityQuery<Ticket[]>(tab === 'Staff inbox' ? 'support/inbox' : 'support/tickets', tab !== 'Help' && (tab !== 'Staff inbox' || staff));
  const detail = useSecurityQuery<Ticket>(selected ? `support/tickets/${selected}` : 'support/no-ticket', !!selected);
  const mutation = useSecurityMutation<Ticket>();
  const articles = guides.filter(g => `${g.question} ${g.answer} ${g.category}`.toLowerCase().includes(search.toLowerCase()));
  const tickets = (list.data || []).filter(t => filter === 'all' || t.status === filter.replace(' ', '_'));
  function newTicket() { mutation.reset(); setSubject(''); setMessage(''); setCategory('Other'); setCompose(true); }
  function openTicket(id: string) { mutation.reset(); setReply(''); setSelected(id); }
  return <AppShell testID="support-screen" active="">
    <Heading title="HERE TO HELP." eyebrow="SUPPORT CENTER" action={<View style={s.helpIcon}><Ionicons name="help-buoy-outline" color={colors.brand} size={28} /></View>} />
    <Text style={s.intro}>Find clear answers. Keep every request in one place.</Text>
    <Choices testID="support-tab" values={staff ? ['Help', 'My tickets', 'Staff inbox'] : ['Help', 'My tickets']} value={tab} onChange={setTab} />
    {tab === 'Help' ? <>
      <Field testID="support-search-input" label="Search help articles" value={search} onChange={setSearch} />
      {!articles.length && <Empty title="No matching answers." text="Try a different phrase, or open a support ticket below." />}
      {articles.map(article => <View key={article.id} style={s.article}>
        <Pressable testID={`support-faq-${article.id}`} accessibilityRole="button" accessibilityState={{ expanded: expanded === article.id }} onPress={() => setExpanded(expanded === article.id ? null : article.id)} style={s.articleButton}><View style={s.grow}><Text style={s.category}>{article.category.toUpperCase()}</Text><Text style={s.question}>{article.question}</Text></View><Ionicons name={expanded === article.id ? 'remove' : 'add'} color={colors.muted} size={19} /></Pressable>
        {expanded === article.id && <Text testID={`support-answer-${article.id}`} style={s.answer}>{article.answer}</Text>}
      </View>)}
      <View style={s.contactCard}><Ionicons name="chatbubbles-outline" color={colors.brand} size={26} /><Text style={s.contactTitle}>Need something else?</Text><Text style={s.body}>Submit a request to the app owner. Track replies in My tickets. No email notifications or guaranteed response time.</Text><Button testID="support-new-ticket-button" title="Create a support ticket" onPress={newTicket} /><Button testID="support-manage-billing-button" title="Manage my subscription" secondary onPress={() => router.push('/subscription')} /></View>
    </> : <>
      <View style={s.listHeading}><Text testID="support-ticket-count" style={s.category}>{tickets.length} {tab === 'Staff inbox' ? 'INBOX' : 'MY'} REQUESTS</Text><Pressable testID="support-list-refresh-button" accessibilityRole="button" accessibilityLabel="Refresh tickets" style={s.iconButton} onPress={() => void list.refetch()}><Ionicons name="refresh" size={20} color={colors.muted} /></Pressable></View>
      <Choices testID="support-filter" values={['all', 'open', 'in progress', 'resolved']} value={filter} onChange={setFilter} />
      {list.isLoading && <Loading text="Loading support requests…" />}{list.error && <QueryError error={list.error} retry={() => void list.refetch()} />}
      {!list.isLoading && !list.error && !tickets.length && <Empty title="No requests in this view." text={tab === 'Staff inbox' ? 'Customer requests will appear here. Only support staff can open this inbox.' : 'Create a ticket to start a conversation with the app owner.'} />}
      {tickets.map(ticket => <Pressable key={ticket.id} testID={`support-ticket-${ticket.id}`} onPress={() => openTicket(ticket.id)} style={s.ticket}><View style={s.ticketMeta}><Text style={s.category}>{ticket.reference}</Text><Text testID={`support-status-${ticket.id}`} style={[s.status, ticket.status === 'resolved' && { color: colors.success }]}>{ticket.status.replace('_', ' ').toUpperCase()}</Text></View><Text style={s.ticketTitle}>{ticket.subject}</Text><Text style={s.ticketCaption}>{ticket.category} · {new Date(ticket.updated_at).toLocaleDateString()}</Text>{tab === 'Staff inbox' && <Text style={s.ticketCaption}>{ticket.contact_email}</Text>}</Pressable>)}
      <Button testID="support-list-new-ticket-button" title="Create a support ticket" onPress={newTicket} />
    </>}
    <Notice testID="support-emergency-notice" text="Active security emergency? Contact your organization’s security team or incident-response provider. These tickets are not emergency monitoring or response." />
    <Dialog testID="support-create-dialog" visible={compose} title="New support request" onClose={() => !mutation.isPending && setCompose(false)}>
      <Field testID="support-subject-input" label="Subject (at least 3 characters)" value={subject} onChange={setSubject} /><Text style={s.category}>CATEGORY</Text><Choices testID="support-category" values={categories} value={category} onChange={setCategory} /><Field testID="support-message-input" label="What do you need help with? (at least 10 characters)" value={message} onChange={setMessage} multiline />
      <Text style={s.body}>Include what happened and what you expected. Don’t include passwords, private keys, payment details, or restricted data.</Text>
      {mutation.error && <Notice testID="support-create-error" text={mutation.error.message} error />}<Button testID="support-submit-ticket-button" title="Submit request" disabled={subject.trim().length < 3 || message.trim().length < 10} loading={mutation.isPending} onPress={() => mutation.mutate({ path: 'support/tickets', body: { subject: subject.trim(), category, message: message.trim() } }, { onSuccess: ticket => { setCompose(false); setTab('My tickets'); setFilter('all'); openTicket(ticket.id); } })} />
    </Dialog>
    <Dialog testID="support-thread-dialog" visible={!!selected} title={detail.data?.reference || 'Support request'} onClose={() => !mutation.isPending && setSelected(null)}>
      {detail.isLoading && <Loading text="Loading conversation…" />}{detail.error && <QueryError error={detail.error} retry={() => void detail.refetch()} />}
      {detail.data && <>
        <Text testID="support-thread-subject" style={s.ticketTitle}>{detail.data.subject}</Text><Text testID="support-thread-status" style={s.status}>{detail.data.status.replace('_', ' ').toUpperCase()}</Text>
        <Text style={s.body}>{staff ? detail.data.contact_email : 'Request saved. Replies will appear here in the app.'}</Text>
        {detail.data.messages.map(item => <View testID={`support-message-${item.id}`} key={item.id} style={[s.message, item.author === 'support' && s.staffMessage]}><Text style={s.messageMeta}>{item.author === 'support' ? 'SUPPORT' : 'CUSTOMER'} · {new Date(item.created_at).toLocaleString()}</Text><Text selectable style={s.messageText}>{item.text}</Text></View>)}
        <Field testID="support-reply-input" label="Add a reply" value={reply} onChange={setReply} multiline />
        {mutation.error && <Notice testID="support-reply-error" text={mutation.error.message} error />}<Button testID="support-send-reply-button" title="Send reply" disabled={!reply.trim()} loading={mutation.isPending} onPress={() => mutation.mutate({ path: `support/tickets/${selected}/reply`, body: { message: reply.trim() } }, { onSuccess: () => setReply('') })} />
        {staff && detail.data.status === 'open' && <Button testID="support-start-progress-button" title="Mark in progress" secondary disabled={mutation.isPending} onPress={() => mutation.mutate({ path: `support/tickets/${selected}/status`, body: { status: 'in_progress' } })} />}
        <Button testID="support-toggle-status-button" title={detail.data.status === 'resolved' ? 'Reopen ticket' : 'Mark resolved'} secondary disabled={mutation.isPending} onPress={() => mutation.mutate({ path: `support/tickets/${selected}/status`, body: { status: detail.data!.status === 'resolved' ? 'open' : 'resolved' } })} />
        <Button testID="support-refresh-thread-button" title="Refresh conversation" secondary disabled={mutation.isPending} onPress={() => void detail.refetch()} />
      </>}
    </Dialog>
  </AppShell>;
}
const useStyles = makeStyles(c => ({
  helpIcon: { height: 48, width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandWash, borderWidth: 1, borderColor: c.brandTertiary }, intro: { color: c.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginBottom: 22 }, grow: { flex: 1 }, article: { borderBottomWidth: 1, borderColor: c.border }, articleButton: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20 }, category: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1, color: c.muted }, question: { fontFamily: fonts.medium, color: c.onSurface, fontSize: 14, lineHeight: 23, marginTop: 8 }, answer: { fontFamily: fonts.body, fontSize: 13, lineHeight: 23, color: c.onSurfaceSecondary, paddingBottom: 20 }, contactCard: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, padding: 20, marginTop: 28, gap: 16, borderRadius: 4 }, contactTitle: { color: c.onSurface, fontFamily: fonts.display, fontSize: 27 }, body: { color: c.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 21 }, listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, iconButton: { height: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }, ticket: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, padding: 18, borderRadius: 4, marginBottom: 14 }, ticketMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }, status: { color: c.brand, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.8 }, ticketTitle: { fontFamily: fonts.medium, color: c.onSurface, fontSize: 15, lineHeight: 23 }, ticketCaption: { fontFamily: fonts.body, color: c.muted, fontSize: 11, lineHeight: 18, marginTop: 7 }, message: { backgroundColor: c.surface, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 4, gap: 8 }, staffMessage: { borderLeftWidth: 2, borderLeftColor: c.brand }, messageMeta: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 0.5, color: c.muted }, messageText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 22, color: c.onSurfaceTertiary },
}));