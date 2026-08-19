import json
import predict_server as engine

engine.load_data()
MATCHES = ['2018-05-26', '2019-06-01', '2022-12-18_World_Cup_2022',
           '2024-07-14_Euro_2024', '2024-07-15_Copa_America_2024',
           "2023-08-20_Women's_World_Cup_20", '2024-02-11_AFCON_2023']
out = {}
for md in MATCHES:
    df = engine.MATCH_DATA[md]
    teams = sorted(t for t in df['team_name'].dropna().unique() if str(t) != 'nan')
    out[md] = {}
    for team in teams:
        tac = engine.handle_command({'command': 'tactical', 'match_date': md, 'team': team})
        rec = {}
        if isinstance(tac, dict):
            for k in ('centrality', 'passing_rate', 'narrative'):
                if k in tac:
                    rec[k] = tac[k]
            rec['keys'] = list(tac.keys())
        out[md][team] = rec

with open('grund_data.json', 'w', encoding='utf-8') as fh:
    json.dump(out, fh, indent=1, default=str)

for md, teams in out.items():
    for team, rec in teams.items():
        c = rec.get('centrality')
        print(md[:10], '|', team[:22], '| centrality:', json.dumps(c, default=str)[:160])
