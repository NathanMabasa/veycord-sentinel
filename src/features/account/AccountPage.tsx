import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Copy, LogOut, ShieldCheck } from 'lucide-react'
import { PageFrame } from '../site/SitePages'
import PrivateWorkspace from '../../PrivateWorkspace'
import './account.css'

type Session = { name:string; email:string; enrolled:boolean; mfa:boolean; role:'admin'|'analyst'|'viewer'|null }
async function accountRequest(path:string,body:Record<string,unknown>) {
  const response=await fetch('/api/auth'+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(body),signal:AbortSignal.timeout(15000)})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error?.message??'The account request could not be completed.')
  return data as {twoFactorRedirect?:boolean;totpURI?:string;backupCodes?:string[]}
}
export default function AccountPage(){
  const [session,setSession]=useState<Session|null>(null)
  const [loading,setLoading]=useState(true)
  const [disabled,setDisabled]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [pending,setPending]=useState(false)
  const [stage,setStage]=useState<'password'|'challenge'>('password')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [code,setCode]=useState('')
  const [recovery,setRecovery]=useState(false)
  const [setup,setSetup]=useState<{uri:string;codes:string[]}|null>(null)
  const [saved,setSaved]=useState(false)
  const [newPassword,setNewPassword]=useState('')
  const [freshCode,setFreshCode]=useState('')
  const reload=useCallback(async(signal?:AbortSignal)=>{
    const response=await fetch('/api/session/v1',{cache:'no-store',credentials:'same-origin',signal:signal??AbortSignal.timeout(15000)})
    const result=await response.json()
    if(!response.ok){if(result.error?.code==='AUTH_DISABLED'){setDisabled(true);return}throw new Error(result.error?.message??'Account access is unavailable.')}
    setDisabled(false);setSession(result.data)
  },[])
  useEffect(()=>{const controller=new AbortController();void reload(controller.signal).catch(caught=>{if(!controller.signal.aborted)setError(caught instanceof Error?caught.message:'Account access is unavailable.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[reload])
  async function perform(action:()=>Promise<void>){setPending(true);setError('');setNotice('');try{await action()}catch(caught){setError(caught instanceof Error?caught.message:'Could not reach your private installation. Try again.')}finally{setPending(false);setPassword('');setCode('');setFreshCode('');setNewPassword('')}}
  function signIn(event:FormEvent){event.preventDefault();void perform(async()=>{const result=await accountRequest('/sign-in/email',{email,password});if(result.twoFactorRedirect)setStage('challenge');else await reload()})}
  function enroll(event:FormEvent){event.preventDefault();void perform(async()=>{const result=await accountRequest('/two-factor/enable',{password,method:'totp'});if(!result.totpURI||!result.backupCodes)throw new Error('Authenticator setup could not be completed. Try again.');setSetup({uri:result.totpURI,codes:result.backupCodes});setSaved(false)})}
  function verify(event:FormEvent){event.preventDefault();void perform(async()=>{await accountRequest(recovery?'/two-factor/verify-backup-code':'/two-factor/verify-totp',{code,trustDevice:false});await reload();setSetup(null);setSaved(false);setRecovery(false);setStage('password')})}
  function signOut(){void perform(async()=>{await accountRequest('/sign-out',{});setSession(null);setSetup(null);setSaved(false);setStage('password');setEmail('')})}
  const ready=Boolean(session?.mfa && session.role)
  const title=ready?'Investigation workspace':disabled?'Account sign-in is not configured':'Sign in to your workspace'
  const secret=setup?new URL(setup.uri).searchParams.get('secret')??'':''
  return <PageFrame compact eyebrow="Private workspace" title={title} lead={ready?'Search stored events, review findings and manage investigations.':'Use the account provisioned by your installation administrator.'}>
    {loading?<p role="status">Checking account access…</p>:<>
      {error&&<div className="account-message account-message--error" role="alert">{error}</div>}
      {notice&&<p className="account-message" role="status">{notice}</p>}
      {disabled?<section className="account-panel"><h2>Set up accounts on your private installation</h2><p>Account access must be enabled by the operator. The public demo uses synthetic records and does not create accounts.</p><Link to="/operator">Open the existing operator workspace <ArrowRight size={16}/></Link><p><a href="https://github.com/NathanMabasa/veycord-sentinel/blob/main/docs/IDENTITY.md">Account setup documentation</a></p></section>:<>
        {session&&<div className="account-toolbar"><div><strong>{session.name}</strong><span>{session.email}{session.role?` · ${session.role}`:''}</span></div><button type="button" onClick={signOut} disabled={pending}><LogOut size={17}/>Sign out</button></div>}
        {!session&&stage==='password'&&<div className="account-layout"><section className="account-panel"><h2>Welcome back</h2><form onSubmit={signIn}><label htmlFor="account-email">Email address</label><input id="account-email" type="email" maxLength={254} autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="account-password">Password</label><input id="account-password" type="password" maxLength={128} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="button button-primary" disabled={pending}>{pending?'Signing in…':'Continue'}<ArrowRight size={17}/></button></form><details><summary>Need help signing in?</summary><p>Your administrator provisions accounts and resets lost passwords locally. If you lost your authenticator, choose a recovery code at the next step.</p></details></section><aside className="account-context"><ShieldCheck size={25}/><h2>Your installation, your data</h2><p>Account access and MFA protect the stored workspace. Each request is checked against your assigned role.</p><p>Looking for the sample environment?</p><Link to="/demo">Explore the synthetic demo <ArrowRight size={16}/></Link></aside></div>}
        {!session&&stage==='challenge'&&<section className="account-panel"><h2>{recovery?'Use a recovery code':'Verify your authenticator'}</h2><p>{recovery?'Enter one unused recovery code. Each code works once.':'Enter the current six-digit code from your authenticator app.'}</p><form onSubmit={verify}><label htmlFor="account-code">{recovery?'Recovery code':'Authentication code'}</label><input id="account-code" value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" inputMode={recovery?'text':'numeric'} maxLength={recovery?32:6} pattern={recovery?undefined:'[0-9]{6}'} required autoFocus/><button className="button button-primary" disabled={pending}>{pending?'Verifying…':'Verify and sign in'}</button></form><button type="button" className="account-link" onClick={()=>{setRecovery(!recovery);setCode('');setError('')}}>{recovery?'Use an authenticator instead':'Use a recovery code'}</button><button type="button" className="account-link" onClick={()=>{setStage('password');setCode('');setError('')}}>Return to sign-in</button></section>}
        {session&&!session.mfa&&<section className="account-panel account-panel--setup"><h2>{session.enrolled?'Verify before continuing':'Set up your authenticator'}</h2>{!session.enrolled&&!setup?<><p>Confirm your password to create an authenticator key and recovery codes. Workspace access stays locked until verification is complete.</p><form onSubmit={enroll}><label htmlFor="enroll-password">Current password</label><input id="enroll-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={128} required/><button className="button button-primary" disabled={pending}>{pending?'Preparing…':'Set up authenticator'}</button></form></>:<>
          {setup&&<><p>In your authenticator app, add a time-based account manually. Name it <strong>Veycord Sentinel</strong> and enter this setup key.</p><label htmlFor="authenticator-key">Authenticator setup key</label><input id="authenticator-key" className="account-secret" readOnly value={secret} spellCheck={false}/><button className="account-link" type="button" onClick={()=>{void navigator.clipboard.writeText(secret).then(()=>setNotice('Setup key copied. Keep it private.')).catch(()=>setNotice('Select the setup key and copy it manually.'))}}><Copy size={16}/>Copy setup key</button><h3>Save your recovery codes</h3><p>Store these in a password manager before continuing. They are only shown during this setup.</p><ul className="account-recovery">{setup.codes.map(item=><li key={item}><code>{item}</code></li>)}</ul><label className="account-check"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I have saved these recovery codes privately</label></>}
          <form onSubmit={verify}><label htmlFor="enroll-code">Current authentication code</label><input id="enroll-code" value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/><button className="button button-primary" disabled={pending||(Boolean(setup)&&!saved)}>{pending?'Verifying…':'Verify authenticator'}</button></form></>}
        </section>}
        {session?.mfa&&!session.role&&<section className="account-panel"><h2>Workspace access has not been granted</h2><p>Your account is verified. Ask the installation administrator to assign a workspace role, then sign in again.</p></section>}
        {ready&&session?.role&&<><details className="account-security"><summary>Account security</summary><p>Use a current authenticator code to confirm sensitive changes. Forgotten passwords are recovered through your administrator.</p><form onSubmit={e=>{e.preventDefault();void perform(async()=>{await accountRequest('/two-factor/verify-totp',{code:freshCode,trustDevice:false});setNotice('Authenticator verified for account changes.')})}}><label htmlFor="security-code">Current authentication code</label><input id="security-code" value={freshCode} onChange={e=>setFreshCode(e.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required/><button disabled={pending}>Verify code</button></form><form onSubmit={e=>{e.preventDefault();void perform(async()=>{await accountRequest('/change-password',{currentPassword:password,newPassword,revokeOtherSessions:true});setNotice('Password changed. Other sessions have been revoked.')})}}><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={128} required/><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={14} maxLength={128} required/><button disabled={pending}>Change password</button></form><button type="button" disabled={pending} onClick={()=>void perform(async()=>{await accountRequest('/revoke-other-sessions',{});setNotice('Other sessions have been revoked.')})}>Sign out other sessions</button></details><PrivateWorkspace key={session.email} sessionAccess={{name:session.name,role:session.role}}/></>}
      </>}
    </>}
  </PageFrame>
}
