import math
import pandas as pd
from collections import defaultdict

from predict_server import (
    get_nickname,
    calculate_network_metrics,
    calculate_thomas_grund_centrality,
)


def calculate_hub_player_analysis(df, team_name, network_data=None):
    """
    Detailed tactical analysis of a team's hub player (the one with the most
    passing involvements). Returns comprehensive strengths, weaknesses, and
    actionable mitigation strategies for the opposition, with a long-form
    tactical report covering zones, periods, phases, link-ups, and xT.
    """
    if network_data is None:
        network_data = calculate_network_metrics(df, team_name)
    if network_data is None:
        return None

    players = network_data.get("players", [])
    if not players:
        return None

    hub = max(players, key=lambda p: p.get("total_involvement", 0))
    hub_name = hub.get("name", "")
    hub_nickname = hub.get("nickname", hub_name)

    avg_x = hub.get("avg_x", 60)
    avg_y = hub.get("avg_y", 40)
    if avg_x < 25:
        position = "Goalkeeper"
    elif avg_x < 50:
        position = "Defender"
    elif avg_x < 80:
        position = "Midfielder"
    else:
        position = "Forward"

    pass_matrix = network_data.get("pass_matrix", {})
    hub_passes_out = pass_matrix.get(hub_name, {})
    top_recipients = sorted(hub_passes_out.items(), key=lambda x: x[1], reverse=True)[:5]

    hub_receivers_from = {}
    for passer, recipients in pass_matrix.items():
        if hub_name in recipients:
            hub_receivers_from[passer] = recipients[hub_name]
    top_sources = sorted(hub_receivers_from.items(), key=lambda x: x[1], reverse=True)[:5]

    betweenness = hub.get("betweenness_centrality", 0)
    eigenvector = hub.get("eigenvector_centrality", 0)
    clustering = hub.get("clustering_coefficient", 0)
    xt_val = hub.get("xt_generated", None) or 0
    total_involvement = hub.get("total_involvement", 0)
    passes_made = hub.get("passes_made", 0)
    passes_received = hub.get("passes_received", 0)
    degree = hub.get("degree_centrality", 0)

    grund = calculate_thomas_grund_centrality(df, team_name, network_data)
    grund_pct = grund.get("centrality_percentage", 0) if grund else 0
    grund_style = grund.get("style", "") if grund else ""

    # ---- PASS DATA ----
    team_all_passes = df[(df["team_name"] == team_name) & (df["event_type"] == "Pass")]
    hub_all_passes = team_all_passes[team_all_passes["player_name"] == hub_name]
    success_hub = hub_all_passes[hub_all_passes["pass_outcome_name"].isna()]

    # ---- DIRECTION ANALYSIS ----
    forward_count = 0
    backward_count = 0
    lateral_count = 0
    fwd_right_count = 0
    fwd_left_count = 0
    back_right_count = 0
    back_left_count = 0
    total_pass_distance = 0
    pass_distance_list = []
    for _, p in success_hub.iterrows():
        if pd.notna(p.get("location_0")) and pd.notna(p.get("pass_end_location_0")):
            dx = p["pass_end_location_0"] - p["location_0"]
            dy = p["pass_end_location_1"] - p["location_1"]
            dist = math.sqrt(dx*dx + dy*dy)
            total_pass_distance += dist
            pass_distance_list.append(dist)
            if dx > 5:
                forward_count += 1
                if dy > 3:
                    fwd_right_count += 1
                elif dy < -3:
                    fwd_left_count += 1
            elif dx < -5:
                backward_count += 1
                if dy > 3:
                    back_right_count += 1
                elif dy < -3:
                    back_left_count += 1
            else:
                lateral_count += 1
    total_dir = forward_count + backward_count + lateral_count or 1
    forward_pct = round(forward_count / total_dir * 100, 1)
    backward_pct = round(backward_count / total_dir * 100, 1)
    lateral_pct = round(lateral_count / total_dir * 100, 1)
    avg_pass_distance = round(total_pass_distance / len(pass_distance_list), 1) if pass_distance_list else 0

    # Short (<15m), Medium (15-30m), Long (>30m)
    short_passes = sum(1 for d in pass_distance_list if d < 15)
    medium_passes = sum(1 for d in pass_distance_list if 15 <= d <= 30)
    long_passes = sum(1 for d in pass_distance_list if d > 30)
    total_dist_count = short_passes + medium_passes + long_passes or 1
    short_pct = round(short_passes / total_dist_count * 100, 1)
    medium_pct = round(medium_passes / total_dist_count * 100, 1)
    long_pct = round(long_passes / total_dist_count * 100, 1)

    # ---- PRESSURE ANALYSIS ----
    passes_under_pressure = hub_all_passes[hub_all_passes["under_pressure"] == True]
    success_pressure = passes_under_pressure[passes_under_pressure["pass_outcome_name"].isna()]
    normal_passes = hub_all_passes[hub_all_passes["under_pressure"].isna() | (hub_all_passes["under_pressure"] == False)]
    success_normal = normal_passes[normal_passes["pass_outcome_name"].isna()]
    normal_acc = round(len(success_normal) / len(normal_passes) * 100, 1) if len(normal_passes) > 0 else 0
    pressure_acc = round(len(success_pressure) / len(passes_under_pressure) * 100, 1) if len(passes_under_pressure) >= 3 else None
    accuracy_drop = round(max(0, normal_acc - (pressure_acc or normal_acc)), 1) if pressure_acc is not None else None

    # ---- ZONE ANALYSIS (25-zone grid) ----
    zone_width = 24
    zone_height = 16
    zone_counts = defaultdict(int)
    zone_success = defaultdict(int)
    for _, p in success_hub.iterrows():
        if pd.notna(p.get("location_0")) and pd.notna(p.get("location_1")):
            col = min(int(p["location_0"] / zone_width), 4)
            row = min(int(p["location_1"] / zone_height), 4)
            zid = row * 5 + col
            zone_counts[zid] += 1
            zone_success[zid] += 1
    for _, p in hub_all_passes.iterrows():
        if pd.isna(p.get("pass_outcome_name")) and pd.notna(p.get("location_0")) and pd.notna(p.get("location_1")):
            col = min(int(p["location_0"] / zone_width), 4)
            row = min(int(p["location_1"] / zone_height), 4)
            zid = row * 5 + col
            # Already counted above for successful passes in success_hub
    # Get all passes (including failed) for zone attempts
    all_hub_with_loc = hub_all_passes[hub_all_passes["location_0"].notna()]
    zone_attempts = defaultdict(int)
    for _, p in all_hub_with_loc.iterrows():
        col = min(int(p["location_0"] / zone_width), 4)
        row = min(int(p["location_1"] / zone_height), 4)
        zid = row * 5 + col
        zone_attempts[zid] += 1

    zone_labels = {
        0: "Def L", 1: "Deep L", 2: "Mid L", 3: "Adv L", 4: "Att L",
        5: "Def LC", 6: "Deep LC", 7: "Mid LC", 8: "Adv LC", 9: "Att LC",
        10: "Def C", 11: "Deep C", 12: "Mid C", 13: "Adv C", 14: "Att C",
        15: "Def RC", 16: "Deep RC", 17: "Mid RC", 18: "Adv RC", 19: "Att RC",
        20: "Def R", 21: "Deep R", 22: "Mid R", 23: "Adv R", 24: "Att R",
    }
    zone_details = []
    for zid in range(25):
        cnt = zone_counts.get(zid, 0)
        att = zone_attempts.get(zid, 0)
        acc = round(cnt / max(att, 1) * 100, 1) if att > 0 else 0
        if cnt > 0:
            zone_details.append({
                "zone_id": zid,
                "label": zone_labels.get(zid, f"Z{zid}"),
                "passes": cnt,
                "attempts": att,
                "accuracy": acc,
                "row": zid // 5,
                "col": zid % 5,
            })
    zone_details.sort(key=lambda z: z["passes"], reverse=True)
    top_zones = zone_details[:5]
    primary_zone_name = top_zones[0]["label"] if top_zones else "N/A"

    # Build-up phase classification
    def_zone_passes = sum(z["passes"] for z in zone_details if z["col"] < 2)
    mid_zone_passes = sum(z["passes"] for z in zone_details if 2 <= z["col"] <= 3)
    att_zone_passes = sum(z["passes"] for z in zone_details if z["col"] >= 4)
    total_zone_passes = def_zone_passes + mid_zone_passes + att_zone_passes or 1
    def_phase_pct = round(def_zone_passes / total_zone_passes * 100, 1)
    mid_phase_pct = round(mid_zone_passes / total_zone_passes * 100, 1)
    att_phase_pct = round(att_zone_passes / total_zone_passes * 100, 1)

    if def_phase_pct > 50:
        primary_phase_label = "defensive third (build-up)"
    elif att_phase_pct > 35:
        primary_phase_label = "attacking third (final third)"
    else:
        primary_phase_label = "middle third (transition)"

    # ---- PERIOD / HALF ANALYSIS ----
    if "minute" in hub_all_passes.columns and "period" in hub_all_passes.columns:
        first_half_passes = hub_all_passes[hub_all_passes["period"] == 1]
        second_half_passes = hub_all_passes[hub_all_passes["period"] == 2]
        fh_total = len(first_half_passes)
        sh_total = len(second_half_passes)
        fh_success = len(first_half_passes[first_half_passes["pass_outcome_name"].isna()])
        sh_success = len(second_half_passes[second_half_passes["pass_outcome_name"].isna()])
        fh_acc = round(fh_success / max(fh_total, 1) * 100, 1)
        sh_acc = round(sh_success / max(sh_total, 1) * 100, 1)
        fh_fwd = 0
        sh_fwd = 0
        for _, p in first_half_passes[first_half_passes["pass_outcome_name"].isna()].iterrows():
            if pd.notna(p.get("location_0")) and pd.notna(p.get("pass_end_location_0")):
                if p["pass_end_location_0"] - p["location_0"] > 5:
                    fh_fwd += 1
        for _, p in second_half_passes[second_half_passes["pass_outcome_name"].isna()].iterrows():
            if pd.notna(p.get("location_0")) and pd.notna(p.get("pass_end_location_0")):
                if p["pass_end_location_0"] - p["location_0"] > 5:
                    sh_fwd += 1
        fh_fwd_pct = round(fh_fwd / max(fh_success, 1) * 100, 1)
        sh_fwd_pct = round(sh_fwd / max(sh_success, 1) * 100, 1)

        # 15-min interval breakdown
        intervals = []
        max_min = int(df["minute"].max()) if not df["minute"].isna().all() else 90
        for start in range(0, max_min + 1, 15):
            end = min(start + 15, max_min + 1)
            seg = hub_all_passes[(hub_all_passes["minute"] >= start) & (hub_all_passes["minute"] < end)]
            seg_success = seg[seg["pass_outcome_name"].isna()]
            seg_attempts = len(seg)
            seg_completed = len(seg_success)
            seg_acc_pct = round(seg_completed / max(seg_attempts, 1) * 100, 1)
            if seg_attempts > 0:
                seg_fwd = 0
                for _, p in seg_success.iterrows():
                    if pd.notna(p.get("location_0")) and pd.notna(p.get("pass_end_location_0")):
                        if p["pass_end_location_0"] - p["location_0"] > 5:
                            seg_fwd += 1
                intervals.append({
                    "label": f"{start}'-{end}'",
                    "passes": seg_attempts,
                    "completed": seg_completed,
                    "accuracy": seg_acc_pct,
                    "forward_pct": round(seg_fwd / max(seg_completed, 1) * 100, 1),
                })
    else:
        fh_total = sh_total = fh_acc = sh_acc = fh_fwd_pct = sh_fwd_pct = 0
        intervals = []

    # ---- xT DEEP DIVE ----
    xt_has_data = "xt_added" in success_hub.columns and not success_hub["xt_added"].isna().all()
    xt_analysis = {}
    if xt_has_data:
        hub_xt_total = float(success_hub["xt_added"].sum())
        hub_xt_per_pass = float(success_hub["xt_added"].mean())
        hub_positive_xt = success_hub[success_hub["xt_added"] > 0]
        hub_negative_xt = success_hub[success_hub["xt_added"] < 0]
        hub_pos_xt_sum = float(hub_positive_xt["xt_added"].sum()) if len(hub_positive_xt) > 0 else 0
        hub_neg_xt_sum = float(hub_negative_xt["xt_added"].sum()) if len(hub_negative_xt) > 0 else 0
        hub_xt_by_phase = {"defensive": 0.0, "middle": 0.0, "attacking": 0.0}
        for _, p in success_hub.iterrows():
            if pd.notna(p.get("xt_added")) and pd.notna(p.get("location_0")):
                if p["location_0"] < 40:
                    hub_xt_by_phase["defensive"] += float(p["xt_added"])
                elif p["location_0"] < 80:
                    hub_xt_by_phase["middle"] += float(p["xt_added"])
                else:
                    hub_xt_by_phase["attacking"] += float(p["xt_added"])
        for k in hub_xt_by_phase:
            hub_xt_by_phase[k] = round(hub_xt_by_phase[k], 4)

        xt_analysis = {
            "total_xt": round(hub_xt_total, 4),
            "xt_per_pass": round(hub_xt_per_pass, 6),
            "positive_xt_passes": len(hub_positive_xt),
            "negative_xt_passes": len(hub_negative_xt),
            "positive_xt_sum": round(hub_pos_xt_sum, 4),
            "negative_xt_sum": round(hub_neg_xt_sum, 4),
            "xt_by_phase": hub_xt_by_phase,
            "has_data": True,
        }
    else:
        xt_analysis = {"has_data": False}

    # ---- LINK-UP ANALYSIS ----
    all_team_passes = df[(df["team_name"] == team_name) & (df["event_type"] == "Pass") & (df["pass_outcome_name"].isna())]
    hub_total_successful = len(success_hub)

    # All connections involving hub (both directions)
    hub_connections = defaultdict(lambda: {"to": 0, "from": 0, "total": 0})
    for r_name, r_count in hub_passes_out.items():
        hub_connections[r_name]["to"] += r_count
        hub_connections[r_name]["total"] += r_count
    for p_name, p_count in hub_receivers_from.items():
        hub_connections[p_name]["from"] += p_count
        hub_connections[p_name]["total"] += p_count

    sorted_connections = sorted(hub_connections.items(), key=lambda x: x[1]["total"], reverse=True)
    top_partners = []
    for partner_name, conn_counts in sorted_connections[:5]:
        p_nick = get_nickname(partner_name)
        top_partners.append({
            "name": partner_name,
            "nickname": p_nick,
            "passes_to": conn_counts["to"],
            "passes_from": conn_counts["from"],
            "total_exchanges": conn_counts["total"],
        })

    # ---- STRENGTHS (enhanced) ----
    strengths = []
    if total_involvement > 0:
        strengths.append({"type": "high_involvement", "value": total_involvement, "message": f"Highest involvement ({total_involvement} touches) - the team's primary passing outlet", "badge": "primary"})
    if betweenness > 0.1:
        strengths.append({"type": "connector", "value": round(betweenness, 3), "message": f"Key connector (betweenness: {betweenness:.3f}) - links different parts of the team", "badge": "connector"})
    if eigenvector > 0.3:
        strengths.append({"type": "core_network", "value": round(eigenvector, 3), "message": f"Well-connected (eigenvector: {eigenvector:.3f}) - at the heart of the passing network", "badge": "core"})
    if (xt_val is not None or xt_val != 0) and xt_val > 0.1:
        strengths.append({"type": "threat_creator", "value": round(xt_val, 3), "message": f"Generates xT ({xt_val:.3f}) from passing - creates genuine attacking threat", "badge": "threat"})
    if forward_pct > 55:
        strengths.append({"type": "forward_thinker", "value": forward_pct, "message": f"Forward-minded: {forward_pct}% of passes go forward", "badge": "progressive"})
    if pressure_acc is not None and pressure_acc > 75 and len(passes_under_pressure) >= 5:
        strengths.append({"type": "press_resistant", "value": pressure_acc, "message": f"Press-resistant: {pressure_acc}% accuracy under pressure", "badge": "resistant"})
    if avg_pass_distance > 20:
        strengths.append({"type": "long_range", "value": avg_pass_distance, "message": f"Long pass range (avg {avg_pass_distance}m) - can switch play and find runners", "badge": "range"})
    if short_pct < 50 and medium_pct + long_pct > 60:
        strengths.append({"type": "varied_passing", "value": round(medium_pct + long_pct, 1), "message": f"Varied passing range: {short_pct}% short, {medium_pct}% medium, {long_pct}% long - hard to predict", "badge": "versatile"})
    if top_partners and top_partners[0]["total_exchanges"] > 15:
        p = top_partners[0]
        strengths.append({"type": "strong_link_up", "value": p["total_exchanges"], "message": f"Strong link-up with {p['nickname']} ({p['total_exchanges']} exchanges) - a potent duo", "badge": "partnership"})
    if passes_received > 10 and passes_made / max(passes_received, 1) > 1.3:
        strengths.append({"type": "distributor", "value": round(passes_made / max(passes_received, 1), 2), "message": f"Distributes more than receives (ratio {passes_made}/{passes_received}) - dictating play", "badge": "playmaker"})

    # ---- WEAKNESSES (enhanced) ----
    weaknesses = []
    if grund_pct > 18:
        weaknesses.append({"type": "over_reliance", "severity": "high" if grund_pct > 25 else "medium", "value": grund_pct, "message": f"Team over-relies on {hub_nickname} (Grund {grund_pct:.0f}%) - single point of failure"})
    if accuracy_drop is not None and accuracy_drop > 10 and len(passes_under_pressure) >= 3:
        weaknesses.append({"type": "pressure_vulnerable", "severity": "high" if accuracy_drop > 25 else "medium", "value": accuracy_drop, "message": f"Accuracy drops {accuracy_drop}pp under pressure ({pressure_acc}% vs {normal_acc}% normally)"})
    if (xt_val is not None) and xt_val < 0:
        weaknesses.append({"type": "negative_xt", "severity": "medium", "value": round(xt_val, 3), "message": f"Negative xT contribution ({xt_val:.3f}) - fails to progress the ball effectively"})
    if forward_pct < 35 and passes_made > 5:
        weaknesses.append({"type": "safe_player", "severity": "low", "value": forward_pct, "message": f"Mostly plays safe ({forward_pct}% forward passes) - can be contained"})
    if degree < 0.3:
        weaknesses.append({"type": "limited_reach", "severity": "low", "value": round(degree, 3), "message": f"Limited passing range (degree: {degree:.3f}) - doesn't connect with many teammates"})
    if passes_received > 0 and passes_made > 0:
        involvement_ratio = round(passes_made / passes_received, 2) if passes_received > 0 else 0
        if involvement_ratio < 0.5 and passes_received > 10:
            weaknesses.append({"type": "low_output", "severity": "low", "value": involvement_ratio, "message": f"Low output ratio ({involvement_ratio}x) - receives more than they distribute"})

    # Half-comparison
    if fh_total > 0 and sh_total > 0:
        activity_change = round(sh_total / max(fh_total, 1), 2)
        if activity_change < 0.7:
            weaknesses.append({"type": "fades_second_half", "severity": "medium", "value": activity_change, "message": f"Activity drops significantly in 2nd half ({sh_total} passes vs {fh_total} in 1st) - possible fatigue or tactical adjustment"})
        elif activity_change > 1.4:
            weaknesses.append({"type": "grows_into_game", "severity": "low", "value": activity_change, "message": f"Becomes more active in 2nd half ({sh_total} vs {fh_total} passes) - may start slow"})

    if fh_acc > 0 and sh_acc > 0 and sh_acc < fh_acc - 8:
        weaknesses.append({"type": "accuracy_decline", "severity": "medium", "value": round(fh_acc - sh_acc, 1), "message": f"Passing accuracy drops from {fh_acc}% (1st half) to {sh_acc}% (2nd half) - {round(fh_acc - sh_acc, 1)}pp decline"})

    if xt_analysis.get("has_data") and xt_analysis["negative_xt_passes"] > xt_analysis["positive_xt_passes"]:
        weaknesses.append({"type": "negative_xt_ratio", "severity": "medium", "value": xt_analysis["negative_xt_passes"], "message": f"More negative-xT passes ({xt_analysis['negative_xt_passes']}) than positive ({xt_analysis['positive_xt_passes']}) - often passes backwards or sideways"})

    # ---- MITIGATION STRATEGIES (enhanced) ----
    mitigation = []
    if grund_pct > 18:
        mitigation.append({"title": "Man-mark the hub", "text": f"{hub_nickname} handles {grund_pct:.0f}% of {team_name}'s passing involvement. Assign a dedicated midfielder to shadow them and deny space.", "type": "man_marking", "severity": "high" if grund_pct > 25 else "medium"})
    if accuracy_drop is not None and accuracy_drop > 10:
        mitigation.append({"title": "Trigger press on the hub", "text": f"{hub_nickname}'s accuracy drops {accuracy_drop}pp when pressed. Sprint pressure whenever they receive the ball in build-up.", "type": "pressing", "severity": "high" if accuracy_drop > 25 else "medium"})
    if forward_pct > 55:
        mitigation.append({"title": "Block forward passing lanes", "text": f"{hub_nickname} plays forward {forward_pct}% of the time. Position defenders to cut off forward receivers, forcing sideways/backward passes.", "type": "positional", "severity": "medium"})
    if (xt_val is not None) and xt_val > 0.3:
        mitigation.append({"title": "Double-team in dangerous zones", "text": f"{hub_nickname} generates {xt_val:.3f} xT from passing. Assign a second defender near them when play enters the final third.", "type": "double_team", "severity": "high" if xt_val > 0.5 else "medium"})
    if top_partners and top_partners[0]["total_exchanges"] >= 5:
        p = top_partners[0]
        mitigation.append({"title": "Disrupt key partnership", "text": f"{hub_nickname}'s top link is {p['nickname']} ({p['total_exchanges']} exchanges). Intercept the lane between them and assign a presser to the receiver.", "type": "interception", "severity": "medium"})
    if top_zones:
        z = top_zones[0]
        mitigation.append({"title": "Squeeze space in primary zone", "text": f"{hub_nickname} operates most in zone {z['label']} ({z['passes']} passes). Compact the team's shape in that area to limit their influence.", "type": "positional", "severity": "medium"})
    if passes_under_pressure is not None and len(passes_under_pressure) < 3 and len(hub_all_passes) > 5:
        mitigation.append({"title": "Test their composure", "text": f"{hub_nickname} has faced limited pressure ({len(hub_all_passes)} passes, {len(passes_under_pressure)} under pressure). Apply pressure early to see how they cope.", "type": "psychological", "severity": "low"})
    if def_phase_pct > 40:
        mitigation.append({"title": "Cut supply in build-up", "text": f"{hub_nickname} is heavily involved in build-up ({def_phase_pct}% of passes from defensive half). Press them early to disrupt the team's first phase.", "type": "pressing", "severity": "high" if def_phase_pct > 55 else "medium"})
    if att_phase_pct > 30:
        mitigation.append({"title": "Pack the final third", "text": f"{hub_nickname} gets {att_phase_pct}% of their passes in the attacking third. Drop defensive line deeper to deny space behind.", "type": "positional", "severity": "high"})

    hub_dominance = "high" if grund_pct > 20 else ("medium" if grund_pct > 12 else "low")

    # ---- LONG-FORM TACTICAL REPORT ----
    # a) Executive Summary
    exec_summary = (
        f"{hub_nickname} is the passing hub for {team_name}, operating primarily as a {position} "
        f"at x={avg_x:.0f}, y={avg_y:.0f} on the pitch. With {total_involvement} total passing "
        f"involvements ({passes_made} made, {passes_received} received), they are the team's most "
        f"active passer. The Thomas Grund centralisation index of {grund_pct:.0f}% classifies the "
        f"team's style as {grund_style.lower() if grund_style else 'neutral'}."
    )
    if hub_dominance == "high":
        exec_summary += (
            f" This indicates a heavy reliance on {hub_nickname} for ball circulation, making them "
            f"a critical tactical target. The opposition should prioritise limiting their involvement "
            f"to disrupt {team_name}'s passing rhythm."
        )
    elif hub_dominance == "medium":
        exec_summary += (
            f" There is moderate reliance on the hub, suggesting {team_name} has alternative "
            f"passing options but still funnels significant play through {hub_nickname}."
        )
    else:
        exec_summary += (
            f" The passing is well-distributed across the team, meaning isolating one player "
            f"may not suffice. The opposition must disrupt team-wide patterns rather than focus "
            f"solely on {hub_nickname}."
        )

    # b) Role Analysis
    role_parts = [f"{hub_nickname} plays as a {position} with an average position of x={avg_x:.0f}, y={avg_y:.0f}."]
    role_parts.append(f"They are primarily active in the {primary_phase_label} ({def_phase_pct}% defensive, {mid_phase_pct}% middle, {att_phase_pct}% attacking third distribution).")
    if forward_pct > 55:
        role_parts.append(f"Their passing is notably forward-oriented ({forward_pct}% forward passes), indicating a progressive mindset that drives the team up the pitch.")
    elif forward_pct < 35:
        role_parts.append(f"Their passing is predominantly safe and backward ({backward_pct}% backward, {lateral_pct}% lateral), suggesting a more conservative role focused on ball retention.")
    else:
        role_parts.append(f"Their passing shows a balanced mix of forward ({forward_pct}%), sideways ({lateral_pct}%), and backward ({backward_pct}%) distribution.")

    if betweenness > 0.1:
        role_parts.append(f"With a betweenness centrality of {betweenness:.3f}, they serve as a crucial bridge between different sections of the team, linking defence to attack and vice versa.")
    if eigenvector > 0.3:
        role_parts.append(f"Their eigenvector centrality of {eigenvector:.3f} confirms they are connected to the most influential players in the network - a sign of being at the core of the team's structure.")
    if clustering > 0.4:
        role_parts.append(f"A clustering coefficient of {clustering:.3f} suggests they are part of tight passing triangles, indicating good positional understanding with nearby teammates.")
    else:
        role_parts.append(f"A clustering coefficient of {clustering:.3f} suggests a more expansive role, connecting with players across different areas of the pitch rather than tight local triangles.")

    role_analysis = " ".join(role_parts)

    # c) Spatial Influence
    spatial_parts = [f"{hub_nickname}'s passing is concentrated in specific zones of the pitch."]
    if top_zones:
        zone_strs = [f"{z['label']} ({z['passes']} passes, {z['accuracy']}% accuracy)" for z in top_zones[:3]]
        spatial_parts.append(f"The top zones are: {', '.join(zone_strs)}.")
    spatial_parts.append(f"The average pass distance is {avg_pass_distance}m, with {short_pct}% short (<15m), {medium_pct}% medium (15-30m), and {long_pct}% long (>30m) passes.")
    if long_pct > 25:
        spatial_parts.append(f"The high proportion of long passes ({long_pct}%) suggests they can switch play and find runners in behind - the defence must stay deep and compact.")
    elif short_pct > 60:
        spatial_parts.append(f"The predominance of short passes ({short_pct}%) indicates a possession-preserving role - pressing triggers should focus on receivers, not the passer.")
    spatial_influence = " ".join(spatial_parts)

    # d) Temporal Pattern
    temporal_parts = []
    if fh_total > 0 and sh_total > 0:
        temporal_parts.append(f"In the first half, {hub_nickname} attempted {fh_total} passes ({fh_acc}% accuracy, {fh_fwd_pct}% forward).")
        temporal_parts.append(f"In the second half, they attempted {sh_total} passes ({sh_acc}% accuracy, {sh_fwd_pct}% forward).")
        if abs(fh_total - sh_total) / max(fh_total, 1) > 0.3:
            if sh_total > fh_total:
                temporal_parts.append(f"Their activity increased significantly in the second half (+{round(sh_total - fh_total)} passes), suggesting they grew into the game or the team adjusted to get them more involved.")
            else:
                temporal_parts.append(f"Their activity dropped markedly in the second half ({round(fh_total - sh_total)} fewer passes), possibly due to tactical adjustments, fatigue, or opposition pressing.")
        if intervals:
            interval_labels = [i["label"] for i in intervals[:4]]
            interval_counts = [str(i["passes"]) for i in intervals[:4]]
            temporal_parts.append(f"15-min interval activity: {', '.join(f'{lbl}: {cnt} passes' for lbl, cnt in zip(interval_labels, interval_counts))}.")
    temporal_pattern = " ".join(temporal_parts)

    # e) Opposition Exploitation Guide
    exploit_parts = [f"To neutralise {hub_nickname}'s influence, the opposition should:"]
    if grund_pct > 18:
        exploit_parts.append(f"- Assign a dedicated marker to shadow {hub_nickname} across the pitch, denying them time and space on the ball.")
    if accuracy_drop is not None and accuracy_drop > 10:
        exploit_parts.append(f"- Trigger a sprint press every time {hub_nickname} receives the ball in the {primary_phase_label}. Their accuracy drops {accuracy_drop}pp under pressure.")
    if forward_pct > 55:
        exploit_parts.append(f"- Cut off forward passing lanes by positioning defenders between {hub_nickname} and their preferred receivers.")
    if top_zones:
        z = top_zones[0]
        exploit_parts.append(f"- Concentrate defensive shape in zone {z['label']} where {hub_nickname} is most active ({z['passes']} passes).")
    if top_partners:
        p = top_partners[0]
        exploit_parts.append(f"- Disrupt the {hub_nickname}-{p['nickname']} connection ({p['total_exchanges']} exchanges) by placing a defender near {p['nickname']} when {hub_nickname} is on the ball.")
    if short_pct > 60:
        exploit_parts.append(f"- Cut off short passing options by compacting the defensive block, forcing {hub_nickname} into riskier long passes.")
    if def_phase_pct > 40:
        exploit_parts.append(f"- Press {hub_nickname} early in the build-up phase to force rushed decisions and disrupt {team_name}'s first phase of play.")
    if hub_dominance == "low":
        exploit_parts.append(f"- Since {team_name} distributes passes evenly, use a zonal pressing approach rather than man-marking to disrupt their collective passing patterns.")
    if fh_total > 0 and sh_total > 0 and sh_total < fh_total * 0.7:
        exploit_parts.append(f"- Apply intense pressing early in the match to exploit {hub_nickname}'s tendency to fade in the second half ({sh_total} vs {fh_total} passes).")
    exploitation_guide = "\n".join(exploit_parts)

    # f) Key Battles
    battle_parts = [f"Key individual battles to watch:"]
    if top_partners:
        for p in top_partners[:2]:
            battle_parts.append(f"- {hub_nickname} vs {p['nickname']}: {p['total_exchanges']} pass exchanges between them. The player marking {p['nickname']} must be alert to intercept {hub_nickname}'s service.")
    if top_sources:
        s = top_sources[0]
        s_nick = get_nickname(s[0])
        battle_parts.append(f"- {s_nick} → {hub_nickname}: {s[1]} passes feed into the hub. Closing down {s_nick} can starve {hub_nickname} of supply.")
    if top_recipients:
        r = top_recipients[0]
        r_nick = get_nickname(r[0])
        battle_parts.append(f"- {hub_nickname} → {r_nick}: {r[1]} direct passes. Cut this lane to reduce the hub's effectiveness.")
    key_battles = " ".join(battle_parts)

    # Narrative (enhanced)
    narrative_parts = []
    narrative_parts.append(f"{hub_nickname} is {team_name}'s hub player with {total_involvement} total involvements (position: {position}, avg position: x={avg_x:.0f}, y={avg_y:.0f}).")
    narrative_parts.append(f"The team's Grund centralisation is {grund_pct:.0f}% ({grund_style.lower() if grund_style else 'neutral'}).")
    if hub_dominance == "high":
        narrative_parts.append("They are heavily relied upon, making them a key tactical target for the opposition.")
    elif hub_dominance == "medium":
        narrative_parts.append("They are moderately relied upon and should be monitored.")
    else:
        narrative_parts.append("The team distributes play evenly, making it harder to target a single player.")
    narrative_parts.append(f"Passing direction: {forward_pct}% forward, {backward_pct}% backward, {lateral_pct}% lateral. Avg pass distance: {avg_pass_distance}m.")
    if pressure_acc is not None:
        narrative_parts.append(f"Under pressure: {pressure_acc}% accuracy vs {normal_acc}% normally ({accuracy_drop}pp drop).")
    if xt_analysis.get("has_data"):
        narrative_parts.append(f"xT contribution: {xt_analysis['total_xt']:.4f} total ({xt_analysis['positive_xt_passes']} positive, {xt_analysis['negative_xt_passes']} negative passes).")
    if top_zones:
        narrative_parts.append(f"Most active zone: {top_zones[0]['label']} ({top_zones[0]['passes']} passes at {top_zones[0]['accuracy']}% accuracy).")

    return {
        "hub_player": {
            "name": hub_name,
            "nickname": hub_nickname,
            "position": position,
            "avg_x": round(float(avg_x), 1),
            "avg_y": round(float(avg_y), 1),
            "metrics": {
                "total_involvement": total_involvement,
                "passes_made": passes_made,
                "passes_received": passes_received,
                "degree_centrality": round(degree, 3),
                "betweenness_centrality": round(betweenness, 3),
                "eigenvector_centrality": round(eigenvector, 3),
                "clustering_coefficient": round(clustering, 3),
                "xt_generated": round(xt_val, 4) if xt_val is not None else None,
                "forward_pass_pct": forward_pct,
            },
            "pressure_stats": {
                "normal_accuracy": normal_acc,
                "pressure_accuracy": pressure_acc,
                "accuracy_drop": accuracy_drop,
                "passes_under_pressure": len(passes_under_pressure),
            },
            "top_connections": {
                "recipients": [{"name": r[0], "nickname": get_nickname(r[0]), "passes": r[1]} for r in top_recipients],
                "sources": [{"name": s[0], "nickname": get_nickname(s[0]), "passes": s[1]} for s in top_sources],
            },
            # NEW detailed fields
            "pass_direction_breakdown": {
                "forward_pct": forward_pct,
                "backward_pct": backward_pct,
                "lateral_pct": lateral_pct,
                "forward_count": forward_count,
                "backward_count": backward_count,
                "lateral_count": lateral_count,
            },
            "pass_distance_breakdown": {
                "avg_distance": avg_pass_distance,
                "short_pct": short_pct,
                "medium_pct": medium_pct,
                "long_pct": long_pct,
                "short_count": short_passes,
                "medium_count": medium_passes,
                "long_count": long_passes,
            },
            "zone_breakdown": {
                "top_zones": top_zones,
                "defensive_third_pct": def_phase_pct,
                "middle_third_pct": mid_phase_pct,
                "attacking_third_pct": att_phase_pct,
                "primary_phase": primary_phase_label,
            },
        },
        "team_context": {
            "grund_centralisation": grund_pct,
            "style": grund_style,
            "hub_dominance": hub_dominance,
        },
        "strengths": strengths,
        "weaknesses": weaknesses,
        "mitigation_strategies": mitigation,
        "narrative": " ".join(narrative_parts),
        # NEW SECTIONS
        "detailed_passing_analysis": {
            "direction_breakdown": {
                "forward_pct": forward_pct,
                "backward_pct": backward_pct,
                "lateral_pct": lateral_pct,
            },
            "distance_analysis": {
                "avg_distance": avg_pass_distance,
                "short_pct": short_pct,
                "medium_pct": medium_pct,
                "long_pct": long_pct,
            },
            "zone_concentration": {
                "top_zones": top_zones,
                "defensive_third_pct": def_phase_pct,
                "middle_third_pct": mid_phase_pct,
                "attacking_third_pct": att_phase_pct,
            },
            "accuracy_breakdown": {
                "overall": normal_acc,
                "under_pressure": pressure_acc,
                "accuracy_drop": accuracy_drop,
                "normal_passes": len(normal_passes),
                "pressure_passes": len(passes_under_pressure),
            },
            "build_up_phase": primary_phase_label,
        },
        "period_breakdown": {
            "first_half": {"passes": fh_total, "accuracy": fh_acc, "forward_pct": fh_fwd_pct} if fh_total > 0 else None,
            "second_half": {"passes": sh_total, "accuracy": sh_acc, "forward_pct": sh_fwd_pct} if sh_total > 0 else None,
            "intervals": intervals,
            "has_data": fh_total > 0,
        },
        "link_up_analysis": {
            "top_partners": top_partners,
            "total_connections": len(hub_connections),
        },
        "xt_deep_dive": xt_analysis,
        "tactical_report": {
            "executive_summary": exec_summary,
            "role_analysis": role_analysis,
            "spatial_influence": spatial_influence,
            "temporal_pattern": temporal_pattern,
            "exploitation_guide": exploitation_guide,
            "key_battles": key_battles,
        },
    }
