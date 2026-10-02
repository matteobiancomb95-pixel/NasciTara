import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
const state = vi.hoisted(()=>({call:vi.fn(),online:true,lang:'it'}));
vi.mock('../state/NasciTaraStore',()=>({useNasciTara:()=>({lang:state.lang})}));
vi.mock('../state/MammaStore',()=>({useMamma:()=>state}));
import {VoiceTab} from '../screens/Voce';
afterEach(cleanup);beforeEach(()=>{state.call.mockReset();state.online=true;state.lang='it'});
function fill(){render(<VoiceTab firstName="QA"/>);fireEvent.click(screen.getByRole('radio',{name:'5 / 5'}));fireEvent.change(screen.getByLabelText('Descrizione'),{target:{value:'  Ottima app  '}});return screen.getByRole('button',{name:'Invia'});}
describe('Voice of Customer UAT component flows',()=>{
 it('requires a rating and three characters',()=>{render(<VoiceTab firstName=""/>);expect(screen.getByRole('button',{name:'Invia'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Descrizione'),{target:{value:'abc'}});expect(screen.getByRole('button',{name:'Invia'})).toBeDisabled();});
 it('shows success only after acknowledgement and sends contact false',async()=>{state.call.mockResolvedValue({status:'ok'});fireEvent.click(fill());await screen.findByText('Grazie, QA!');expect(state.call).toHaveBeenCalledWith('submit-feedback',expect.objectContaining({text:'Ottima app',stars:5,contact:false}));});
 it('preserves values on both-provider failure and hides technical details',async()=>{state.call.mockResolvedValue({status:'unavailable',mail:'brevo_401',sheet:'sheet_403_PERMISSION_DENIED'});fireEvent.click(fill());await screen.findByRole('alert');expect(screen.getByLabelText('Descrizione')).toHaveValue('  Ottima app  ');expect(screen.getByRole('alert').textContent).not.toContain('brevo');expect(screen.getByRole('button',{name:'Invia'})).toBeEnabled();});
 it('recovers from thrown network errors and permits retry',async()=>{state.call.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({status:'ok'});fireEvent.click(fill());await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Invia'}));await screen.findByText('Grazie, QA!');});
 it('blocks duplicate clicks and edits during submission',async()=>{let done!:(r:unknown)=>void;state.call.mockImplementation(()=>new Promise(r=>done=r));const b=fill();fireEvent.click(b);fireEvent.click(b);expect(state.call).toHaveBeenCalledOnce();expect(screen.getByLabelText('Descrizione')).toBeDisabled();done({status:'ok'});await screen.findByText('Grazie, QA!');});
 it('reports daily limit without falsely promising one minute',async()=>{state.call.mockResolvedValue({status:'limited',retry_after:7200});fireEvent.click(fill());expect(await screen.findByRole('alert')).toHaveTextContent('120 minuti');});
 it('handles expired authentication',async()=>{state.call.mockResolvedValue({status:'unauthorized'});fireEvent.click(fill());expect(await screen.findByRole('alert')).toHaveTextContent('Accedi di nuovo');});
 it('submits an idea with no rating',async()=>{state.call.mockResolvedValue({status:'ok'});render(<VoiceTab firstName=""/>);fireEvent.click(screen.getByRole('button',{name:'Nuova funzionalità'}));fireEvent.change(screen.getByLabelText('Descrizione'),{target:{value:'Una nuova idea'}});fireEvent.click(screen.getByRole('button',{name:'Invia'}));await waitFor(()=>expect(state.call).toHaveBeenCalledWith('submit-feedback',expect.objectContaining({kind:'idea',stars:null})));});
 it('keeps anonymous users from submitting',()=>{state.online=false;expect(fill()).toBeDisabled();});
});
