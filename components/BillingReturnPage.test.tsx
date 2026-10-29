import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ refresh:vi.fn(), session:{user:{id:'user-1'}}, state:{lastError:null as string|null,entitlement:{plan:'free',valid_until:null}} }));
vi.mock('../store/useAuthStore',()=>({useAuthStore:(selector: (s: unknown)=>unknown)=>selector({session:mocks.session})}));
vi.mock('../store/useEntitlementStore',()=>({useEntitlementStore:Object.assign((selector:(s:unknown)=>unknown)=>selector({refresh:mocks.refresh,entitlement:mocks.state.entitlement}),{getState:()=>mocks.state})}));
vi.mock('@tanstack/react-router',()=>({Link:({children,to}: {children:React.ReactNode;to:string})=><a href={to}>{children}</a>}));
import BillingReturnPage from './BillingReturnPage';

beforeEach(()=>{vi.useFakeTimers(); mocks.refresh.mockReset(); mocks.state={lastError:null,entitlement:{plan:'free',valid_until:null}};});
afterEach(()=>{cleanup();vi.useRealTimers();});

it('uses the newly refreshed entitlement and stops polling after confirmation',async()=>{
  mocks.refresh.mockImplementation(async()=>{mocks.state.entitlement.plan='pro';});
  render(<BillingReturnPage/>);
  await act(async()=>{await Promise.resolve();});
  expect(screen.getByText('Спасибо! PRO активен')).toBeTruthy();
  await act(async()=>{await vi.advanceTimersByTimeAsync(65_000);});
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});

it('waits a minute for provider confirmation without overlapping requests',async()=>{
  let resolve:()=>void=()=>{};
  mocks.refresh.mockImplementationOnce(()=>new Promise<void>(done=>{resolve=done;})).mockResolvedValue(undefined);
  render(<BillingReturnPage/>);
  await act(async()=>{await vi.advanceTimersByTimeAsync(10_000);});
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  await act(async()=>{resolve();await Promise.resolve();await vi.advanceTimersByTimeAsync(50_000);});
  expect(screen.getByText('Оплата пока не подтверждена')).toBeTruthy();
  const calls=mocks.refresh.mock.calls.length;
  await act(async()=>{await vi.advanceTimersByTimeAsync(10_000);});
  expect(mocks.refresh).toHaveBeenCalledTimes(calls);
});
