import React from 'react';
import Oidc from "./vanilla/oidc";
import {isTokensValid} from "./vanilla/parseTokens";
import {sleepAsync} from "./vanilla/initWorker";

export type Fetch = typeof window.fetch;
export interface ComponentWithOidcFetchProps {
  fetch?: Fetch;
}
const defaultConfigurationName = "default";

const fetchWithToken = (fetch: Fetch, getOidcWithConfigurationName: () => Oidc | null) => async (
    url: RequestInfo,
    options: RequestInit = { method: 'GET' }
) => {
  let headers = new Headers();
  const optionTmp = { ...options };

  if (optionTmp.headers) {
    headers = !(optionTmp.headers instanceof Headers)
        ? new Headers(optionTmp.headers)
        : optionTmp.headers;
  }
  const oidc = getOidcWithConfigurationName();
  
  

  // @ts-ignore
  const accessToken = oidc.tokens ? oidc.tokens.accessToken : null;
  // We wait  the synchronisation before making a request
  while (oidc.tokens && accessToken && !isTokensValid(oidc.tokens)){
    await sleepAsync(200);
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (!optionTmp.credentials) {
      optionTmp.credentials = 'same-origin';
    }
  }
  const newOptions = { ...optionTmp, headers };
  return await fetch(url, newOptions);
};

export const withOidcFetch = (fetch:Fetch=null, configurationName=defaultConfigurationName) => (
    WrappedComponent
  ) => (props: ComponentWithOidcFetchProps) => {
    const {fetch:newFetch} = useOidcFetch(fetch || props.fetch, configurationName)
    return <WrappedComponent {...props} fetch={newFetch} />;
  };


export const useOidcFetch =(fetch:Fetch=null, configurationName=defaultConfigurationName) =>{
  const previousFetch = fetch || window.fetch;
  const getOidc =  Oidc.get;
  const getOidcWithConfigurationName = () => { return getOidc(configurationName); };
  const newFetch = fetchWithToken(previousFetch, getOidcWithConfigurationName);
  return { fetch:newFetch };
}