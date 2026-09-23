export function ResultIcon({kind}:{kind:'growth'|'weight'|'length'|'percentile'|'birth'}){
 const paths={growth:'M3 18l6-6 4 3 8-11M15 4h6v6',weight:'M5 7h14l2 14H3L5 7zm4 0V5a3 3 0 0 1 6 0v2',length:'M4 4h16v16H4zM8 4v5m4-5v3m4-3v5',percentile:'M5 19L19 5M8 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0m12 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0',birth:'M12 21S3 15 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 13-9 13z'};
 return <span className="result-icon"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]}/></svg></span>;
}
