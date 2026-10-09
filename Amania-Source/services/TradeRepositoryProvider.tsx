import React, { createContext, PropsWithChildren, useContext } from 'react';
import { MockTradeRepository } from './mockTradeRepository';
import { TradeRepository } from './tradeTypes';

const demoRepository: TradeRepository = new MockTradeRepository();
const RepositoryContext = createContext<TradeRepository>(demoRepository);

/** Inject a Supabase, Firebase, or SQLite implementation without changing Trade screens. */
export function TradeRepositoryProvider({ children, repository = demoRepository }: PropsWithChildren<{ repository?: TradeRepository }>) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useTradeRepository(): TradeRepository { return useContext(RepositoryContext); }
