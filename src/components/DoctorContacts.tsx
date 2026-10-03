import { useEffect, useState } from 'react';
import { useAccount } from '../state/AccountContext';
import { useNasciTara } from '../state/NasciTaraStore';
import { Icon, IconBubble } from '../ui/icons';
import { TextInput } from '../ui/kit';
export function DoctorContacts() {
  const { user, updateProfile } = useAccount();
  const { lang } = useNasciTara(); const it = lang === 'it';
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const c = user?.user_metadata?.doctor_contact ?? {};
    setForm({ name: typeof c.name === 'string' ? c.name : '', phone: typeof c.phone === 'string' ? c.phone : '', email: typeof c.email === 'string' ? c.email : '' });
    setMessage(''); setEditing(false);
  }, [user?.id, user?.user_metadata?.doctor_contact]);
  const save = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await updateProfile({ doctor_contact: Object.fromEntries(Object.entries(form).map(([k,v]) => [k,v.trim()])) });
      if (result.ok) { setEditing(false); setMessage(it ? 'Contatti salvati nel tuo account.' : 'Contacts saved to your account.'); }
      else setMessage(it ? 'Salvataggio non riuscito. Riprova.' : 'Could not save. Try again.');
    } catch { setMessage(it ? 'Salvataggio non riuscito. Riprova.' : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  };
  const phoneValid = !form.phone || /^\+?[0-9 ()-]{5,30}$/.test(form.phone);
  const emailValid = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  return <section className="nt-card nt-doctor">
    <IconBubble name="stethoscope" /><h3 className="nt-h3">{it ? 'Contatta il ginecologo' : 'Contact your clinician'}</h3>
    {editing ? <form className="nt-stack6" onSubmit={e => { e.preventDefault(); if (phoneValid && emailValid) void save(); }}>
      <TextInput label={it ? 'Nome o studio' : 'Name or practice'} value={form.name} maxLength={120} onChange={name => setForm({ ...form, name })} />
      <TextInput label={it ? 'Telefono' : 'Phone'} type="tel" value={form.phone} maxLength={30} onChange={phone => setForm({ ...form, phone })} />
      <TextInput label="Email" type="email" value={form.email} maxLength={254} onChange={email => setForm({ ...form, email })} />
      {(!phoneValid || !emailValid) && <p className="nt-error">{it ? 'Controlla telefono ed email.' : 'Check phone and email.'}</p>}
      <button aria-busy={busy} type="submit" className="nt-btn" disabled={busy || !phoneValid || !emailValid}>{it ? 'Salva contatti' : 'Save contacts'}</button>
      <button type="button" className="nt-link" onClick={() => setEditing(false)}>{it ? 'Annulla' : 'Cancel'}</button>
    </form> : <>
      <p className="nt-note">{form.name || (it ? 'Salva i riferimenti del professionista che ti segue.' : 'Save contact details for your clinician.')}</p>
      <div className="nt-chips">
        {form.phone && phoneValid && <a className="nt-btn nt-btn--sm" href={`tel:${form.phone.replace(/[ ()-]/g, '')}`}><Icon name="phone" size={16} />{form.phone}</a>}
        {form.email && emailValid && <a className="nt-btn nt-btn--sm nt-btn--soft nt-contact-email" href={`mailto:${form.email}`}><Icon name="mail" size={16} />{form.email}</a>}
      </div>
      <button type="button" className="nt-link" onClick={() => setEditing(true)} disabled={!user}>{it ? 'Gestisci contatti' : 'Manage contacts'}</button>
    </>}
    {message && <p className="nt-note" role="status">{message}</p>}
  </section>;
}
